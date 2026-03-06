/**
 * Crypto news fetcher — multi-source with automatic fallback
 *
 * Priority chain:
 *   1. RSS feeds (CoinTelegraph + Decrypt) — free, no auth, no Cloudflare
 *   2. CryptoCompare News API — free with key, rate-limited without
 *   3. CryptoPanic API — requires API key, often blocked by Cloudflare
 */

/* ------------------------------------------------------------------ */
/*  Unified news item type (used by classifier + discover route)       */
/* ------------------------------------------------------------------ */

export interface CryptoNewsPost {
  title: string;
  published_at: string; // ISO date string
  url: string; // Direct link to original article
  source: string; // Source name (e.g. "CoinTelegraph")
  categories: string; // e.g. "BTC|ETH|CRYPTOCURRENCY"
  tags: string; // e.g. "Bitcoin|BTC"
}

/* ------------------------------------------------------------------ */
/*  Shared cache + fetch helper                                        */
/* ------------------------------------------------------------------ */

let newsCache: { data: CryptoNewsPost[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithTimeout(
  url: string,
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/*  RSS feed parser (CoinTelegraph + Decrypt)                          */
/* ------------------------------------------------------------------ */

const RSS_FEEDS = [
  { url: "https://cointelegraph.com/rss", source: "CoinTelegraph" },
  { url: "https://decrypt.co/feed", source: "Decrypt" },
];

// Crypto keywords for tagging articles
const CRYPTO_KEYWORDS: Record<string, string[]> = {
  BTC: ["bitcoin", "btc", "satoshi", "halving", "mining", "miner"],
  ETH: ["ethereum", "eth", "vitalik", "layer 2", "l2", "defi", "erc-20", "erc20"],
  CRYPTO: ["crypto", "blockchain", "web3", "token", "nft", "stablecoin", "exchange", "sec", "regulation"],
};

function detectCategories(text: string): { categories: string; tags: string } {
  const lower = text.toLowerCase();
  const cats: string[] = [];
  const tags: string[] = [];

  if (CRYPTO_KEYWORDS.BTC.some((k) => lower.includes(k))) {
    cats.push("BTC");
    tags.push("Bitcoin");
  }
  if (CRYPTO_KEYWORDS.ETH.some((k) => lower.includes(k))) {
    cats.push("ETH");
    tags.push("Ethereum");
  }
  if (cats.length === 0 && CRYPTO_KEYWORDS.CRYPTO.some((k) => lower.includes(k))) {
    cats.push("CRYPTOCURRENCY");
    tags.push("Crypto");
  }
  // If nothing matched, still mark as crypto (these feeds are crypto-focused)
  if (cats.length === 0) {
    cats.push("CRYPTOCURRENCY");
    tags.push("Crypto");
  }

  return { categories: cats.join("|"), tags: tags.join("|") };
}

/** Extract text between XML tags (simple, no dependency needed) */
function extractTag(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataPattern = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle plain text content
  const plainPattern = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
    "i"
  );
  const plainMatch = xml.match(plainPattern);
  if (plainMatch) return plainMatch[1].trim();

  return "";
}

async function fetchRssFeeds(): Promise<CryptoNewsPost[]> {
  const allArticles: CryptoNewsPost[] = [];

  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetchWithTimeout(feed.url, 15000);
      if (!res.ok) {
        console.warn(`RSS ${feed.source}: HTTP ${res.status}`);
        return [];
      }

      const xml = await res.text();

      // Split into <item> blocks
      const items = xml.split(/<item>/i).slice(1); // skip header before first item

      const articles: CryptoNewsPost[] = [];
      for (const itemXml of items) {
        const title = extractTag(itemXml, "title")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&#39;/g, "'");

        if (!title) continue;

        // Extract link (handle CDATA)
        let url = extractTag(itemXml, "link");
        // Some feeds have the link as plain text after <link> with no closing tag
        if (!url) {
          const linkMatch = itemXml.match(/<link>([^<]+)/i);
          if (linkMatch) url = linkMatch[1].trim();
        }
        // Clean tracking params from CoinTelegraph
        if (url.includes("utm_")) {
          url = url.split("?")[0];
        }

        const pubDate = extractTag(itemXml, "pubDate");
        const published_at = pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString();

        const { categories, tags } = detectCategories(title);

        articles.push({
          title,
          published_at,
          url: url || `https://${feed.source.toLowerCase().replace(/\s/g, "")}.com`,
          source: feed.source,
          categories,
          tags,
        });
      }

      return articles;
    } catch (err) {
      console.warn(`RSS ${feed.source} failed:`, err);
      return [];
    }
  });

  const results = await Promise.all(feedPromises);
  for (const articles of results) {
    allArticles.push(...articles);
  }

  // Sort by date descending (newest first)
  allArticles.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return allArticles;
}

