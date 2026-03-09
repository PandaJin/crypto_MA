"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp, Plus, RefreshCw, Brain } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CryptoEvent } from "@/types/market";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { COLORS, THEME_VARS } from "@/lib/utils/constants";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type FilterType = "all" | "bull" | "bear";
type FilterYear = "all" | string;

interface Alert {
  id: string;
  coin: string;
  condition: "above" | "below";
  price: number;
  active: boolean;
  createdAt: string;
}

interface DiscoverStats {
  fetched: number;
  uniqueAfterDedup?: number;
  classified: number;
  aboveThreshold: number;
  returned: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<CryptoEvent[]>([]);
  const { data: historicalData } = useHistoricalData();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterYear, setFilterYear] = useState<FilterYear>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CryptoEvent | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState<{ coin: string; condition: "above" | "below"; price: number }>({ coin: "BTC", condition: "above", price: 0 });

  // AI event analysis (right panel) — structured result
  interface AnalysisResult {
    background: string;
    signal: string;
    pathway: string;
    duration: string;
    strength: number; // 1-5
  }
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisCache] = useState<Map<string, AnalysisResult>>(new Map());

  // AI Discover panel state
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [minSignificance, setMinSignificance] = useState(7);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [candidates, setCandidates] = useState<CryptoEvent[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [discoverStats, setDiscoverStats] = useState<DiscoverStats | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/events.json").then((r) => r.json()).then(setEvents);
    const saved = localStorage.getItem("crypto-alerts");
    if (saved) setAlerts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("crypto-alerts", JSON.stringify(alerts));
  }, [alerts]);

  const years = useMemo(() => {
    const set = new Set(events.map((e) => e.date.slice(0, 4)));
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (filterType !== "all" && e.type !== filterType) return false;
        if (filterYear !== "all" && !e.date.startsWith(filterYear)) return false;
        if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [events, filterType, filterYear, searchQuery]);

  // Impact analysis
  const impactData = useMemo(() => {
    if (!selectedEvent || !historicalData) return null;
    const idx = historicalData.labels.indexOf(selectedEvent.date);
    if (idx === -1) return null;
    const start = Math.max(0, idx - 3);
    const end = Math.min(historicalData.labels.length, idx + 4);
    const data = [];
    for (let i = start; i < end; i++) {
      data.push({ date: historicalData.labels[i], price: historicalData.btcPrices[i], isEvent: i === idx });
    }
    const preBefore = idx > 0 ? historicalData.btcPrices[idx - 1] : null;
    const priceAt = historicalData.btcPrices[idx];
    const priceAfter1 = idx + 1 < historicalData.btcPrices.length ? historicalData.btcPrices[idx + 1] : null;
    const priceAfter3 = idx + 3 < historicalData.btcPrices.length ? historicalData.btcPrices[idx + 3] : null;
    return {
      data, priceAt,
      changeBefore: preBefore ? ((priceAt - preBefore) / preBefore * 100) : null,
      changeAfter1: priceAfter1 ? ((priceAfter1 - priceAt) / priceAt * 100) : null,
      changeAfter3: priceAfter3 ? ((priceAfter3 - priceAt) / priceAt * 100) : null,
    };
  }, [selectedEvent, historicalData]);

  // Fetch AI analysis for a selected event
  const fetchAnalysis = async (event: CryptoEvent) => {
    const key = `${event.date}::${event.description}`;
    if (analysisCache.has(key)) {
      setAnalysis(analysisCache.get(key)!);
      return;
    }
    setAnalysis(null);
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/events/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      analysisCache.set(key, data.analysis);
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysis({ background: "⚠ 分析生成失败：" + (err instanceof Error ? err.message : String(err)), signal: "", pathway: "", duration: "", strength: 0 });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const addAlert = () => {
    if (newAlert.price <= 0) return;
    setAlerts((prev) => [...prev, { id: Date.now().toString(), ...newAlert, active: true, createdAt: new Date().toISOString() }]);
    setNewAlert({ coin: "BTC", condition: "above", price: 0 });
  };

  const removeAlert = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const toggleAlert = (id: string) => setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));

  // AI Discover
  const handleDiscover = async () => {
    setDiscoverLoading(true);
    setDiscoverError(null);
    setCandidates([]);
    setSelectedIdx(new Set());
    setCommitMsg(null);
    setDiscoverStats(null);
    try {
      const res = await fetch("/api/events/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minSignificance }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCandidates(data.discovered ?? []);
      setDiscoverStats(data.stats ?? null);
      // Auto-select all by default
      setSelectedIdx(new Set((data.discovered ?? []).map((_: CryptoEvent, i: number) => i)));
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleCommit = async () => {
    const toCommit = candidates.filter((_, i) => selectedIdx.has(i));
    if (toCommit.length === 0) return;
    setCommitLoading(true);
    setCommitMsg(null);
    try {
      const res = await fetch("/api/events/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: toCommit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCommitMsg(`✓ 成功写入 ${data.added} 个事件，共 ${data.total} 个（${data.message ?? ""}）`);
      // Reload events list
      const updated = await fetch("/data/events.json").then((r) => r.json());
      setEvents(updated);
      // Remove committed from candidates
      setCandidates((prev) => prev.filter((_, i) => !selectedIdx.has(i)));
      setSelectedIdx(new Set());
    } catch (err) {
      setCommitMsg(`✗ 写入失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCommitLoading(false);
    }
  };

  const toggleCandidate = (i: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const sigLabel = (s: number) => {
    if (s >= 9) return "极重大 (9+)";
    if (s >= 8) return "非常重要 (8+)";
    if (s >= 7) return "重要 (7+)";
    return "普通 (6+)";
  };

  return (
    <div className="px-4 md:px-8 py-6 flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      <div className="flex items-start justify-between flex-shrink-0 mb-4">
        <div>
          <h1 className="text-xl font-bold">事件与预警</h1>
          <p className="text-muted text-sm mt-1">
            {events.length} 个关键事件时间线 · 影响分析 · 价格预警管理
          </p>
        </div>
        {/* AI Discover trigger button */}
        <button
          onClick={() => { setDiscoverOpen((v) => !v); setCommitMsg(null); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
            discoverOpen
              ? "bg-accent/10 border-accent text-accent"
              : "bg-card border-border hover:border-accent/50 hover:text-accent"
          )}
        >
          <Sparkles className="w-4 h-4" />
          AI 发现新事件
          {discoverOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* AI Discover Panel */}
      {discoverOpen && (
        <div className="bg-card border border-accent/20 rounded-xl p-5 space-y-4 flex-shrink-0 mb-4 max-h-[42vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">AI 自动发现最新加密事件</h3>
            <span className="text-xs text-muted ml-auto">
              数据源：CoinTelegraph · Decrypt · Qwen 智能分类
            </span>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted">重要性阈值</label>
                <span className="text-xs font-medium text-accent">{sigLabel(minSignificance)}</span>
              </div>
              <input
                type="range"
                min={6}
                max={9}
                step={1}
                value={minSignificance}
                onChange={(e) => setMinSignificance(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted mt-0.5">
                <span>普通 (6)</span>
                <span>重要 (7)</span>
                <span>非常 (8)</span>
                <span>极重大 (9)</span>
              </div>
            </div>
            <button
              onClick={handleDiscover}
              disabled={discoverLoading}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                discoverLoading
                  ? "bg-accent/30 text-accent/50 cursor-not-allowed"
                  : "bg-accent text-black hover:bg-accent/80"
              )}
            >
              {discoverLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />分析中… (~80s)</>
              ) : (
                <><RefreshCw className="w-4 h-4" />开始发现</>
              )}
            </button>
          </div>

          {/* Error */}
          {discoverError && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-xs p-3 rounded-lg">
              ✗ {discoverError}
            </div>
          )}

          {/* Stats bar */}
          {discoverStats && (
            <div className="flex flex-wrap gap-4 text-xs text-muted bg-bg rounded-lg px-4 py-2.5">
              <span>抓取 <strong className="text-foreground">{discoverStats.fetched}</strong> 篇</span>
              {discoverStats.uniqueAfterDedup != null && (
                <span>去重后 <strong className="text-foreground">{discoverStats.uniqueAfterDedup}</strong> 篇</span>
              )}
              <span>AI分类 <strong className="text-foreground">{discoverStats.classified}</strong> 篇</span>
              <span>高于阈值 <strong className="text-accent">{discoverStats.aboveThreshold}</strong> 篇</span>
              <span>候选事件 <strong className="text-accent">{discoverStats.returned}</strong> 个</span>
            </div>
          )}

          {/* Candidate events */}
          {candidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">已勾选 {selectedIdx.size}/{candidates.length} 个事件将写入</span>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSelectedIdx(new Set(candidates.map((_, i) => i)))} className="text-accent hover:underline">全选</button>
                  <span className="text-border">|</span>
                  <button onClick={() => setSelectedIdx(new Set())} className="text-muted hover:text-foreground hover:underline">全不选</button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {candidates.map((ev, i) => (
                  <div
                    key={i}
                    onClick={() => toggleCandidate(i)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedIdx.has(i)
                        ? "border-accent/40 bg-accent/5"
                        : "border-border bg-bg/50 opacity-60 hover:opacity-80"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all",
                      selectedIdx.has(i) ? "border-accent bg-accent" : "border-border"
                    )}>
                      {selectedIdx.has(i) && <CheckCircle2 className="w-3 h-3 text-black" />}
                    </div>

                    {/* Type dot */}
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0",
                      ev.type === "bull" ? "bg-success" : ev.type === "bear" ? "bg-danger" : "bg-muted"
                    )} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-accent">{ev.displayDate}</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          ev.type === "bull" ? "bg-success/10 text-success" : ev.type === "bear" ? "bg-danger/10 text-danger" : "bg-muted/10 text-muted"
                        )}>
                          {ev.type === "bull" ? "利好" : ev.type === "bear" ? "利空" : "中性"}
                        </span>
                        <span className="text-[10px] text-muted bg-border/30 px-1.5 py-0.5 rounded">{ev.coin}</span>
                      </div>
                      <div className="text-sm font-medium mt-1">{ev.description}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted font-mono">{ev.priceTag}</span>
                        {ev.sourceUrl && (
                          <a
                            href={ev.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-info hover:underline"
                          >
                            {ev.source} ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Commit button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleCommit}
                  disabled={commitLoading || selectedIdx.size === 0}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                    commitLoading || selectedIdx.size === 0
                      ? "bg-border/50 text-muted cursor-not-allowed"
                      : "bg-success text-black hover:bg-success/80"
                  )}
                >
                  {commitLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />写入中…</>
                  ) : (
                    <><Plus className="w-4 h-4" />写入选中事件 ({selectedIdx.size})</>
                  )}
                </button>

                {commitMsg && (
                  <span className={cn(
                    "text-xs",
                    commitMsg.startsWith("✓") ? "text-success" : "text-danger"
                  )}>
                    {commitMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Empty state after discover */}
          {!discoverLoading && discoverStats && candidates.length === 0 && !discoverError && (
            <div className="text-center text-xs text-muted py-6">
              没有发现达到重要性阈值的新事件，可以降低阈值后重新搜索
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left: Event Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Filters */}
          <div className="bg-card border border-border rounded-xl p-4 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="搜索事件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bg border border-border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-accent"
              />
              <div className="flex gap-1">
                {(["all", "bull", "bear"] as FilterType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg transition-colors",
                      filterType === t
                        ? "bg-accent text-black font-medium"
                        : "bg-border/50 text-muted hover:text-foreground"
                    )}
                  >
                    {t === "all" ? "全部" : t === "bull" ? "利好" : "利空"}
                  </button>
                ))}
              </div>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-bg border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="all">全部年份</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted mt-2">
              共 {filteredEvents.length} 个事件
            </div>
          </div>

          {/* Event list */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {filteredEvents.map((event, i) => (
              <div
                key={i}
                onClick={() => { setSelectedEvent(event); fetchAnalysis(event); }}
                className={cn(
                  "flex gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                  selectedEvent?.date === event.date && selectedEvent?.description === event.description
                    ? "border-accent bg-accent/5"
                    : "border-border bg-card hover:border-accent/30"
                )}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full mt-1 flex-shrink-0",
                  event.type === "bull" && "bg-success",
                  event.type === "bear" && "bg-danger"
                )} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent">{event.displayDate}</span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded",
                      event.type === "bull" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                      {event.type === "bull" ? "利好" : "利空"}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{event.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted">{event.priceTag}</span>
                    {event.sourceUrl && (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-info hover:text-info/80 hover:underline transition-colors"
                      >
                        {event.source || "来源"} ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Impact Analysis + Alerts */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Impact Analysis */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Panel header */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-medium">事件影响分析</h3>
            </div>

            {selectedEvent ? (
              <div className="divide-y divide-border/60">

                {/* ── Section 1: Event identity ── */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-accent tracking-wide">{selectedEvent.displayDate}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        selectedEvent.type === "bull"
                          ? "bg-success/15 text-success"
                          : selectedEvent.type === "bear"
                          ? "bg-danger/15 text-danger"
                          : "bg-muted/15 text-muted"
                      )}>
                        {selectedEvent.type === "bull" ? "▲ 利好" : selectedEvent.type === "bear" ? "▼ 利空" : "● 中性"}
                      </span>
                      <span className="text-[10px] text-muted bg-border/40 px-1.5 py-0.5 rounded">{selectedEvent.coin}</span>
                    </div>
                    {selectedEvent.sourceUrl && (
                      <a href={selectedEvent.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-info hover:underline flex-shrink-0">
                        来源 ↗
                      </a>
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-2 leading-snug">{selectedEvent.description}</p>
                  <p className="text-xs text-muted font-mono mt-1">{selectedEvent.priceTag}</p>
                </div>

                {/* ── Section 2: AI structured analysis ── */}
                <div className="px-4 py-3 space-y-3">
                  {/* Section title */}
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">AI 逻辑分析</span>
                    {analysisLoading && <Loader2 className="w-3 h-3 animate-spin text-muted ml-1" />}

                    {/* Signal strength stars */}
                    {analysisLoading ? (
                      <div className="ml-auto flex items-center gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <div key={s} className="w-3 h-3 bg-border/40 rounded-sm animate-pulse" />
                        ))}
                      </div>
                    ) : analysis && analysis.strength > 0 ? (
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-[10px] text-muted">信号强度</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const filled = s <= analysis.strength;
                            // Gradient: leftmost filled star is lightest (0.25 base),
                            // rightmost filled star is fully opaque (1.0).
                            const opacity = filled
                              ? 0.25 + (s / analysis.strength) * 0.75
                              : 1;
                            return (
                              <span
                                key={s}
                                style={filled ? { opacity } : undefined}
                                className={cn(
                                  "text-sm leading-none",
                                  filled
                                    ? selectedEvent.type === "bull"
                                      ? "text-success"
                                      : selectedEvent.type === "bear"
                                      ? "text-danger"
                                      : "text-accent"
                                    : "text-border"
                                )}
                              >
                                {filled ? "★" : "☆"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {analysisLoading ? (
                    /* Skeleton loader */
                    <div className="space-y-3">
                      {[100, 90, 95, 80].map((w, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="h-2 bg-border/50 rounded animate-pulse w-16" />
                          <div className={`h-2.5 bg-border/40 rounded animate-pulse`} style={{ width: `${w}%` }} />
                          <div className="h-2.5 bg-border/40 rounded animate-pulse w-[70%]" />
                        </div>
                      ))}
                    </div>
                  ) : analysis ? (
                    <div className="space-y-3">
                      {/* 事件背景 */}
                      {analysis.background && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">事件背景</span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/85">{analysis.background}</p>
                        </div>
                      )}
                      {/* 信号机制 */}
                      {analysis.signal && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider",
                              selectedEvent.type === "bull" ? "text-success" : selectedEvent.type === "bear" ? "text-danger" : "text-muted"
                            )}>
                              {selectedEvent.type === "bull" ? "▲ 利好机制" : selectedEvent.type === "bear" ? "▼ 利空机制" : "信号机制"}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/85">{analysis.signal}</p>
                        </div>
                      )}
                      {/* 影响路径 */}
                      {analysis.pathway && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">影响路径</span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/85 font-mono text-[11px]">{analysis.pathway}</p>
                        </div>
                      )}
                      {/* 持续性 */}
                      {analysis.duration && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">持续性评估</span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/75 italic">{analysis.duration}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">正在生成分析…</p>
                  )}
                </div>

                {/* ── Section 3: Price chart ── */}
                {impactData ? (
                  <div className="px-4 py-3 space-y-3">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">价格走势（前后各3个月）</span>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={impactData.data}>
                          <defs>
                            <linearGradient id="impactGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={THEME_VARS.border} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: THEME_VARS.muted }} />
                          <YAxis tick={{ fontSize: 9, fill: THEME_VARS.muted }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: THEME_VARS.background, border: `1px solid ${THEME_VARS.border}`, borderRadius: 8, fontSize: 11 }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, "价格"]}
                          />
                          <ReferenceLine x={selectedEvent.date} stroke={COLORS.accent} strokeDasharray="3 3" label={{ value: "事件", fill: COLORS.accent, fontSize: 9 }} />
                          <Area type="monotone" dataKey="price" stroke={COLORS.accent} fill="url(#impactGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ── Section 4: Stats row ── */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-bg rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-muted mb-1">事件当月</div>
                        <div className="text-sm font-mono font-semibold">${impactData.priceAt.toLocaleString()}</div>
                      </div>
                      <div className="bg-bg rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-muted mb-1">1个月后</div>
                        <div className={cn("text-sm font-mono font-semibold", (impactData.changeAfter1 ?? 0) >= 0 ? "text-success" : "text-danger")}>
                          {impactData.changeAfter1 !== null
                            ? `${impactData.changeAfter1 >= 0 ? "+" : ""}${impactData.changeAfter1.toFixed(1)}%`
                            : <span className="text-muted text-xs">N/A</span>}
                        </div>
                      </div>
                      <div className="bg-bg rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-muted mb-1">3个月后</div>
                        <div className={cn("text-sm font-mono font-semibold", (impactData.changeAfter3 ?? 0) >= 0 ? "text-success" : "text-danger")}>
                          {impactData.changeAfter3 !== null
                            ? `${impactData.changeAfter3 >= 0 ? "+" : ""}${impactData.changeAfter3.toFixed(1)}%`
                            : <span className="text-muted text-xs">N/A</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <div className="text-[10px] text-muted text-center py-3 bg-bg rounded-lg">
                      该事件超出历史数据范围，暂无价格走势图
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="px-4 py-12 text-xs text-muted text-center">
                点击左侧事件查看影响分析
              </div>
            )}
          </div>

          {/* Price Alerts */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">价格预警</h3>
            <div className="flex gap-2 mb-3">
              <select
                value={newAlert.coin}
                onChange={(e) => setNewAlert({ ...newAlert, coin: e.target.value })}
                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
              <select
                value={newAlert.condition}
                onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as "above" | "below" })}
                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
              >
                <option value="above">高于</option>
                <option value="below">低于</option>
              </select>
              <input
                type="number"
                placeholder="价格"
                value={newAlert.price || ""}
                onChange={(e) => setNewAlert({ ...newAlert, price: parseFloat(e.target.value) || 0 })}
                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none focus:border-accent font-mono"
              />
              <button onClick={addAlert} className="bg-accent text-black px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors">
                添加
              </button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-xs text-muted text-center py-4">暂无预警，添加一个价格预警开始监控</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border text-xs",
                      alert.active ? "border-border bg-bg" : "border-border/50 bg-bg/50 opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAlert(alert.id)} className={cn("w-8 h-4 rounded-full transition-colors relative", alert.active ? "bg-success" : "bg-border")}>
                        <span className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", alert.active ? "left-4" : "left-0.5")} />
                      </button>
                      <span className="font-medium">{alert.coin}</span>
                      <span className="text-muted">{alert.condition === "above" ? "高于" : "低于"}</span>
                      <span className="font-mono">${alert.price.toLocaleString()}</span>
                    </div>
                    <button onClick={() => removeAlert(alert.id)} className="text-muted hover:text-danger transition-colors">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted space-y-2">
            <div className="flex justify-between">
              <span>利好事件</span>
              <span className="text-success font-mono">{events.filter((e) => e.type === "bull").length}</span>
            </div>
            <div className="flex justify-between">
              <span>利空事件</span>
              <span className="text-danger font-mono">{events.filter((e) => e.type === "bear").length}</span>
            </div>
            <div className="flex justify-between">
              <span>时间跨度</span>
              <span className="font-mono">
                {events.length > 0 ? `${events[0]?.date.slice(0, 4)}-${events[events.length - 1]?.date.slice(0, 4)}` : "..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span>活跃预警</span>
              <span className="text-accent font-mono">{alerts.filter((a) => a.active).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
