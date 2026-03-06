/**
 * GET /api/tickers
 *
 * Server-side proxy for Binance 24hr ticker data (all 8 symbols in one call).
 * Used as REST fallback when the client-side WebSocket is blocked (e.g. mainland China).
 *
 * Returns: TickerData[] — same shape as the WebSocket feed
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT",
  "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT",
];

// Binance API returns different field names for REST vs WebSocket
interface BinanceRestTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export async function GET() {
  // URL-encoded JSON array for multi-symbol batch request
  const symbolsParam = encodeURIComponent(JSON.stringify(SYMBOLS));

  const endpoints = [
    `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${symbolsParam}`,
    `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        // Short cache — this is a polling fallback, freshness matters
        next: { revalidate: 10 },
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) continue;

      const raw: BinanceRestTicker[] = await res.json();

      const data = raw.map((t) => ({
        symbol: t.symbol,
        price: t.lastPrice,
        priceChange: t.priceChange,
        priceChangePercent: t.priceChangePercent,
        high: t.highPrice,
        low: t.lowPrice,
        volume: t.volume,
        quoteVolume: t.quoteVolume,
      }));

      return NextResponse.json(data);
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: "All Binance ticker endpoints failed" },
    { status: 500 }
  );
}