/* ------------------------------------------------------------------ */
/*  CryptoCompare News API (secondary)                                 */
/* ------------------------------------------------------------------ */

interface CryptoCompareArticle {
  title: string;
  published_on: number; // Unix timestamp (seconds)
  url: string;
  source_info: { name: string };
  categories: string; // "BTC|ETH|CRYPTOCURRENCY"
  tags: string; // "Bitcoin|BTC"
  body: string;
}

async function fetchCryptoCompare(
  categories: string
): Promise<CryptoNewsPost[]> {
  const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
  const keyParam = apiKey ? `&api_key=${apiKey}` : "";
  const url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${categories}&sortOrder=popular${keyParam}`;

  const res = await fetchWithTimeout(url, 30000);
  if (!res.ok) {
    throw new Error(`CryptoCompare API responded with ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.Data) || data.Data.length === 0) {
    throw new Error(`CryptoCompare: no data array (Type=${data?.Type})`);
  }
  const articles: CryptoCompareArticle[] = data.Data;

  return articles.map((article) => ({
    title: article.title,
    published_at: new Date(article.published_on * 1000).toISOString(),
    url: article.url,
    source: article.source_info.name,
    categories: article.categories,
    tags: article.tags,
  }));
}

/* ------------------------------------------------------------------ */
/*  CryptoPanic API (tertiary fallback)                                */
/* ------------------------------------------------------------------ */

interface CryptoPanicPost {
  title: string;
  published_at: string;
  url: string;
  source: { title: string; domain: string };
  currencies: { code: string; title: string }[];
  votes: { important: number; liked: number; toxic: number };
}

interface CryptoPanicResponse {
  results: CryptoPanicPost[];
}

async function fetchCryptoPanic(
  currencies: string,
  daysBack: number
): Promise<CryptoNewsPost[]> {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;
  if (!apiKey) return [];

  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const afterStr = afterDate.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    auth_token: apiKey,
    currencies,
    filter: "important",
    kind: "news",
    regions: "en",
    public: "true",
    after: afterStr,
  });

  const url = `https://cryptopanic.com/api/v1/posts/?${params.toString()}`;
  const res = await fetchWithTimeout(url, 10000);

  if (!res.ok) {
    console.warn(`CryptoPanic responded with ${res.status}, skipping`);
    return [];
  }

  // Check if response is JSON (Cloudflare may return HTML)
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    console.warn("CryptoPanic returned non-JSON (likely Cloudflare), skipping");
    return [];
  }

  const data: CryptoPanicResponse = await res.json();
  return (data.results ?? []).map((post) => ({
    title: post.title,
    published_at: post.published_at,
    url: post.url,
    source: post.source.title,
    categories: post.currencies.map((c) => c.code).join("|"),
    tags: post.currencies.map((c) => c.title).join("|"),
  }));
}

/* ------------------------------------------------------------------ */
/*  Main export: fetch news with automatic fallback chain              */
/* ------------------------------------------------------------------ */

export interface FetchNewsOptions {
  currencies?: string; // default "BTC,ETH"
  daysBack?: number; // default 30 (only used by CryptoPanic fallback)
}

export async function fetchRecentNews(
  options?: FetchNewsOptions
): Promise<CryptoNewsPost[]> {
  // Return cached results if fresh (shared across all sources)
  if (newsCache && Date.now() - newsCache.timestamp < CACHE_TTL) {
    console.log(`Using cached news results (${newsCache.data.length} articles)`);
    return newsCache.data;
  }

  const currencies = options?.currencies ?? "BTC,ETH";
  const daysBack = options?.daysBack ?? 30;

  // 1. Primary: RSS feeds (CoinTelegraph + Decrypt) — always free, no auth
  try {
    const articles = await fetchRssFeeds();
    if (articles.length > 0) {
      console.log(`RSS feeds returned ${articles.length} articles`);
      newsCache = { data: articles, timestamp: Date.now() };
      return articles;
    }
  } catch (err) {
    console.warn("RSS feeds failed, trying CryptoCompare:", err);
  }

  // 2. Secondary: CryptoCompare (free with key, rate-limited without)
  try {
    const articles = await fetchCryptoCompare(currencies);
    if (articles.length > 0) {
      console.log(`CryptoCompare returned ${articles.length} articles`);
      newsCache = { data: articles, timestamp: Date.now() };
      return articles;
    }
  } catch (err) {
    console.warn("CryptoCompare failed, trying CryptoPanic:", err);
  }

  // 3. Tertiary: CryptoPanic (may be blocked by Cloudflare)
  try {
    const articles = await fetchCryptoPanic(currencies, daysBack);
    if (articles.length > 0) {
      console.log(`CryptoPanic returned ${articles.length} articles`);
      newsCache = { data: articles, timestamp: Date.now() };
      return articles;
    }
  } catch (err) {
    console.warn("CryptoPanic also failed:", err);
  }

  return [];
}
