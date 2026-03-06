"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  ColorType,
} from "lightweight-charts";
import { COLORS } from "@/lib/utils/constants";

interface KlineItem {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KlineChartProps {
  data: KlineItem[];
  height?: number;
}

export default function KlineChart({ data, height = 500 }: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || !Array.isArray(data) || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.muted,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.border },
        horzLines: { color: COLORS.border },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: COLORS.accent },
        horzLine: { labelBackgroundColor: COLORS.accent },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
      },
      leftPriceScale: {
        visible: true,
        borderColor: COLORS.border,
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "left",
      priceFormat: {
        type: "custom" as const,
        formatter: (v: number) => {
          if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
          if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
          if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
          return v.toFixed(0);
        },
      },
    });

    const volumeData = data.map((d) => ({
      time: Math.floor(d.time / 1000) as import("lightweight-charts").Time,
      value: d.volume,
      color:
        d.close >= d.open
          ? "rgba(16,185,129,0.3)"
          : "rgba(239,68,68,0.3)",
    }));
    volumeSeries.setData(volumeData);

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.success,
      downColor: COLORS.danger,
      borderUpColor: COLORS.success,
      borderDownColor: COLORS.danger,
      wickUpColor: COLORS.success,
      wickDownColor: COLORS.danger,
    });

    const candleData = data.map((d) => ({
      time: Math.floor(d.time / 1000) as import("lightweight-charts").Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeries.setData(candleData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [data, height]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted text-sm"
        style={{ height }}
      >
        加载K线数据中...
      </div>
    );
  }

  return <div ref={containerRef} />;
}
