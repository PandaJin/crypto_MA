/**
 * POST /api/events/commit
 *
 * Writes approved CryptoEvent objects into public/data/events.json.
 * Merges new events with existing ones, sorted by date, with same-month de-duplication.
 *
 * Body: { "events": CryptoEvent[] }
 * Returns: { success: true, total: number, added: number }
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";
import type { CryptoEvent } from "@/types/market";

/* ------------------------------------------------------------------ */
/*  Zod schema for request validation                                  */
/* ------------------------------------------------------------------ */

const cryptoEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}$/),
  displayDate: z.string(),
  type: z.enum(["bull", "bear", "neutral"]),
  description: z.string().min(1).max(100),
  priceTag: z.string(),
  coin: z.string(),
  priceAtEvent: z.number(),
  sourceUrl: z.string().optional(),
  source: z.string().optional(),
});

const requestBodySchema = z.object({
  events: z.array(cryptoEventSchema).min(1).max(10),
});

/* ------------------------------------------------------------------ */
/*  File path                                                          */
/* ------------------------------------------------------------------ */

const EVENTS_FILE = path.join(process.cwd(), "public/data/events.json");

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validated = requestBodySchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: validated.error.issues.map((i) => i.message),
      },
      { status: 400 }
    );
  }

  const newEvents = validated.data.events as CryptoEvent[];

  try {
    // 2. Read existing events
    let existing: CryptoEvent[] = [];
    try {
      const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      // If file doesn't exist or is invalid, start fresh
      existing = [];
    }

    // 3. De-duplicate: skip new events whose date already exists
    const existingDates = new Set(existing.map((e) => e.date));
    const toAdd = newEvents.filter((e) => !existingDates.has(e.date));

    if (toAdd.length === 0) {
      return NextResponse.json({
        success: true,
        total: existing.length,
        added: 0,
        message: "All events already exist (same month). No changes made.",
      });
    }

    // 4. Merge and sort by date
    const merged = [...existing, ...toAdd].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 5. Write back (pretty-printed for readability)
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(merged, null, 2) + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      total: merged.length,
      added: toAdd.length,
    });
  } catch (err) {
    console.error("Failed to commit events:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to commit events: ${message}` },
      { status: 500 }
    );
  }
}
