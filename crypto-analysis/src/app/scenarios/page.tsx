"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { COLORS } from "@/lib/utils/constants";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface SliderParam {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
  description: string;
}

const PARAMS: SliderParam[] = [
  { label: "联邦基金利率", key: "rate", min: 0, max: 8, step: 0.25, unit: "%", defaultValue: 4.5, description: "美联储利率水平" },
  { label: "BTC ETF月均净流入", key: "etfInflow", min: -5, max: 20, step: 0.5, unit: "B$", defaultValue: 5, description: "现货ETF资金流" },
  { label: "DEX采纳率", key: "dexAdoption", min: 5, max: 30, step: 1, unit: "%", defaultValue: 12, description: "DEX占总交易量比" },
  { label: "监管友好度", key: "regulation", min: 1, max: 10, step: 1, unit: "/10", defaultValue: 5, description: "全球监管环境评分" },
  { label: "机构采纳速度", key: "institutional", min: 1, max: 10, step: 1, unit: "/10", defaultValue: 5, description: "机构进场速率" },
  { label: "全球M2增长率", key: "m2Growth", min: -2, max: 10, step: 0.5, unit: "%", defaultValue: 4, description: "全球流动性增速" },
];

const MONITORING_INDICATORS = [
  { label: "BTC ETF日均净流入", current: "$2.1B", threshold: ">$500M = 看涨", status: "bull" as const },
  { label: "CEX月度现货量", current: "$480B", threshold: "趋势方向", status: "bear" as const },
  { label: "DEX/CEX比率", current: "11.9%", threshold: ">15% = 去中心化加速", status: "neutral" as const },
  { label: "MVRV比率", current: "1.76", threshold: ">3.5 = 过热, <1 = 低估", status: "bull" as const },
  { label: "恐惧贪婪指数", current: "10", threshold: "<20 = 极度恐惧", status: "bear" as const },
  { label: "稳定币市值", current: "$190B", threshold: "增长 = 资金入场", status: "bull" as const },
  { label: "BTC矿工收入", current: "$28M/日", threshold: "减半后适应期", status: "neutral" as const },
  { label: "全球监管进展", current: "MiCA已生效", threshold: "美国立法进度", status: "neutral" as const },
];

function simulatePrice(
  basePrice: number,
  months: number,
  params: Record<string, number>
): number[] {
  const prices: number[] = [basePrice];
  for (let i = 1; i <= months; i++) {
    const rateFactor = (5 - params.rate) * 0.01; // Lower rates = bullish
    const etfFactor = params.etfInflow * 0.005;
    const dexFactor = (params.dexAdoption - 10) * 0.002;
    const regFactor = (params.regulation - 5) * 0.008;
    const instFactor = (params.institutional - 5) * 0.006;
    const m2Factor = (params.m2Growth - 3) * 0.004;

    const monthlyGrowth = rateFactor + etfFactor + dexFactor + regFactor + instFactor + m2Factor;
    const noise = (Math.random() - 0.5) * 0.04;
    const prev = prices[i - 1];
    prices.push(prev * (1 + monthlyGrowth + noise));
  }
  return prices;
}

export default function ScenariosPage() {
  const [params, setParams] = useState<Record<string, number>>(
    Object.fromEntries(PARAMS.map((p) => [p.key, p.defaultValue]))
  );

  const projectionMonths = 18;
  const basePrice = 66000;
  const baseEthPrice = 1978;

  const projection = useMemo(() => {
    const btcPrices = simulatePrice(basePrice, projectionMonths, params);
    const ethPrices = simulatePrice(baseEthPrice, projectionMonths, params);
    const months = [];
    const now = new Date();
    for (let i = 0; i <= projectionMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i);
      months.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        BTC: Math.round(btcPrices[i]),
        ETH: Math.round(ethPrices[i]),
      });
    }
    return months;
  }, [params]);

  // Scenario presets
  const applyPreset = (preset: "bear" | "base" | "bull") => {
    if (preset === "bear") {
      setParams({ rate: 6.0, etfInflow: -2, dexAdoption: 8, regulation: 2, institutional: 2, m2Growth: 0 });
    } else if (preset === "base") {
      setParams({ rate: 4.0, etfInflow: 5, dexAdoption: 15, regulation: 6, institutional: 5, m2Growth: 4 });
    } else {
      setParams({ rate: 2.5, etfInflow: 15, dexAdoption: 25, regulation: 9, institutional: 9, m2Growth: 7 });
    }
  };

  const finalBtc = projection[projection.length - 1]?.BTC || 0;
  const finalEth = projection[projection.length - 1]?.ETH || 0;

  return (
    <div className="px-4 md:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold">情景模拟</h1>
        <p className="text-muted text-sm mt-1">
          调节宏观参数 · 模拟价格轨迹 · 8个关键监控指标
        </p>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => applyPreset("bear")}
          className="px-4 py-2 text-sm rounded-xl border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 transition-colors"
        >
          悲观情景
        </button>
        <button
          onClick={() => applyPreset("base")}
          className="px-4 py-2 text-sm rounded-xl border border-info/30 bg-info/5 text-info hover:bg-info/10 transition-colors"
        >
          基准情景
        </button>
        <button
          onClick={() => applyPreset("bull")}
          className="px-4 py-2 text-sm rounded-xl border border-success/30 bg-success/5 text-success hover:bg-success/10 transition-colors"
        >
          乐观情景
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameter sliders */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-medium">参数调节</h3>
          {PARAMS.map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-xs mb-1">
                <span>{p.label}</span>
                <span className="font-mono text-accent">
                  {params[p.key]}{p.unit}
                </span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.key]}
                onChange={(e) =>
                  setParams({ ...params, [p.key]: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-accent bg-border"
              />
              <div className="flex justify-between text-[10px] text-muted mt-0.5">
                <span>{p.min}{p.unit}</span>
                <span className="text-muted/60">{p.description}</span>
                <span>{p.max}{p.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Projection chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">模拟价格轨迹 (18个月)</h3>
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted">BTC 终值: </span>
                  <span className={cn("font-mono font-medium", finalBtc > basePrice ? "text-success" : "text-danger")}>
                    ${finalBtc.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted">ETH 终值: </span>
                  <span className={cn("font-mono font-medium", finalEth > baseEthPrice ? "text-success" : "text-danger")}>
                    ${finalEth.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: COLORS.muted }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="btc"
                    tick={{ fontSize: 10, fill: COLORS.muted }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="eth"
                    orientation="right"
                    tick={{ fontSize: 10, fill: COLORS.muted }}
                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [
                      `$${Number(value).toLocaleString()}`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="btc"
                    type="monotone"
                    dataKey="BTC"
                    stroke={COLORS.btc}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="eth"
                    type="monotone"
                    dataKey="ETH"
                    stroke={COLORS.eth}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 8 Key Monitoring Indicators */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">8个关键监控指标</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MONITORING_INDICATORS.map((ind, i) => (
                <div
                  key={i}
                  className="bg-bg rounded-lg p-3 border border-border/50"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        ind.status === "bull" && "bg-success",
                        ind.status === "bear" && "bg-danger",
                        ind.status === "neutral" && "bg-accent"
                      )}
                    />
                    <span className="text-[10px] text-muted">{ind.label}</span>
                  </div>
                  <div className="text-sm font-mono font-medium">
                    {ind.current}
                  </div>
                  <div className="text-[10px] text-muted mt-1">
                    {ind.threshold}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
