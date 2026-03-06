"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

export interface DefiData {
  total24h: number;
  total7d: number;
  protocols: { name: string; total24h: number }[];
}

export function useDefi() {
  const { data, error, isLoading } = useSWR<DefiData>(
    "/api/defi",
    fetcher,
    { refreshInterval: 300000 }
  );

  return { data, error, isLoading };
}
