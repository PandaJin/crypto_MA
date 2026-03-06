"use client";

import { cn } from "@/lib/utils/cn";

interface FearGreedGaugeProps {
  value: number;
  label: string;
}

function getColor(value: number) {
  if (value <= 25) return "#ef4444";
  if (value <= 45) return "#f97316";
  if (value <= 55) return "#eab308";
  if (value <= 75) return "#84cc16";
  return "#10b981";
}

export default function FearGreedGauge({ value, label }: FearGreedGaugeProps) {
  const color = getColor(value);
  const rotation = (value / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center">
      <div className="text-sm text-muted mb-4">恐惧贪婪指数</div>
      <div className="relative w-48 h-24 overflow-hidden">
        {/* Gauge background arc */}
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored segments */}
          <path
            d="M 10 100 A 90 90 0 0 1 46 28"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity={0.6}
          />
          <path
            d="M 46 28 A 90 90 0 0 1 100 10"
            fill="none"
            stroke="#f97316"
            strokeWidth="12"
            opacity={0.6}
          />
          <path
            d="M 100 10 A 90 90 0 0 1 154 28"
            fill="none"
            stroke="#eab308"
            strokeWidth="12"
            opacity={0.6}
          />
          <path
            d="M 154 28 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#10b981"
            strokeWidth="12"
            strokeLinecap="round"
            opacity={0.6}
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="25"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 100, 100)`}
          />
          <circle cx="100" cy="100" r="6" fill={color} />
        </svg>
      </div>
      <div className="mt-2 text-3xl font-bold font-mono" style={{ color }}>
        {value}
      </div>
      <div
        className={cn("text-sm font-medium mt-1")}
        style={{ color }}
      >
        {label}
      </div>
      <div className="flex justify-between w-full mt-3 text-[10px] text-muted">
        <span>极度恐惧</span>
        <span>极度贪婪</span>
      </div>
    </div>
  );
}
