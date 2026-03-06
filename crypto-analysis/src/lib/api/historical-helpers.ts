import { startOfMonth, endOfMonth, addMonths, format, getTime } from "date-fns";

/**
 * Generate an array of "YYYY-MM" labels between two months (inclusive on both ends).
 */
export function getMonthLabelsInRange(
  startYM: string,
  endYM: string
): string[] {
  const labels: string[] = [];
  let current = startOfMonth(new Date(startYM + "-01"));
  const end = startOfMonth(new Date(endYM + "-01"));

  while (current <= end) {
    labels.push(format(current, "yyyy-MM"));
    current = addMonths(current, 1);
  }
  return labels;
}

/**
 * Get start/end Unix timestamps (ms) for a given "YYYY-MM" label.
 */
export function getMonthBoundaries(monthLabel: string): {
  startMs: number;
  endMs: number;
} {
  const d = new Date(monthLabel + "-01");
  return {
    startMs: getTime(startOfMonth(d)),
    endMs: getTime(endOfMonth(d)),
  };
}

/**
 * From CoinGecko daily price array [[timestamp_ms, price], ...],
 * find the last data point within a given month as the month-end close.
 */
export function sampleMonthEndPrice(
  dailyPrices: [number, number][],
  monthLabel: string
): number | null {
  const { startMs, endMs } = getMonthBoundaries(monthLabel);
  let lastPrice: number | null = null;

  for (const [ts, price] of dailyPrices) {
    if (ts >= startMs && ts <= endMs) {
      lastPrice = price;
    }
  }
  return lastPrice !== null ? Math.round(lastPrice) : null;
}

/**
 * From daily volume array [[timestamp_ms, volume_usd], ...],
 * sum all entries within a month and convert to billions USD.
 */
export function aggregateMonthlyVolume(
  dailyVolumes: [number, number][],
  monthLabel: string
): number | null {
  const { startMs, endMs } = getMonthBoundaries(monthLabel);
  let total = 0;
  let count = 0;

  for (const [ts, vol] of dailyVolumes) {
    if (ts >= startMs && ts <= endMs) {
      total += vol;
      count++;
    }
  }

  if (count === 0) return null;
  return Math.round(total / 1e9);
}

/**
 * Get the current month label "YYYY-MM".
 */
export function getCurrentMonthLabel(): string {
  return format(new Date(), "yyyy-MM");
}

/**
 * Calculate the number of days from a "YYYY-MM" start to today.
 */
export function daysSince(monthLabel: string): number {
  const start = new Date(monthLabel + "-01");
  const now = new Date();
  return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
