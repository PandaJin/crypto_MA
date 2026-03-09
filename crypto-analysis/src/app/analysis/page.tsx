"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { useKline } from "@/hooks/useKline";
import {
  calculateRSI,
  calculateMACD,
  calculateBollinger,
} from "@/lib/indicators";
import { COLORS, THEME_VARS } from "@/lib/utils/constants";

const SYMBOLS = [
  { label: "BTC", value: "BTCUSDT" },
  { label: "ETH", value: "ETHUSDT" },
];

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const { data: klineData, isLoading, error } = useKline(symbol, "1d", 200);

  const closePrices = useMemo(() => {
    if (!klineData) return [];
    return klineData.map((k) => k.close);
  }, [klineData]);

  const timestamps = useMemo(() => {
    if (!klineData) return [];
    return klineData.map((k) => k.time);
  }, [klineData]);

  const rsiData = useMemo(() => {
    if (closePrices.length === 0) return [];
    const rsi = calculateRSI(closePrices, 14);
    return rsi.map((value, i) => ({
      date: formatDate(timestamps[i]),
      rsi: isNaN(value) ? null : parseFloat(value.toFixed(2)),
      overbought: 70,
      oversold: 30,
    }));
  }, [closePrices, timestamps]);

  const macdData = useMemo(() => {
    if (closePrices.length === 0) return [];
    const result = calculateMACD(closePrices, 12, 26, 9);
    return result.macd.map((_, i) => ({
      date: formatDate(timestamps[i]),
      macd: parseFloat(result.macd[i].toFixed(2)),
      signal: parseFloat(result.signal[i].toFixed(2)),
      histogram: parseFloat(result.histogram[i].toFixed(2)),
    }));
  }, [closePrices, timestamps]);

  const bollingerData = useMemo(() => {
    if (closePrices.length === 0) return [];
    const result = calculateBollinger(closePrices, 20, 2);
    return closePrices.map((price, i) => ({
      date: formatDate(timestamps[i]),
      price: parseFloat(price.toFixed(2)),
      upper: isNaN(result.upper[i])
        ? null
        : parseFloat(result.upper[i].toFixed(2)),
      middle: isNaN(result.middle[i])
        ? null
        : parseFloat(result.middle[i].toFixed(2)),
      lower: isNaN(result.lower[i])
        ? null
        : parseFloat(result.lower[i].toFixed(2)),
    }));
  }, [closePrices, timestamps]);

  const currentSymbolLabel = SYMBOLS.find((s) => s.value === symbol)?.label;

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">技术指标分析</h1>
          <p className="text-sm" style={{ color: THEME_VARS.muted }}>
            RSI / MACD / 布林带 / MVRV 多维度指标分析
          </p>
        </div>
        <div className="flex gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSymbol(s.value)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor:
                  symbol === s.value ? THEME_VARS.accent : THEME_VARS.card,
                color: symbol === s.value ? "var(--accent-foreground)" : THEME_VARS.muted,
                border: `1px solid ${symbol === s.value ? THEME_VARS.accent : THEME_VARS.border}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl p-6 animate-pulse"
              style={{
                backgroundColor: THEME_VARS.card,
                border: `1px solid ${THEME_VARS.border}`,
              }}
            >
              <div
                className="h-4 w-32 rounded mb-2"
                style={{ backgroundColor: THEME_VARS.border }}
              />
              <div
                className="h-3 w-48 rounded mb-6"
                style={{ backgroundColor: THEME_VARS.border }}
              />
              <div
                className="h-[250px] rounded"
                style={{ backgroundColor: THEME_VARS.border }}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: THEME_VARS.card,
            border: `1px solid ${THEME_VARS.border}`,
            color: COLORS.danger,
          }}
        >
          数据加载失败，请稍后重试
        </div>
      )}

      {!isLoading && !error && klineData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RSI Chart */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: THEME_VARS.card,
              border: `1px solid ${THEME_VARS.border}`,
            }}
          >
            <h2 className="text-base font-semibold mb-1">
              RSI 相对强弱指数
            </h2>
            <p className="text-xs mb-4" style={{ color: THEME_VARS.muted }}>
              衡量价格变动的速度和幅度，RSI &gt; 70 为超买区域，RSI &lt; 30
              为超卖区域
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={rsiData}>
                <defs>
                  <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={COLORS.danger}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="30%"
                      stopColor={COLORS.accent}
                      stopOpacity={0.05}
                    />
                    <stop
                      offset="70%"
                      stopColor={COLORS.accent}
                      stopOpacity={0.05}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.success}
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={THEME_VARS.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: THEME_VARS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: THEME_VARS.border }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: THEME_VARS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: THEME_VARS.border }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: THEME_VARS.background,
                    border: `1px solid ${THEME_VARS.border}`,
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: THEME_VARS.muted }}
                />
                <ReferenceLine
                  y={70}
                  stroke={COLORS.danger}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: "70 超买",
                    position: "right",
                    fill: COLORS.danger,
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={30}
                  stroke={COLORS.success}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: "30 超卖",
                    position: "right",
                    fill: COLORS.success,
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rsi"
                  stroke={COLORS.accent}
                  strokeWidth={2}
                  fill="url(#rsiGrad)"
                  dot={false}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* MACD Chart */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: THEME_VARS.card,
              border: `1px solid ${THEME_VARS.border}`,
            }}
          >
            <h2 className="text-base font-semibold mb-1">
              MACD 指数平滑异同移动平均线
            </h2>
            <p className="text-xs mb-4" style={{ color: THEME_VARS.muted }}>
              通过快慢均线差值判断趋势方向与动量变化，柱状图由正转负为卖出信号
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={macdData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={THEME_VARS.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: THEME_VARS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: THEME_VARS.border }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: THEME_VARS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: THEME_VARS.border }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: THEME_VARS.background,
                    border: `1px solid ${THEME_VARS.border}`,
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: THEME_VARS.muted }}
                />
                <Bar dataKey="histogram" name="柱状图" barSize={3}>
                  {macdData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.histogram >= 0 ? COLORS.success : COLORS.danger
                      }
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="macd"
                  name="MACD"
                  stroke={COLORS.info}
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="signal"
                  name="Signal"
                  stroke={COLORS.accent}
                  strokeWidth={1.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bollinger Bands */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: THEME_VARS.card,
              border: `1px solid ${THEME_VARS.border}`,
            }}
          >
            <h2 className="text-base font-semibold mb-1">
              布林带 Bollinger Bands
            </h2>
            <p className="text-xs mb-4" style={{ color: THEME_VARS.muted }}>
              基于标准差的价格通道，价格触及上轨可能回调，触及下轨可能反弹
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={bollingerData}>
                <defs>
                  <linearGradient
                    id="bollingerFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={COLORS.purple}
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.purple}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={THEME_VARS.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: THEME_VARS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: THEME_VARS.border }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: THEME_VARS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: THEME_VARS.border }}
                  width={60}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: THEME_VARS.background,
                    border: `1px solid ${THEME_VARS.border}`,
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: THEME_VARS.muted }}
                  formatter={(value) => Number(value).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  name="上轨"
                  stroke={COLORS.purple}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="url(#bollingerFill)"
                  connectNulls={false}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  name="下轨"
                  stroke={COLORS.purple}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill={THEME_VARS.card}
                  connectNulls={false}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="middle"
                  name="中轨"
                  stroke={COLORS.purple}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="价格"
                  stroke={
                    symbol === "BTCUSDT" ? COLORS.btc : COLORS.eth
                  }
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* MVRV Ratio */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: THEME_VARS.card,
              border: `1px solid ${THEME_VARS.border}`,
            }}
          >
            <h2 className="text-base font-semibold mb-1">
              MVRV 市值与实现价值比率
            </h2>
            <p className="text-xs mb-4" style={{ color: THEME_VARS.muted }}>
              衡量市场整体盈亏状态的链上指标，用于判断市场周期顶部与底部
            </p>
            <div className="space-y-4 mt-2">
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: THEME_VARS.background,
                  border: `1px solid ${THEME_VARS.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: THEME_VARS.muted }}
                  >
                    当前 {currentSymbolLabel} MVRV 估值
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: COLORS.accent }}
                  >
                    {symbol === "BTCUSDT" ? "2.14" : "1.87"}
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: THEME_VARS.border }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: symbol === "BTCUSDT" ? "53%" : "46%",
                      background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.accent})`,
                    }}
                  />
                </div>
                <div
                  className="flex justify-between text-xs mt-1"
                  style={{ color: THEME_VARS.muted }}
                >
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3.5</span>
                  <span>5+</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: COLORS.danger }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      MVRV &gt; 3.5 — 市场过热
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: THEME_VARS.muted }}
                    >
                      大部分持有者处于盈利状态，获利了结压力增大，历史上多次出现在周期顶部
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: COLORS.accent }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      MVRV 1 ~ 3.5 — 正常区间
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: THEME_VARS.muted }}
                    >
                      市场处于健康增长阶段，持有者整体盈利但未达极端水平
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: COLORS.success }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      MVRV &lt; 1 — 市场低估
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: THEME_VARS.muted }}
                    >
                      市场价值低于实现价值，大部分持有者处于亏损状态，历史上为较好的买入时机
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-3 text-xs"
                style={{
                  backgroundColor: `${COLORS.accent}10`,
                  border: `1px solid ${COLORS.accent}30`,
                  color: THEME_VARS.muted,
                }}
              >
                注：MVRV 数据为估算值，实际数据需接入 Glassnode
                等链上数据平台获取。该指标仅适用于 BTC 和 ETH
                等主流资产。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
