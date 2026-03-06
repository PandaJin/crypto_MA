"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import type { HistoricalData } from "@/types/market";

export function useHistoricalData() {
  const { data, error, isLoading } = useSWR<HistoricalData>(
    "/api/historical",
    fetcher,
    {
      refreshInterval: 21600000, // 6 hours
      dedupingInterval: 60000, // 1 min dedup across pages
      revalidateOnFocus: false,
    }
  );

  return { data, error, isLoading };
}
