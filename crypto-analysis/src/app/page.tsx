"use client";

import { useState, useEffect, useMemo } from "react";
import type { CryptoEvent, ScenarioData } from "@/types/market";
import type { TimeRange } from "@/lib/utils/constants";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import KpiCard from "@/components/cards/KpiCard";
import ScenarioCard from "@/components/cards/ScenarioCard";
import RangeSelector from "@/components/ui/RangeSelector";
import PriceVolumeChart from "@/components/charts/PriceVolumeChart";
import EthPriceChart from "@/components/charts/EthPriceChart";
import VolumeBreakdownChart from "@/components/charts/VolumeBreakdownChart";
import MarketShareChart from "@/components/charts/MarketShareChart";
import DexRatioChart from "@/components/charts/DexRatioChart";
import CorrelationChart from "@/components/charts/CorrelationChart";
import EventTimeline from "@/components/features/EventTimeline";

const scenarios: ScenarioData[] = [
  {
    title: "悲观情景",
    type: "bear",
    probability: 25,
    condition: "全球衰退 + 监管收紧",
    metrics: [
      { label: "BTC 2026E", value: "$45K-$55K" },
      { label: "ETH 2026E", value: "$1.2K-$1.8K" },
      { label: "BTC 2027E", value: "$35K-$50K" },
      { label: "CEX月均量", value: "$400-600B" },
      { label: "总市值", value: "$1.0-1.5T" },
      { label: "触发条件", value: "利率居高不下" },
    ],
  },
  {
    title: "基准情景",
    type: "base",
    probability: 45,
    condition: "温和复苏 + 监管明确化",
    metrics: [
      { label: "BTC 2026E", value: "$80K-$100K" },
      { label: "ETH 2026E", value: "$3.0K-$4.5K" },
      { label: "BTC 2027E", value: "$100K-$140K" },
      { label: "CEX月均量", value: "$800B-1.2T" },
      { label: "总市值", value: "$2.5-4.0T" },
      { label: "触发条件", value: "渐进降息周期" },
    ],
  },
  {
    title: "乐观情景",
    type: "bull",
    probability: 30,
    condition: "流动性大潮 + 制度性采纳",
    metrics: [
      { label: "BTC 2026E", value: "$150K-$200K" },
      { label: "ETH 2026E", value: "$6K-$8K" },
      { label: "BTC 2027E", value: "$200K-$330K" },
      { label: "CEX月均量", value: "$1.5-2.5T" },
      { label: "总市值", value: "$5.0-8.0T" },
      { label: "触发条件", value: "主权基金入场" },
    ],
  },
];

function getRangeStartIndex(labels: string[], range: TimeRange): number {
  if (range === "all") return 0;
  const year = parseInt(range);
  const idx = labels.findIndex((l) => l.startsWith(String(year)));
  return idx === -1 ? 0 : idx;
}

