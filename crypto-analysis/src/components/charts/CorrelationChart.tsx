"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { COLORS, THEME_VARS } from "@/lib/utils/constants";

interface CorrelationChartProps {
  labels: string[];
  btcPrices: number[];
  ethPrices: number[];
}

export default function CorrelationChart({
  labels,
  btcPrices,
  ethPrices,
}: CorrelationChartProps) {
  const data = labels.map((label, i) => {
    const btcChange =
      i === 0 ? 0 : ((btcPrices[i] - btcPrices[i - 1]) / btcPrices[i - 1]) * 100;
    const ethChange =
      i === 0 ? 0 : ((ethPrices[i] - ethPrices[i - 1]) / ethPrices[i - 1]) * 100;
    return {
      date: label,
      BTC: parseFloat(btcChange.toFixed(1)),
      ETH: parseFloat(ethChange.toFixed(1)),
    };
  });

  return (
    <div className="w-full h-full flex flex-col">
      {/* Custom legend */}
      <div className="flex items-center justify-center gap-6 pb-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.btc }} />
          <span style={{ color: THEME_VARS.muted }}>BTC月涨跌%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.eth }} />
          <span style={{ color: THEME_VARS.muted }}>ETH月涨跌%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(16,185,129,0.6)" }} />
          <span style={{ color: THEME_VARS.muted }}>上涨</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.6)" }} />
          <span style={{ color: THEME_VARS.muted }}>下跌</span>
        </div>
      </div>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={THEME_VARS.border} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: THEME_VARS.muted }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: THEME_VARS.muted }}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: THEME_VARS.background,
            border: `1px solid ${THEME_VARS.border}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            `${Number(value).toFixed(1)}%`,
            `${name}月涨跌`,
          ]}
          labelStyle={{ color: THEME_VARS.accent }}
        />
        <Bar dataKey="BTC" name="BTC月涨跌%" fill={COLORS.btc} legendType="none">
          {data.map((entry, index) => (
            <Cell
              key={`btc-${index}`}
              fill={
                entry.BTC >= 0
                  ? "rgba(16,185,129,0.6)"
                  : "rgba(239,68,68,0.6)"
              }
            />
          ))}
        </Bar>
        <Bar dataKey="ETH" name="ETH月涨跌%" fill={COLORS.eth} legendType="none">
          {data.map((entry, index) => (
            <Cell
              key={`eth-${index}`}
              fill={
                entry.ETH >= 0
                  ? "rgba(16,185,129,0.3)"
                  : "rgba(239,68,68,0.3)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
