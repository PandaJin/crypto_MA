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

interface DexRatioChartProps {
  labels: string[];
  cexVolume: number[];
  dexVolume: (number | null)[];
}

export default function DexRatioChart({
  labels,
  cexVolume,
  dexVolume,
}: DexRatioChartProps) {
  const data = labels
    .map((label, i) => {
      const dex = dexVolume[i];
      const cex = cexVolume[i];
      if (dex == null || !cex) return null;
      return {
        date: label,
        ratio: parseFloat(((dex / (cex + dex)) * 100).toFixed(1)),
      };
    })
    .filter(Boolean);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dexGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
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
          tickFormatter={(v) => `${v.toFixed(1)}%`}
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
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "DEX占比"]}
          labelStyle={{ color: COLORS.accent }}
        />
        <Area
          type="monotone"
          dataKey="ratio"
          stroke={COLORS.purple}
          fill="url(#dexGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
