export interface MonthlyData {
  date: string;
  btcPrice: number;
  ethPrice: number;
  cexVolume: number;
  dexVolume: number | null;
  otcVolume: number | null;
}

export interface HistoricalData {
  metadata: {
    startDate: string;
    endDate: string;
    months: number;
    sources: string[];
  };
  labels: string[];
  btcPrices: number[];
  ethPrices: number[];
  cexVolume: number[];
  dexVolume: (number | null)[];
  otcVolume: (number | null)[];
  exchangeShares: {
    labels: string[];
    binance: number[];
    coinbase: number[];
    ftx: number[];
    okx: number[];
    bybit: number[];
    others: number[];
  };
}

export interface CryptoEvent {
  date: string;
  displayDate: string;
  type: "bull" | "bear" | "neutral";
  description: string;
  priceTag: string;
  coin: string;
  priceAtEvent: number;
  sourceUrl?: string;
  source?: string;
}

export interface KpiData {
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  color?: string;
}

export interface ScenarioData {
  title: string;
  type: "bear" | "base" | "bull";
  probability: number;
  condition: string;
  metrics: { label: string; value: string }[];
}
