"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { COLORS, EXCHANGE_COLORS } from "@/lib/utils/constants";

interface MarketShareChartProps {
  labels: string[];
  binance: number[];
  coinbase: number[];
  ftx: number[];
  okx: number[];
  bybit: number[];
  others: number[];
}

export default function MarketShareChart({
  labels,
  binance,
  coinbase,
  ftx,
  okx,
  bybit,
  others,
}: MarketShareChartProps) {
  const data = labels.map((label, i) => ({
    period: label,
    Binance: binance[i],
    FTX: ftx[i],
    Coinbase: coinbase[i],
    OKX: okx[i],
    Bybit: bybit[i],
    其他: others[i],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 9, fill: COLORS.muted }}
          tickLine={false}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: COLORS.muted }}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
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
          formatter={(value, name) => [`${value}%`, name]}
          labelStyle={{ color: COLORS.accent }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Binance" stackId="a" fill={EXCHANGE_COLORS.binance} />
        <Bar dataKey="FTX" stackId="a" fill={EXCHANGE_COLORS.ftx} />
        <Bar dataKey="Coinbase" stackId="a" fill={EXCHANGE_COLORS.coinbase} />
        <Bar dataKey="OKX" stackId="a" fill={EXCHANGE_COLORS.okx} />
        <Bar dataKey="Bybit" stackId="a" fill={EXCHANGE_COLORS.bybit} />
        <Bar dataKey="其他" stackId="a" fill={EXCHANGE_COLORS.others} />
      </BarChart>
    </ResponsiveContainer>
  );
}
