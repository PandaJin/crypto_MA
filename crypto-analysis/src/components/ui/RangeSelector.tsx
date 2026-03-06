"use client";

import { cn } from "@/lib/utils/cn";
import { TIME_RANGES, type TimeRange } from "@/lib/utils/constants";

interface RangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "px-3 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer",
            value === range.value
              ? "bg-accent text-black border-accent font-semibold"
              : "bg-card text-foreground border-border hover:bg-accent hover:text-black hover:border-accent"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
