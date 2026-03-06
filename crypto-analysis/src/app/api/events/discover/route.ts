/**
 * POST /api/events/discover
 *
 * Fetches recent crypto news (CryptoCompare → CryptoPanic fallback),
 * classifies them via Qwen LLM, and returns candidate CryptoEvent objects.
 *
 * Body (optional): { "daysBack": 30, "minSignificance": 7 }
 * Returns: { discovered: CryptoEvent[], stats: { fetched, classified, filtered } }
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CryptoEvent } from "@/types/market";
import { fetchRecentNews } from "@/lib/api/cryptopanic";
import { classifyNews } from "@/lib/api/qwen-classifier";
import type { NewsItem } from "@/lib/api/qwen-classifier";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readExistingEvents(): CryptoEvent[] {
  try {
    const filePath = path.join(process.cwd(), "public/data/events.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function fetchCurrentPrice(coin: "BTC" | "ETH"): Promise<number | null> {
  try {
    const id = coin === "BTC" ? "bitcoin" : "ethereum";
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[id]?.usd ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  // Parse optional body
  let daysBack = 30;
  let minSignificance = 7;

  try {
    const body = await request.json();
    if (body.daysBack && typeof body.daysBack === "number") {
      daysBack = Math.min(90, Math.max(1, body.daysBack));
    }
    if (body.minSignificance && typeof body.minSignificance === "number") {
      minSignificance = Math.min(10, Math.max(1, body.minSignificance));
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  // DASHSCOPE_API_KEY is required for LLM classification
  if (!process.env.DASHSCOPE_API_KEY) {
    return NextResponse.json(
      {
        error:
          "DASHSCOPE_API_KEY not configured. Add it to .env.local",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch news (CryptoCompare primary, CryptoPanic fallback)
    const posts = await fetchRecentNews({ daysBack });

    if (posts.length === 0) {
      return NextResponse.json({
        discovered: [],
        stats: { fetched: 0, classified: 0, filtered: 0 },
        message: "No news found from any source",
      });
    }

    // 2. Load existing events to de-duplicate
    const existingEvents = readExistingEvents();
    const existingDates = new Set(existingEvents.map((e) => e.date));

    // 3. Prepare news items for classification
    //    Pre-dedup: if multiple sources report the same story, keep only the first
    const seenTitles = new Set<string>();
    const uniquePosts = posts.filter((post) => {
      // Extract significant words (>3 chars) from title for fuzzy matching
      const words = post.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .sort();
      const fingerprint = words.join(" ");
      // Check if we've seen a similar title (sharing ≥60% of significant words)
      for (const seen of seenTitles) {
        const seenWords = seen.split(" ");
        const common = words.filter((w) => seenWords.includes(w)).length;
        const similarity = common / Math.max(words.length, seenWords.length);
        if (similarity >= 0.6) return false; // Skip duplicate story
      }
      seenTitles.add(fingerprint);
      return true;
    });

    const newsItems: NewsItem[] = uniquePosts.map((post) => ({
      title: post.title,
      published_at: post.published_at,
      source: post.source,
      url: post.url,
    }));

    // 4. Classify via Qwen LLM (falls back to heuristic on failure)
    const classified = await classifyNews(newsItems);

    // 5. Filter: significance threshold + de-duplicate by month
    //    Only use significance >= minSignificance (shouldInclude is advisory)
    const significant = classified.filter(
      (ev) =>
        ev.significance >= minSignificance &&
        !existingDates.has(ev.date)
    );

    // Sort by significance descending
    significant.sort((a, b) => b.significance - a.significance);

    // 5b. De-duplicate similar events (same story from different sources)
    //     Uses character bigrams for CJK text + Latin words for fuzzy matching.
    //     Two events are duplicates if they share enough key terms.
    interface DescFingerprint {
      latin: Set<string>; // Entity names (Kraken, Coinbase, etc.)
      cjkBigrams: Set<string>; // Chinese character bigrams
    }

    function extractFingerprint(desc: string): DescFingerprint {
      const latin = new Set<string>();
      const latinWords = desc.match(/[A-Za-z]{3,}/g) ?? [];
      for (const w of latinWords) latin.add(w.toLowerCase());

      const cjkBigrams = new Set<string>();
      const cjk = desc.replace(/[^\u4e00-\u9fff]/g, "");
      for (let i = 0; i < cjk.length - 1; i++) {
        cjkBigrams.add(cjk.slice(i, i + 2));
      }
      return { latin, cjkBigrams };
    }

    function isSimilar(a: DescFingerprint, b: DescFingerprint): boolean {
      // Check Latin entity overlap (company/protocol names)
      let latinOverlap = 0;
      for (const w of a.latin) {
        if (b.latin.has(w)) latinOverlap++;
      }
      // Check CJK bigram overlap
      let cjkOverlap = 0;
      for (const bg of a.cjkBigrams) {
        if (b.cjkBigrams.has(bg)) cjkOverlap++;
      }
      // Rule 1: Same entity name + any shared CJK context → duplicate
      if (latinOverlap >= 1 && cjkOverlap >= 1) return true;
      // Rule 2: High overall CJK similarity → duplicate
      const minCjk = Math.min(a.cjkBigrams.size, b.cjkBigrams.size);
      if (minCjk > 0 && cjkOverlap / minCjk >= 0.5) return true;
      return false;
    }

    const seenEvents: { fp: DescFingerprint; coin: string }[] = [];
    const deduped = significant.filter((ev) => {
      const fp = extractFingerprint(ev.description);
      for (const seen of seenEvents) {
        // Only dedup events about the same coin
        if (seen.coin === ev.coin && isSimilar(fp, seen.fp)) return false;
      }
      seenEvents.push({ fp, coin: ev.coin });
      return true;
    });

    const topEvents = deduped.slice(0, 10);

    // 6. Fetch current prices for price tags
    const [btcPrice, ethPrice] = await Promise.all([
      fetchCurrentPrice("BTC"),
      fetchCurrentPrice("ETH"),
    ]);

    // 7. Convert to CryptoEvent format
    const discovered: CryptoEvent[] = topEvents.map((ev) => {
      const price =
        ev.coin === "BTC" ? btcPrice : ethPrice;
      const priceValue = price ?? 0;
      const priceFormatted =
        priceValue >= 1000
          ? `$${Math.round(priceValue).toLocaleString()}`
          : `$${priceValue}`;

      return {
        date: ev.date,
        displayDate: ev.date.replace("-", "."),
        type: ev.type,
        description: ev.description,
        priceTag: `${ev.coin} ${priceFormatted}`,
        coin: ev.coin,
        priceAtEvent: priceValue,
        sourceUrl: ev.sourceUrl,
        source: ev.sourceName,
      };
    });

    // Debug: top significance scores
    const topScores = classified
      .map((e) => ({ sig: e.significance, desc: e.description }))
      .sort((a, b) => b.sig - a.sig)
      .slice(0, 5);

    return NextResponse.json({
      discovered,
      stats: {
        fetched: posts.length,
        uniqueAfterDedup: uniquePosts.length,
        classified: classified.length,
        aboveThreshold: deduped.length,
        returned: discovered.length,
        topScores,
      },
    });
  } catch (err) {
    console.error("Event discovery failed:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Event discovery failed: ${message}` },
      { status: 500 }
    );
  }
}
