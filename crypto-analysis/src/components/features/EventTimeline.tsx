"use client";

import { cn } from "@/lib/utils/cn";
import type { CryptoEvent } from "@/types/market";

interface EventTimelineProps {
  events: CryptoEvent[];
  maxHeight?: number;
}

export default function EventTimeline({
  events,
  maxHeight = 400,
}: EventTimelineProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto pr-1"
      style={{ maxHeight }}
    >
      {events.map((event, i) => (
        <div
          key={i}
          className="flex gap-2.5 p-2.5 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
              event.type === "bull" && "bg-success",
              event.type === "bear" && "bg-danger",
              event.type === "neutral" && "bg-muted"
            )}
          />
          <div>
            <div className="text-[11px] text-accent font-semibold">
              {event.displayDate}
            </div>
            <div className="text-xs leading-relaxed">{event.description}</div>
            <div className="text-[11px] text-muted mt-1">{event.priceTag}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
