"use client";

import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  valueColor?: string;
}

export default function KpiCard({
  label,
  value,
  change,
  changeType,
  valueColor,
}: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[11px] text-muted uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      <div
        className={cn(
          "text-xs mt-0.5",
          changeType === "up" && "text-success",
          changeType === "down" && "text-danger",
          changeType === "neutral" && "text-accent"
        )}
      >
        {changeType === "up" && "▲ "}
        {changeType === "down" && "▼ "}
        {change}
      </div>
    </div>
  );
}
