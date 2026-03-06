export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateBollinger(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerResult {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = prices.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    middle.push(sma);
    upper.push(sma + multiplier * std);
    lower.push(sma - multiplier * std);
  }

  return { upper, middle, lower };
}
