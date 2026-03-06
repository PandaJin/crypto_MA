/**
 * Qwen LLM event classifier via DashScope (OpenAI-compatible API)
 * Analyzes news articles and classifies them as crypto market events.
 */

import OpenAI from "openai";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NewsItem {
  title: string;
  published_at: string;
  source: string;
  url: string;
  votes_important?: number;
}

export interface ClassifiedEvent {
  significance: number; // 1-10
  type: "bull" | "bear" | "neutral";
  description: string; // Chinese summary, <=25 chars
  coin: "BTC" | "ETH";
  shouldInclude: boolean;
  sourceUrl: string;
  sourceName: string;
  date: string; // YYYY-MM
  priceAtEvent: number | null;
}

/* ------------------------------------------------------------------ */
/*  Zod schema for LLM response validation                            */
/* ------------------------------------------------------------------ */

const classifiedItemSchema = z.object({
  index: z.number(),
  significance: z.number().min(1).max(10),
  type: z.enum(["bull", "bear", "neutral"]),
  description: z.string(),
  // Qwen may return other coins (XRP, SOL, etc.) for general crypto news.
  // Normalize any non-ETH value to "BTC" (our default/general crypto indicator).
  coin: z.string().transform((v): "BTC" | "ETH" => (v === "ETH" ? "ETH" : "BTC")),
  shouldInclude: z.boolean(),
});

const llmResponseSchema = z.object({
  events: z.array(classifiedItemSchema),
});

/* ------------------------------------------------------------------ */
/*  System prompt                                                      */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are a senior crypto market analyst. Your task is to evaluate news articles and determine if they represent significant market events worth tracking on a historical timeline.

Evaluation criteria:
- significance (1-10): How impactful is this event for BTC/ETH price and the crypto market?
  - 9-10: Historic milestones (ETF approvals, major crashes, halvings)
  - 7-8: Important regulatory/adoption events, major exchange events
  - 5-6: Notable but not groundbreaking news
  - 1-4: Routine market news
- type: "bull" (positive price impact), "bear" (negative), "neutral"
- description: Concise Chinese summary, <=25 characters, matching this style:
  - "SEC批准11只BTC现货ETF"
  - "BTC突破$100K"
  - "FTX崩盘破产"
  - "中国全面禁矿"
- coin: Primary affected cryptocurrency ("BTC" or "ETH")
- shouldInclude: true only if significance >= 7

Respond with JSON: { "events": [{ "index": 0, "significance": 8, "type": "bull", "description": "...", "coin": "BTC", "shouldInclude": true }, ...] }

Important: Return ALL items from the input list with your assessment, even if shouldInclude is false.`;

/* ------------------------------------------------------------------ */
/*  Main classification function                                       */
/* ------------------------------------------------------------------ */

export async function classifyNews(
  newsItems: NewsItem[]
): Promise<ClassifiedEvent[]> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DASHSCOPE_API_KEY is not configured. Add it to .env.local"
    );
  }

  if (newsItems.length === 0) return [];

  // Support both China and International DashScope endpoints
  const baseURL =
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1"; // China (default)
  // International: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

  const client = new OpenAI({ apiKey, baseURL });

  // Prepare news list for the prompt
  const newsForPrompt = newsItems.map((item, i) => ({
    index: i,
    title: item.title,
    date: item.published_at.slice(0, 10),
    source: item.source,
  }));

  try {
    const completion = await client.chat.completions.create({
      model: "qwen-plus",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze these ${newsItems.length} news articles:\n\n${JSON.stringify(newsForPrompt, null, 2)}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("Qwen returned empty response, falling back to heuristic");
      return heuristicClassify(newsItems);
    }

    // Parse and validate
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Qwen returned invalid JSON, falling back to heuristic");
      return heuristicClassify(newsItems);
    }

    // Try to extract events array - Qwen might return it in different structures
    let eventsArray: unknown;
    const parsedObj = parsed as Record<string, unknown>;
    if (Array.isArray(parsedObj.events)) {
      eventsArray = parsedObj;
    } else if (Array.isArray(parsed)) {
      eventsArray = { events: parsed };
    } else {
      // Try to find any array in the response
      const keys = Object.keys(parsedObj);
      for (const key of keys) {
        if (Array.isArray(parsedObj[key])) {
          eventsArray = { events: parsedObj[key] };
          break;
        }
      }
    }

    if (!eventsArray) {
      console.error("Qwen response has no array field, sample:", JSON.stringify(parsed).slice(0, 200));
      return heuristicClassify(newsItems);
    }

    const validated = llmResponseSchema.safeParse(eventsArray);
    if (!validated.success) {
      console.error(
        "Qwen schema mismatch:", validated.error.message,
        "\nSample:", JSON.stringify(eventsArray).slice(0, 300)
      );
      return heuristicClassify(newsItems);
    }

    // Merge LLM results with original news data
    const results: ClassifiedEvent[] = [];
    for (const ev of validated.data.events) {
      const original = newsItems[ev.index];
      if (!original) continue;

      const dateStr = original.published_at.slice(0, 7); // YYYY-MM
      results.push({
        significance: ev.significance,
        type: ev.type,
        description: ev.description.slice(0, 25), // Enforce 25-char limit
        coin: ev.coin,
        shouldInclude: ev.shouldInclude,
        sourceUrl: original.url,
        sourceName: original.source,
        date: dateStr,
        priceAtEvent: null, // filled in by discover route
      });
    }
    return results;
  } catch (err) {
    console.error("Qwen API call failed:", err);
    return heuristicClassify(newsItems);
  }
}

/* ------------------------------------------------------------------ */
/*  Heuristic fallback (no LLM)                                        */
/* ------------------------------------------------------------------ */

function heuristicClassify(newsItems: NewsItem[]): ClassifiedEvent[] {
  const bullKeywords = [
    "approve", "etf", "adopt", "surge", "rally", "bull", "record",
    "all-time high", "institutional", "launch", "partnership",
  ];
  const bearKeywords = [
    "crash", "ban", "hack", "fraud", "bankrupt", "collapse", "sec sue",
    "liquidat", "freeze", "plunge", "selloff",
  ];

  return newsItems.map((item) => {
    const titleLower = item.title.toLowerCase();
    const isBull = bullKeywords.some((k) => titleLower.includes(k));
    const isBear = bearKeywords.some((k) => titleLower.includes(k));
    const votesScore = Math.min(10, Math.ceil((item.votes_important ?? 0) / 5));
    const significance = Math.max(
      votesScore,
      isBull || isBear ? 6 : 4
    );

    // Determine primary coin
    const coin: "BTC" | "ETH" =
      titleLower.includes("ethereum") || titleLower.includes("eth")
        ? "ETH"
        : "BTC";

    return {
      significance,
      type: isBear ? "bear" as const : isBull ? "bull" as const : "neutral" as const,
      description: item.title.slice(0, 25), // truncated title as fallback
      coin,
      shouldInclude: significance >= 7,
      sourceUrl: item.url,
      sourceName: item.source,
      date: item.published_at.slice(0, 7),
      priceAtEvent: null,
    };
  });
}