export default function DashboardPage() {
  const { data: historicalData } = useHistoricalData();
  const [events, setEvents] = useState<CryptoEvent[]>([]);
  const [range, setRange] = useState<TimeRange>("all");

  useEffect(() => {
    fetch("/data/events.json").then((r) => r.json()).then(setEvents);
  }, []);

  const slicedData = useMemo(() => {
    if (!historicalData) return null;
    const startIdx = getRangeStartIndex(historicalData.labels, range);
    return {
      labels: historicalData.labels.slice(startIdx),
      btcPrices: historicalData.btcPrices.slice(startIdx),
      ethPrices: historicalData.ethPrices.slice(startIdx),
      cexVolume: historicalData.cexVolume.slice(startIdx),
      dexVolume: historicalData.dexVolume.slice(startIdx),
      otcVolume: historicalData.otcVolume.slice(startIdx),
    };
  }, [historicalData, range]);

  if (!historicalData || !slicedData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted text-sm">加载数据中...</div>
      </div>
    );
  }

  const lastBtc = historicalData.btcPrices[historicalData.btcPrices.length - 1];
  const lastEth = historicalData.ethPrices[historicalData.ethPrices.length - 1];
  const lastCex = historicalData.cexVolume[historicalData.cexVolume.length - 1];
  const lastDex = historicalData.dexVolume[historicalData.dexVolume.length - 1];
  const dexRatio =
    lastDex && lastCex
      ? ((lastDex / (lastCex + lastDex)) * 100).toFixed(1)
      : "N/A";

  return (
    <div>
      {/* Header */}
      <div className="px-4 md:px-8 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted">
            {historicalData
              ? `${historicalData.metadata.startDate.replace("-", "年")}月 — ${historicalData.metadata.endDate.replace("-", "年")}月`
              : "加载中..."}{" "}
            | CEX + DEX + OTC 全口径 | 数据来源: CoinGecko, The Block, DefiLlama
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-4 md:px-8 py-3">
        <KpiCard
          label="BTC 当前价格"
          value={`$${lastBtc.toLocaleString()}`}
          change="47.7% (较ATH $126,272)"
          changeType="down"
          valueColor="#f7931a"
        />
        <KpiCard
          label="ETH 当前价格"
          value={`$${lastEth.toLocaleString()}`}
          change="60.1% (较ATH $4,952)"
          changeType="down"
          valueColor="#627eea"
        />
        <KpiCard
          label="CEX月现货交易量"
          value={`$${lastCex}B`}
          change="49.5% (较10月峰值)"
          changeType="down"
        />
        <KpiCard
          label="DEX月交易量"
          value={`$${lastDex}B`}
          change="53.6% (较峰值$140B)"
          changeType="down"
        />
        <KpiCard
          label="DEX占比"
          value={`${dexRatio}%`}
          change="历史新高区间"
          changeType="up"
          valueColor="#8b5cf6"
        />
        <KpiCard
          label="MVRV 比率"
          value="1.76"
          change="接近低估区间 (<1.5)"
          changeType="neutral"
          valueColor="#f59e0b"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 md:px-8 py-2">
        {/* Main chart - full width */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted mb-3">
            BTC月度价格 vs 全市场总交易量{" "}
            <span className="text-[11px] text-accent font-normal">
              (↑↓ 为拐点位置，下方为事件说明)
            </span>
          </h3>
          <PriceVolumeChart
            labels={slicedData.labels}
            prices={slicedData.btcPrices}
            volumes={slicedData.cexVolume}
            events={events}
          />
        </div>

        {/* ETH Price */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted mb-3">
            ETH 月度价格走势
          </h3>
          <div className="h-80">
            <EthPriceChart
              labels={slicedData.labels}
              prices={slicedData.ethPrices}
            />
          </div>
        </div>

        {/* Volume Breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted mb-3">
            交易量构成 (CEX / DEX / OTC)
          </h3>
          <div className="h-80">
            <VolumeBreakdownChart
              labels={slicedData.labels}
              cexVolume={slicedData.cexVolume}
              dexVolume={slicedData.dexVolume}
              otcVolume={slicedData.otcVolume}
            />
          </div>
        </div>

        {/* Market Share */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted mb-3">
            头部交易所市场份额演变
          </h3>
          <div className="h-80">
            <MarketShareChart {...historicalData.exchangeShares} />
          </div>
        </div>

        {/* DEX Ratio */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted mb-3">
            DEX 占总现货交易量比例
          </h3>
          <div className="h-80">
            <DexRatioChart
              labels={slicedData.labels}
              cexVolume={slicedData.cexVolume}
              dexVolume={slicedData.dexVolume}
            />
          </div>
        </div>

        {/* BTC vs ETH Correlation */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted mb-3">
            BTC vs ETH 月度涨跌幅对比
          </h3>
          <div className="h-80">
            <CorrelationChart
              labels={slicedData.labels}
              btcPrices={slicedData.btcPrices}
              ethPrices={slicedData.ethPrices}
            />
          </div>
        </div>

        {/* Events Timeline */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted mb-4">
            关键拐点与催化剂时间线 (可滚动)
          </h3>
          <EventTimeline events={events} />
        </div>

        {/* Scenario Section */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted mb-4">
            2026-2027 情景分析
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarios.map((s) => (
              <ScenarioCard key={s.type} data={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
