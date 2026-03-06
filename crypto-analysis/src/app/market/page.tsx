"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useWebSocket, DEFAULT_SYMBOLS } from "@/hooks/useWebSocket";
import { useKline } from "@/hooks/useKline";
import { useFearGreed } from "@/hooks/useFearGreed";
import TickerCard from "@/components/cards/TickerCard";
import FearGreedGauge from "@/components/cards/FearGreedGauge";

const KlineChart = dynamic(
  () => import("@/components/charts/KlineChart"),
  { ssr: false }
);

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

const CHART_SYMBOLS = [
  { label: "BTC/USDT", value: "BTCUSDT" },
  { label: "ETH/USDT", value: "ETHUSDT" },
  { label: "BNB/USDT", value: "BNBUSDT" },
  { label: "SOL/USDT", value: "SOLUSDT" },
];

const FG_LABELS: Record<string, string> = {
  "Extreme Fear": "极度恐惧",
  Fear: "恐惧",
  Neutral: "中性",
  Greed: "贪婪",
  "Extreme Greed": "极度贪婪",
};

export default function MarketPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [klineInterval, setKlineInterval] = useState("1h");

  const { tickers, connected } = useWebSocket(DEFAULT_SYMBOLS);
  const { data: klineData, isLoading: klineLoading } = useKline(
    symbol,
    klineInterval,
    200
  );
  const { current: fearGreed } = useFearGreed();

  const sortedSymbols = useMemo(() => {
    return [...DEFAULT_SYMBOLS].sort((a, b) => {
      const aVol = parseFloat(tickers.get(a)?.quoteVolume || "0");
      const bVol = parseFloat(tickers.get(b)?.quoteVolume || "0");
      return bVol - aVol;
    });
  }, [tickers]);

  return (
    <div className="px-4 md:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">实时行情</h1>
          <p className="text-muted text-sm mt-1">
            Binance WebSocket 实时推送 · K线图 · 恐惧贪婪指数
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-success animate-pulse" : "bg-accent animate-pulse"
            }`}
          />
          <span className="text-xs text-muted">
            {connected ? "WebSocket 实时" : "REST 轮询 (10s)"}
          </span>
        </div>
      </div>

      {/* Ticker grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sortedSymbols.map((sym) => {
          const t = tickers.get(sym);
          if (!t) {
            return (
              <div
                key={sym}
                className="bg-card border border-border rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 bg-border rounded w-20 mb-2" />
                <div className="h-6 bg-border rounded w-28 mb-2" />
                <div className="h-3 bg-border rounded w-full" />
              </div>
            );
          }
          return (
            <TickerCard
              key={sym}
              symbol={t.symbol}
              price={t.price}
              change={t.priceChange}
              changePercent={t.priceChangePercent}
              high={t.high}
              low={t.low}
              volume={t.quoteVolume}
            />
          );
        })}
      </div>

      {/* K-line section + Fear Greed */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-card border border-border rounded-xl p-4">
          {/* Symbol & interval selectors */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1">
              {CHART_SYMBOLS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSymbol(s.value)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    symbol === s.value
                      ? "bg-accent text-black font-medium"
                      : "bg-border/50 text-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex gap-1">
              {INTERVALS.map((i) => (
                <button
                  key={i.value}
                  onClick={() => setKlineInterval(i.value)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    klineInterval === i.value
                      ? "bg-accent text-black font-medium"
                      : "bg-border/50 text-muted hover:text-foreground"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          {/* K-line chart */}
          {klineLoading ? (
            <div className="flex items-center justify-center h-[500px] text-muted text-sm">
              加载K线数据中...
            </div>
          ) : (
            <KlineChart data={klineData || []} height={500} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Fear & Greed */}
          {fearGreed ? (
            <FearGreedGauge
              value={parseInt(fearGreed.value)}
              label={
                FG_LABELS[fearGreed.value_classification] ||
                fearGreed.value_classification
              }
            />
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 h-48 animate-pulse" />
          )}

          {/* Quick stats */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium mb-2">24h 市场概览</div>
            {["BTCUSDT", "ETHUSDT"].map((sym) => {
              const t = tickers.get(sym);
              if (!t) return null;
              const pct = parseFloat(t.priceChangePercent);
              return (
                <div key={sym} className="flex justify-between text-sm">
                  <span className="text-muted">
                    {sym.replace("USDT", "")}
                  </span>
                  <div className="text-right">
                    <div className="font-mono">
                      ${parseFloat(t.price).toLocaleString()}
                    </div>
                    <div
                      className={`text-xs font-mono ${
                        pct >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {pct >= 0 ? "+" : ""}
                      {pct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connection info */}
          <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted space-y-1">
            <div>
              Ticker：{connected
                ? "Binance WebSocket 实时"
                : "Binance REST 轮询（10s）"}
            </div>
            <div>K线数据: Binance REST API</div>
            <div>恐惧贪婪: Alternative.me</div>
            <div className="text-[10px] mt-2 opacity-60">
              WebSocket 不可用时自动降级为 REST 模式（中国大陆兼容）
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
