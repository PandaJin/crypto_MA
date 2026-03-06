"use client";

import { useMemo } from "react";
import { useExchanges } from "@/hooks/useExchanges";
import { useDefi } from "@/hooks/useDefi";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import MarketShareChart from "@/components/charts/MarketShareChart";
import VolumeBreakdownChart from "@/components/charts/VolumeBreakdownChart";
import DexRatioChart from "@/components/charts/DexRatioChart";
import { COLORS } from "@/lib/utils/constants";

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatBtcVolume(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC`;
}

function formatUsdVolume(value: number | undefined | null): string {
  if (value == null) return "N/A";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/* ------------------------------------------------------------------ */
/*  Trust Score visual indicator                                       */
/* ------------------------------------------------------------------ */

function TrustDots({ score }: { score: number }) {
  const clamped = Math.min(10, Math.max(0, score));
  const color =
    clamped >= 8
      ? COLORS.success
      : clamped >= 5
        ? COLORS.accent
        : COLORS.danger;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor: i < clamped ? color : COLORS.border,
          }}
        />
      ))}
      <span className="ml-1.5 text-xs" style={{ color }}>
        {clamped}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#1e293b] ${className}`}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-6 h-4" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = "h-80" }: { height?: string }) {
  return <Skeleton className={`w-full ${height}`} />;
}

function StatSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="w-24 h-3" />
      <Skeleton className="w-32 h-6" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function ExchangesPage() {
  const { data: exchanges, isLoading: exchangesLoading } = useExchanges();
  const { data: defiData, isLoading: defiLoading } = useDefi();
  const { data: historicalData } = useHistoricalData();

  // Sort exchanges by 24h volume descending
  const sortedExchanges = useMemo(() => {
    if (!exchanges) return [];
    return [...exchanges].sort(
      (a, b) => b.trade_volume_24h_btc - a.trade_volume_24h_btc
    );
  }, [exchanges]);

  // Top 5 DEX protocols sorted by volume
  const topDexProtocols = useMemo(() => {
    if (!defiData?.protocols) return [];
    return [...defiData.protocols]
      .filter((p) => p.total24h != null && p.total24h > 0)
      .sort((a, b) => b.total24h - a.total24h)
      .slice(0, 5);
  }, [defiData]);

  // Max volume for DEX bar chart scaling
  const maxDexVolume = useMemo(() => {
    if (!topDexProtocols.length) return 1;
    return topDexProtocols[0].total24h;
  }, [topDexProtocols]);

  return (
    <div>
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-2">
        <h1 className="text-xl font-bold mb-1">交易所对比</h1>
        <p className="text-sm" style={{ color: COLORS.muted }}>
          交易所排名 / 市场份额 / DEX vs CEX | 数据来源: CoinGecko, DefiLlama
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Section 1 : Exchange Ranking Table                           */}
      {/* ============================================================ */}
      <div className="px-4 md:px-8 py-4">
        <div
          className="rounded-xl p-5 overflow-x-auto"
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: COLORS.muted }}
          >
            头部交易所排名{" "}
            <span
              className="text-[11px] font-normal"
              style={{ color: COLORS.accent }}
            >
              (按24小时BTC交易量排序)
            </span>
          </h2>

          {exchangesLoading ? (
            <TableSkeleton />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs"
                  style={{ color: COLORS.muted }}
                >
                  <th className="pb-3 pr-3 font-medium">#</th>
                  <th className="pb-3 pr-3 font-medium">交易所</th>
                  <th className="pb-3 pr-3 font-medium">信任评分</th>
                  <th className="pb-3 pr-3 font-medium text-right">
                    24h 交易量 (BTC)
                  </th>
                  <th className="pb-3 pr-3 font-medium">国家</th>
                  <th className="pb-3 font-medium">成立年份</th>
                </tr>
              </thead>
              <tbody>
                {sortedExchanges.map((ex, idx) => (
                  <tr
                    key={ex.id}
                    className="transition-colors"
                    style={{
                      borderTop: `1px solid ${COLORS.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.03)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      className="py-3 pr-3 font-mono text-xs"
                      style={{ color: COLORS.muted }}
                    >
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-3">
                      <a
                        href={ex.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 hover:underline"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ex.image}
                          alt={ex.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span className="font-medium text-white">
                          {ex.name}
                        </span>
                      </a>
                    </td>
                    <td className="py-3 pr-3">
                      <TrustDots score={ex.trust_score} />
                    </td>
                    <td
                      className="py-3 pr-3 text-right font-mono text-xs"
                      style={{ color: COLORS.accent }}
                    >
                      {formatBtcVolume(ex.trade_volume_24h_btc)}
                    </td>
                    <td
                      className="py-3 pr-3 text-xs"
                      style={{ color: COLORS.muted }}
                    >
                      {ex.country || "N/A"}
                    </td>
                    <td
                      className="py-3 text-xs"
                      style={{ color: COLORS.muted }}
                    >
                      {ex.year_established || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2 : Historical Market Share                          */}
      {/* ============================================================ */}
      <div className="px-4 md:px-8 py-4">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: COLORS.muted }}
          >
            头部交易所市场份额演变{" "}
            <span
              className="text-[11px] font-normal"
              style={{ color: COLORS.accent }}
            >
              (半年/季度粒度)
            </span>
          </h2>

          {!historicalData ? (
            <ChartSkeleton height="h-96" />
          ) : (
            <div className="h-96">
              <MarketShareChart {...historicalData.exchangeShares} />
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 3 : CEX vs DEX Volume Panel                          */}
      {/* ============================================================ */}
      <div className="px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* DEX Stats + Top Protocols */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <h2
              className="text-sm font-semibold mb-5"
              style={{ color: COLORS.muted }}
            >
              DEX 概览{" "}
              <span
                className="text-[11px] font-normal"
                style={{ color: COLORS.purple }}
              >
                (DefiLlama)
              </span>
            </h2>

            {defiLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <StatSkeleton />
                  <StatSkeleton />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-8" />
                  ))}
                </div>
              </div>
            ) : defiData ? (
              <div>
                {/* KPI cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div
                      className="text-[11px] mb-1"
                      style={{ color: COLORS.muted }}
                    >
                      DEX 24h 总交易量
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: COLORS.purple }}
                    >
                      {formatUsdVolume(defiData.total24h)}
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div
                      className="text-[11px] mb-1"
                      style={{ color: COLORS.muted }}
                    >
                      DEX 7d 总交易量
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: COLORS.info }}
                    >
                      {formatUsdVolume(defiData.total7d)}
                    </div>
                  </div>
                </div>

                {/* Top 5 DEX protocols bar chart */}
                <h3
                  className="text-xs font-medium mb-3"
                  style={{ color: COLORS.muted }}
                >
                  Top 5 DEX 协议 (24h 交易量)
                </h3>
                <div className="space-y-2.5">
                  {topDexProtocols.map((protocol, i) => {
                    const pct = (protocol.total24h / maxDexVolume) * 100;
                    const barColors = [
                      COLORS.purple,
                      COLORS.info,
                      COLORS.success,
                      COLORS.accent,
                      COLORS.eth,
                    ];
                    const barColor = barColors[i % barColors.length];
                    return (
                      <div key={protocol.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white font-medium">
                            {protocol.name}
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{ color: barColor }}
                          >
                            {formatUsdVolume(protocol.total24h)}
                          </span>
                        </div>
                        <div
                          className="w-full h-2.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: COLORS.border }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: barColor,
                              opacity: 0.75,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className="text-center py-8 text-sm"
                style={{ color: COLORS.muted }}
              >
                数据加载失败
              </div>
            )}
          </div>

          {/* Volume Breakdown Chart (from static data) */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: COLORS.muted }}
            >
              交易量构成 (CEX / DEX / OTC){" "}
              <span
                className="text-[11px] font-normal"
                style={{ color: COLORS.accent }}
              >
                (月度历史)
              </span>
            </h2>

            {!historicalData ? (
              <ChartSkeleton height="h-80" />
            ) : (
              <div className="h-80">
                <VolumeBreakdownChart
                  labels={historicalData.labels}
                  cexVolume={historicalData.cexVolume}
                  dexVolume={historicalData.dexVolume}
                  otcVolume={historicalData.otcVolume}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 4 : DEX Ratio Trend                                  */}
      {/* ============================================================ */}
      <div className="px-4 md:px-8 py-4 pb-8">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: COLORS.muted }}
          >
            DEX 占总现货交易量比例趋势{" "}
            <span
              className="text-[11px] font-normal"
              style={{ color: COLORS.purple }}
            >
              (DEX / (CEX + DEX))
            </span>
          </h2>

          {!historicalData ? (
            <ChartSkeleton height="h-96" />
          ) : (
            <div className="h-96">
              <DexRatioChart
                labels={historicalData.labels}
                cexVolume={historicalData.cexVolume}
                dexVolume={historicalData.dexVolume}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
