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
import { COLORS, THEME_VARS } from "@/lib/utils/constants";

interface VolumeBreakdownChartProps {
  labels: string[];
  cexVolume: number[];
  dexVolume: (number | null)[];
  otcVolume: (number | null)[];
}

export default function VolumeBreakdownChart({
  labels,
  cexVolume,
  dexVolume,
  otcVolume,
}: VolumeBreakdownChartProps) {
  const data = labels.map((label, i) => ({
    date: label,
    CEX: cexVolume[i] || 0,
    DEX: dexVolume[i] || 0,
    OTC: otcVolume[i] || 0,
  }));

  return (
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
          tickFormatter={(v) => `${v}B`}
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
            `$${value}B`,
            name === "CEX" ? "CEX现货" : name === "DEX" ? "DEX" : "OTC",
          ]}
          labelStyle={{ color: THEME_VARS.accent }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) =>
            value === "CEX" ? "CEX现货" : value === "DEX" ? "DEX" : "OTC"
          }
        />
        <Bar dataKey="CEX" stackId="a" fill="rgba(59,130,246,0.6)" />
        <Bar dataKey="DEX" stackId="a" fill="rgba(139,92,246,0.6)" />
        <Bar dataKey="OTC" stackId="a" fill="rgba(245,158,11,0.6)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
