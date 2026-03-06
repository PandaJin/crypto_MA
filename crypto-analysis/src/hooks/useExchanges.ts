"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

export interface Exchange {
  id: string;
  name: string;
  trust_score: number;
  trust_score_rank: number;
  trade_volume_24h_btc: number;
  trade_volume_24h_btc_normalized: number;
  year_established: number | null;
  country: string | null;
  url: string;
  image: string;
}

export function useExchanges() {
  const { data, error, isLoading } = useSWR<Exchange[]>(
    "/api/exchanges",
    fetcher,
    { refreshInterval: 300000 }
  );

  return { data, error, isLoading };
}
