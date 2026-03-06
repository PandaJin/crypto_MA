"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

export function useFearGreed(limit: number = 30) {
  const { data, error, isLoading } = useSWR<FearGreedData[]>(
    `/api/fear-greed?limit=${limit}`,
    fetcher,
    { refreshInterval: 3600000 }
  );

  return {
    data,
    current: data?.[0],
    error,
    isLoading,
  };
}
