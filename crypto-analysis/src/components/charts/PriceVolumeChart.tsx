"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type Time,
  ColorType,
} from "lightweight-charts";
import type { CryptoEvent } from "@/types/market";
import { COLORS } from "@/lib/utils/constants";
import { useThemeColors } from "@/hooks/useThemeColors";

interface TooltipState {
  event: CryptoEvent;
  x: number;
  y: number;
}

interface PriceVolumeChartProps {
  labels: string[];
  prices: number[];
  volumes: number[];
  events: CryptoEvent[];
  height?: number;
}

function dateToTime(dateStr: string): Time {
  return (dateStr + "-01") as Time;
}

export default function PriceVolumeChart({
  labels,
  prices,
  volumes,
  events,
  height = 420,
}: PriceVolumeChartProps) {
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const visibleEvents = useMemo(
    () => events.filter((ev) => labels.includes(ev.date)),
    [events, labels]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: themeColors.muted,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: themeColors.border },
        horzLines: { color: themeColors.border },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: themeColors.accent },
        horzLine: { labelBackgroundColor: themeColors.accent },
      },
      rightPriceScale: {
        borderColor: themeColors.border,
      },
      leftPriceScale: {
        visible: true,
        borderColor: themeColors.border,
      },
      timeScale: {
        borderColor: themeColors.border,
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    // Volume histogram (left scale)，刻度与十字线标签最多保留 1 位小数
    const formatVolume = (v: number) =>
      `${v >= 10 ? Math.round(v) : v.toFixed(1)}B`;
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "left",
      color: "rgba(59,130,246,0.3)",
      priceFormat: { type: "custom" as const, formatter: formatVolume },
    });

    const volumeData = labels.map((l, i) => ({
      time: dateToTime(l),
      value: volumes[i] || 0,
      color: "rgba(59,130,246,0.3)",
    }));
    volumeSeries.setData(volumeData);

    // Price line (right scale)
    const priceSeries = chart.addSeries(LineSeries, {
      color: COLORS.btc,
      lineWidth: 2,
      priceFormat: { type: "custom" as const, formatter: (v: number) => `$${v.toLocaleString()}` },
    });

    const priceData = labels.map((l, i) => ({
      time: dateToTime(l),
      value: prices[i],
    }));
    priceSeries.setData(priceData);

    // Add event markers (arrows only; no text on chart to avoid overlap)
    const markers = visibleEvents.map((ev) => {
      const shape: "arrowUp" | "arrowDown" = ev.type === "bull" ? "arrowUp" : "arrowDown";
      const position: "belowBar" | "aboveBar" = ev.type === "bull" ? "belowBar" : "aboveBar";
      return {
        time: dateToTime(ev.date),
        position,
        color: ev.type === "bull" ? COLORS.success : COLORS.danger,
        shape,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let markersPlugin: any = null;
    if (markers.length > 0) {
      markersPlugin = createSeriesMarkers(priceSeries, markers);
    }

    // 悬浮框：十字线移动时若当前时间对应某事件，则显示该事件详情
    const eventByTime = new Map<string, CryptoEvent>(
      visibleEvents.map((ev) => [dateToTime(ev.date) as string, ev])
    );
    const handleCrosshairMove = (param: { time?: Time; point?: { x: number; y: number } }) => {
      if (!param.time || !param.point) {
        setTooltip(null);
        return;
      }
      const t = param.time as string;
      const ev = eventByTime.get(t);
      if (ev) {
        setTooltip({
          event: ev,
          x: param.point.x + 12,
          y: param.point.y + 12,
        });
      } else {
        setTooltip(null);
      }
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    chart.timeScale().fitContent();

    // Responsive resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      if (markersPlugin) markersPlugin.detach();
      observer.disconnect();
      chart.remove();
    };
  }, [labels, prices, volumes, events, height, visibleEvents, themeColors]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div ref={containerRef} />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 max-w-[280px] rounded-lg border border-border bg-card px-3 py-2 shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="text-[11px] font-medium tabular-nums text-accent">{tooltip.event.displayDate}</p>
            <p className="mt-0.5 text-[11px] text-foreground">{tooltip.event.description}</p>
            <p className="mt-1 text-[11px] text-muted">({tooltip.event.priceTag})</p>
          </div>
        )}
      </div>
      {visibleEvents.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[11px] text-muted mb-2 font-medium">关键拐点说明（与图中箭头对应）</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted max-h-24 overflow-y-auto">
            {visibleEvents.map((ev) => (
              <li key={ev.date} className="flex items-baseline gap-2 shrink-0">
                <span className="text-accent font-medium tabular-nums">{ev.displayDate}</span>
                <span>{ev.description}</span>
                <span className="text-muted/80">({ev.priceTag})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
