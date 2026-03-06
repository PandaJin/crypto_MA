"use client";

import { cn } from "@/lib/utils/cn";
import type { ScenarioData } from "@/types/market";

interface ScenarioCardProps {
  data: ScenarioData;
}

const typeStyles = {
  bear: {
    border: "border-red-900",
    bg: "bg-danger/5",
    title: "text-danger",
    icon: "🐻",
  },
  base: {
    border: "border-blue-900",
    bg: "bg-info/5",
    title: "text-info",
    icon: "➡️",
  },
  bull: {
    border: "border-emerald-900",
    bg: "bg-success/5",
    title: "text-success",
    icon: "🐂",
  },
};

export default function ScenarioCard({ data }: ScenarioCardProps) {
  const style = typeStyles[data.type];

  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        style.border,
        style.bg
      )}
    >
      <div className={cn("text-sm font-bold mb-1", style.title)}>
        {style.icon} {data.title}
      </div>
      <div className="text-[11px] text-muted mb-3">
        概率: {data.probability}% | {data.condition}
      </div>
      <div className="space-y-1">
        {data.metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex justify-between py-1 border-b border-white/5 last:border-0 text-xs"
          >
            <span className="text-muted">{metric.label}</span>
            <span className="font-semibold">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
