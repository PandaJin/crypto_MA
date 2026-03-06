export const COLORS = {
  btc: "#f7931a",
  eth: "#627eea",
  success: "#10b981",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  accent: "#f59e0b",
  muted: "#94a3b8",
  card: "#111827",
  border: "#1e293b",
  bg: "#0a0e17",
} as const;

export const EXCHANGE_COLORS: Record<string, string> = {
  binance: "#f7931a",
  coinbase: "#3b82f6",
  ftx: "#22d3ee",
  okx: "#8b5cf6",
  bybit: "#10b981",
  others: "#475569",
};

export const TIME_RANGES = [
  { label: "全部", value: "all" },
  { label: "2020至今", value: "2020" },
  { label: "2023至今", value: "2023" },
  { label: "2025至今", value: "2025" },
] as const;

export type TimeRange = (typeof TIME_RANGES)[number]["value"];
