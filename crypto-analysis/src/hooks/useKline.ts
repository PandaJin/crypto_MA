"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useKline(
  symbol: string = "BTCUSDT",
  interval: string = "1h",
  limit: number = 100
) {
  const { data, error, isLoading } = useSWR<KlineData[]>(
    `/api/kline?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return { data, error, isLoading };
}
