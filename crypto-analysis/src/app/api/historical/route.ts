import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { HistoricalData } from "@/types/market";
import {
  getMonthLabelsInRange,
  sampleMonthEndPrice,
  aggregateMonthlyVolume,
  getCurrentMonthLabel,
  daysSince,
} from "@/lib/api/historical-helpers";

export const revalidate = 21600; // 6 hours ISR

function readStaticData(): HistoricalData {
  const filePath = path.join(
    process.cwd(),
    "public/data/historical-btc-eth.json"
  );
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 21600 },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

interface CoinGeckoMarketChart {
  prices: [number, number][];
  total_volumes: [number, number][];
}

interface DefiLlamaResponse {
  totalDataChart: [number, number][];
}

export async function GET() {
  let baseData: HistoricalData;
  try {
    baseData = readStaticData();
  } catch (err) {
    console.error("Failed to read static historical data:", err);
    return NextResponse.json(
      { error: "Failed to read historical data" },
      { status: 500 }
    );
  }

  const currentMonth = getCurrentMonthLabel();
  const endMonth = baseData.metadata.endDate;

  // If static data is already up to date, return as-is
  if (endMonth >= currentMonth) {
    return NextResponse.json(baseData);
  }

  // Calculate missing months: from the month AFTER endMonth to currentMonth
  const nextMonthDate = new Date(endMonth + "-01");
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthLabel = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  if (nextMonthLabel > currentMonth) {
    return NextResponse.json(baseData);
  }

  const missingMonths = getMonthLabelsInRange(nextMonthLabel, currentMonth);
  if (missingMonths.length === 0) {
    return NextResponse.json(baseData);
  }

  // Calculate days to fetch (from first missing month start to today)
  const days = Math.min(daysSince(nextMonthLabel) + 5, 365); // cap at 1 year

  // Fetch data from external APIs in parallel
  const [btcResult, ethResult, dexResult] = await Promise.allSettled([
    fetchCoinGeckoChart("bitcoin", days),
    fetchCoinGeckoChart("ethereum", days),
    fetchDefiLlamaDex(),
  ]);

  const btcData =
    btcResult.status === "fulfilled" ? btcResult.value : null;
  const ethData =
    ethResult.status === "fulfilled" ? ethResult.value : null;
  const dexData =
    dexResult.status === "fulfilled" ? dexResult.value : null;

  // If all API calls failed, return static data
  if (!btcData && !ethData && !dexData) {
    console.error("All external API calls failed, returning static data");
    return NextResponse.json(baseData);
  }

  // Merge new months into the data
  const merged = structuredClone(baseData);

  for (const month of missingMonths) {
    const btcPrice = btcData
      ? sampleMonthEndPrice(btcData.prices, month)
      : null;
    const ethPrice = ethData
      ? sampleMonthEndPrice(ethData.prices, month)
      : null;
    const cexVolume = btcData
      ? aggregateMonthlyVolume(btcData.total_volumes, month)
      : null;
    const dexVolume = dexData
      ? aggregateMonthlyDexVolume(dexData.totalDataChart, month)
      : null;

    // Only append if we have at least price data
    if (btcPrice !== null || ethPrice !== null) {
      merged.labels.push(month);
      merged.btcPrices.push(btcPrice ?? merged.btcPrices[merged.btcPrices.length - 1]);
      merged.ethPrices.push(ethPrice ?? merged.ethPrices[merged.ethPrices.length - 1]);
      merged.cexVolume.push(cexVolume ?? merged.cexVolume[merged.cexVolume.length - 1]);
      merged.dexVolume.push(dexVolume);
      merged.otcVolume.push(null);
    }
  }

  // Update metadata
  if (merged.labels.length > baseData.labels.length) {
    merged.metadata.endDate = merged.labels[merged.labels.length - 1];
    merged.metadata.months = merged.labels.length;
  }

  return NextResponse.json(merged);
}

async function fetchCoinGeckoChart(
  coinId: string,
  days: number
): Promise<CoinGeckoMarketChart> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`CoinGecko ${coinId} responded with ${res.status}`);
  }
  return res.json();
}

async function fetchDefiLlamaDex(): Promise<DefiLlamaResponse> {
  const url =
    "https://api.llama.fi/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume";
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`DefiLlama responded with ${res.status}`);
  }
  return res.json();
}

/**
 * DefiLlama totalDataChart uses Unix seconds (not ms).
 * Aggregate daily DEX volumes for a given month into billions USD.
 */
function aggregateMonthlyDexVolume(
  chart: [number, number][],
  monthLabel: string
): number | null {
  const year = parseInt(monthLabel.slice(0, 4));
  const month = parseInt(monthLabel.slice(5, 7));
  let total = 0;
  let count = 0;

  for (const [ts, vol] of chart) {
    const d = new Date(ts * 1000); // DefiLlama uses seconds
    if (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month) {
      total += vol;
      count++;
    }
  }

  if (count === 0) return null;
  return Math.round(total / 1e9);
}
