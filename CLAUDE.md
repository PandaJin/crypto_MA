# CryptoAnalysis - BTC/ETH 深度分析工具

## 项目概述

基于 Next.js 16 的加密货币分析 Web 应用，提供实时行情、历史数据、技术指标、交易所对比、事件预警、情景模拟等 6 大功能模块。暗色主题，面向专业分析场景。

**项目路径**: `crypto-analysis/` (Next.js 应用根目录)
**启动命令**: `cd crypto-analysis && npm run dev` → `localhost:3000`

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router, Turbopack) | 16.1.6 |
| UI | React + TypeScript | 19.2.3 |
| 样式 | Tailwind CSS v4 + CSS Variables | 4.x |
| 金融图表 | TradingView Lightweight Charts | **5.1.0** (v5 API) |
| 通用图表 | Recharts | 3.7.0 |
| 数据获取 | SWR (定时刷新) | 2.4.1 |
| 实时数据 | Binance WebSocket (原生) | - |
| 图标 | Lucide React | 0.576.0 |
| 工具 | clsx + tailwind-merge, date-fns, zod | - |

---

## 架构概览

```
crypto-analysis/
├── public/data/             ← 静态 JSON 数据 (历史价格、事件)
├── src/
│   ├── app/                 ← Next.js App Router 页面
│   │   ├── api/             ← 5 个 API 代理路由 (解决 CORS)
│   │   ├── page.tsx         ← Dashboard 首页
│   │   ├── market/          ← 实时行情
│   │   ├── analysis/        ← 技术指标
│   │   ├── exchanges/       ← 交易所对比
│   │   ├── events/          ← 事件预警
│   │   └── scenarios/       ← 情景模拟
│   ├── components/
│   │   ├── cards/           ← KpiCard, TickerCard, FearGreedGauge, ScenarioCard
│   │   ├── charts/          ← 7 个图表组件
│   │   ├── features/        ← EventTimeline
│   │   ├── layout/          ← Navbar, Footer
│   │   └── ui/              ← RangeSelector
│   ├── hooks/               ← 6 个自定义 hooks (SWR + WebSocket)
│   ├── lib/
│   │   ├── api/             ← fetcher, binance-ws (WebSocket 单例)
│   │   ├── indicators/      ← RSI, MACD, Bollinger Bands 计算
│   │   └── utils/           ← cn, constants (COLORS), format
│   └── types/               ← market.ts 类型定义
```

---

## 6 个页面功能

### 1. Dashboard `/` (page.tsx, 277行)
- 6 个 KPI 卡片 (BTC/ETH 价格、CEX/DEX 交易量、DEX 占比、MVRV)
- 时间范围选择器 (全部/2020/2023/2025)
- BTC 价格+交易量双轴图 (Lightweight Charts v5)，叠加事件标记
- ETH 价格走势、交易量构成、市场份额、DEX 占比、BTC/ETH 涨跌对比
- 关键拐点时间线 + 情景分析卡片 (悲观/基准/乐观)

### 2. 实时行情 `/market` (220行)
- Binance WebSocket 实时 Ticker 卡片 (8 个币种)
- K线蜡烛图 (Lightweight Charts v5)，支持切换币种和时间周期
- 恐惧贪婪指数 SVG 仪表盘
- 24h 市场概览统计

### 3. 技术指标 `/analysis` (595行)
- RSI (14周期) + 超买超卖区间标注
- MACD (12,26,9) + 信号线 + 柱状图
- 布林带 (20,2) + 价格走势
- MVRV 比率分析 (历史区间)
- 2x2 网格布局，基于历史 JSON 数据计算

### 4. 交易所对比 `/exchanges` (519行)
- Top 20 交易所排名表 (CoinGecko 实时数据)
- 信任评分可视化 (10 点圆点)
- 历史市场份额演变图 (Binance/Bybit/Coinbase/FTX/OKX)
- DEX 概览 (DefiLlama): 24h/7d 交易量 + Top 5 协议
- CEX/DEX/OTC 交易量构成 + DEX 占比趋势

### 5. 事件预警 `/events` (447行)
- 可搜索事件时间线 (29 个历史事件)
- 按类型 (利好/利空/中性) 和年份筛选
- 事件影响力分析柱状图
- 价格预警管理 (localStorage 持久化): 添加/删除预警

### 6. 情景模拟 `/scenarios` (284行)
- 6 个宏观参数滑块 (利率、监管、流动性、DeFi 采纳、矿工收益、地缘风险)
- 悲观/基准/乐观 预设一键填入
- 18 个月 BTC/ETH 价格投影图
- 8 个关键监测指标卡片

---

## 外部 API 集成

| API | 代理路由 | 数据 | 刷新间隔 |
|-----|---------|------|---------|
| CoinGecko | `/api/prices` | BTC/ETH 价格、24h 变化、市值 | 60s |
| Binance REST | `/api/kline` | K线数据 (多端点容错) | 30s |
| Binance WebSocket | 直连 `wss://stream.binance.com` | 实时 Ticker | 实时 |
| Alternative.me | `/api/fear-greed` | 恐惧贪婪指数 | 1h |
| CoinGecko | `/api/exchanges` | 交易所排名 (Top 20) | 5min |
| DefiLlama | `/api/defi` | DEX 总交易量 + 协议明细 | 5min |

**注意**: Binance API 在中国大陆被封锁，K线路由使用 `data-api.binance.vision` 作为首选 fallback。

---

## 关键开发注意事项

### Lightweight Charts v5 API (重要)
v5 与 v4 API 完全不同：
```typescript
// v5 正确用法
import { createChart, LineSeries, HistogramSeries, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
const series = chart.addSeries(LineSeries, { color: "#f7931a" });
const markers = createSeriesMarkers(series, markerArray); // 不是 series.setMarkers()
markers.detach(); // 清理

// v5 marker shape 只支持: "circle" | "square" | "arrowUp" | "arrowDown"
// 不支持 "diamond"
```

### Tailwind CSS v4
使用 `@import "tailwindcss"` + `@theme inline {}` 语法定义 CSS 变量主题色。`globals.css` 中定义了 12 个主题色变量。

### 暗色主题
整个应用使用深色背景 (`#0a0e17`)，所有组件通过 `COLORS` 常量和 CSS 变量保持一致。

### WebSocket 重连
`binance-ws.ts` 实现了指数退避重连 (最多 5 次)，使用两个 WebSocket 端点轮替。

### 数据文件
- `public/data/historical-btc-eth.json`: 98 个月数据 (2018-01 到 2026-02)，含 BTC/ETH 价格、CEX/DEX/OTC 交易量、交易所市场份额
- `public/data/events.json`: 29 个关键加密事件，含日期、类型、描述、当时价格

---

## 已知限制

1. 交易所数据中 `trade_volume_24h_btc_normalized` 字段在 CoinGecko 免费 API 中不可用（已从 UI 移除）
2. Binance WebSocket 在中国大陆需要网络代理才能连接
3. 历史数据为静态 JSON，不会自动更新
4. MVRV 比率为硬编码静态值，需要 Glassnode 等链上数据 API 才能实时获取
5. 技术指标基于月度数据计算，非日线级别
