"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

interface PriceResponse {
  bitcoin: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
  };
  ethereum: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
  };
}

export function usePrice() {
  const { data, error, isLoading } = useSWR<PriceResponse>(
    "/api/prices",
    fetcher,
    { refreshInterval: 60000 }
  );

  return { data, error, isLoading };
}
