"use client";

import { cn } from "@/lib/utils/cn";

interface TickerCardProps {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  high: string;
  low: string;
  volume: string;
}

const SYMBOL_NAMES: Record<string, string> = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  BNBUSDT: "BNB",
  SOLUSDT: "Solana",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
  ADAUSDT: "Cardano",
  AVAXUSDT: "Avalanche",
};

const SYMBOL_SHORT: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  BNBUSDT: "BNB",
  SOLUSDT: "SOL",
  XRPUSDT: "XRP",
  DOGEUSDT: "DOGE",
  ADAUSDT: "ADA",
  AVAXUSDT: "AVAX",
};

export default function TickerCard({
  symbol,
  price,
  change,
  changePercent,
  high,
  low,
  volume,
}: TickerCardProps) {
  const isPositive = parseFloat(change) >= 0;
  const priceFmt = parseFloat(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: parseFloat(price) > 100 ? 2 : 4,
  });
  const volumeFmt = (parseFloat(volume) / 1e6).toFixed(1);

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs text-muted">
            {SYMBOL_NAMES[symbol] || symbol}
          </span>
          <span className="ml-2 text-xs font-mono text-accent">
            {SYMBOL_SHORT[symbol] || symbol.replace("USDT", "")}
          </span>
        </div>
        <div
          className={cn(
            "text-xs font-mono px-2 py-0.5 rounded",
            isPositive
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          )}
        >
          {isPositive ? "+" : ""}
          {parseFloat(changePercent).toFixed(2)}%
        </div>
      </div>
      <div className="text-xl font-bold font-mono mb-2">${priceFmt}</div>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted">
        <div>
          <div>24h高</div>
          <div className="font-mono text-foreground">
            ${parseFloat(high).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div>24h低</div>
          <div className="font-mono text-foreground">
            ${parseFloat(low).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div>成交量</div>
          <div className="font-mono text-foreground">{volumeFmt}M</div>
        </div>
      </div>
    </div>
  );
}
