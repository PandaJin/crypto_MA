"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { COLORS } from "@/lib/utils/constants";

interface EthPriceChartProps {
  labels: string[];
  prices: number[];
}

export default function EthPriceChart({ labels, prices }: EthPriceChartProps) {
  const data = labels.map((label, i) => ({
    date: label,
    price: prices[i],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="ethGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.eth} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.eth} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: COLORS.muted }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
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
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "ETH价格"]}
          labelStyle={{ color: COLORS.accent }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={COLORS.eth}
          fill="url(#ethGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
