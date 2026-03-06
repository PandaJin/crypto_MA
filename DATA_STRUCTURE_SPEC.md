# CryptoAnalysis — 数据结构规范与填充任务说明

> **文档用途**：本文档供协作 Claude 实例（或任何数据编辑者）参考，按规范格式调研、整理并输出加密货币行业数据，以便直接导入 CryptoAnalysis 分析工具。

---

## 一、项目背景

CryptoAnalysis 是一个 BTC/ETH 深度分析 Web 应用，包含以下核心数据文件：

| 文件路径 | 内容 |
|----------|------|
| `public/data/events.json` | 关键市场事件时间线（已有 39 条） |
| `public/data/historical-btc-eth.json` | 月度历史行情与交易量（2018-01 至今） |
| `public/data/exchange-profiles.json` | **【待填充】** 主要交易所/企业档案 |

---

## 二、已有数据结构（参考用）

### 2.1 加密事件 `CryptoEvent`

```typescript
interface CryptoEvent {
  date: string;          // 格式 "YYYY-MM"，如 "2024-01"
  displayDate: string;   // 格式 "YYYY.MM"，如 "2024.01"
  type: "bull" | "bear" | "neutral";
  description: string;   // 中文简述，≤25字
  priceTag: string;      // 如 "BTC $42,585" 或 "ETH $2,234"
  coin: "BTC" | "ETH";
  priceAtEvent: number;  // 当月 USD 均价（整数）
  sourceUrl?: string;    // 原始报道链接
  source?: string;       // 来源媒体名，如 "Reuters"
}
```

**示例**
```json
{
  "date": "2024-01",
  "displayDate": "2024.01",
  "type": "bull",
  "description": "美SEC批准首批BTC现货ETF",
  "priceTag": "BTC $42,585",
  "coin": "BTC",
  "priceAtEvent": 42585,
  "sourceUrl": "https://www.reuters.com/technology/sec-approves-bitcoin-etfs-2024-01-10/",
  "source": "Reuters"
}
```

---

### 2.2 历史行情 `HistoricalData`（月度数组，按时间顺序）

```typescript
interface HistoricalData {
  metadata: {
    startDate: string;   // "2018-01"
    endDate: string;     // "2026-02"
    months: number;      // 当前 98
    sources: string[];   // 数据来源列表
  };
  labels: string[];            // 月份标签 ["2018-01", "2018-02", ...]
  btcPrices: number[];         // BTC 月均价 (USD)
  ethPrices: number[];         // ETH 月均价 (USD)
  cexVolume: number[];         // CEX 月交易量 (亿 USD)
  dexVolume: (number|null)[];  // DEX 月交易量 (亿 USD)，2020年前为 null
  otcVolume: (number|null)[];  // OTC 月交易量 (亿 USD)，2024年前大部分为 null
  exchangeShares: {
    labels: string[];          // 时间区间，如 "2024Q1"
    binance: number[];         // Binance 市场份额 (%)
    coinbase: number[];
    ftx: number[];
    okx: number[];
    bybit: number[];
    others: number[];
  };
}
```

---

## 三、待填充结构：交易所/企业档案 `ExchangeProfile`

> **任务**：请为下列每家企业，按照以下数据结构，调研并填充完整信息，以 JSON 格式输出。

### 3.1 数据结构定义

```typescript
interface ExchangeProfile {
  // ── 基本信息 ──────────────────────────────────────────────
  id: string;              // 唯一标识，小写英文，如 "binance"
  name: string;            // 正式名称，如 "Binance"
  nameZh: string;          // 中文名，如 "币安"
  type: "cex" | "dex" | "hybrid" | "infrastructure";
  founded: string;         // 成立年份，如 "2017"
  headquarters: string;    // 注册/实际总部，如 "Cayman Islands"
  website: string;         // 官网 URL

  // ── 创始与团队 ────────────────────────────────────────────
  founders: string[];      // 创始人姓名列表
  ceo: string;             // 现任 CEO（若不公开填 "Anonymous"）
  employees: string;       // 员工规模，如 "~6,000" 或 "200-500"

  // ── 业务架构 ──────────────────────────────────────────────
  products: string[];      // 主要产品线，如 ["现货交易", "合约交易", "Launchpad", "质押"]
  nativeToken: string | null;   // 原生代币，如 "BNB"，无则 null
  blockchains: string[];   // 自研/支持的主要公链，如 ["BNB Chain"]，纯 CEX 填 []

  // ── 市场数据（最新可查数据，注明年份/来源） ───────────────
  metrics: {
    dailyVolume: string;       // 日交易量，如 "~$15B (2024)"
    registeredUsers: string;   // 注册用户，如 "~2.3亿 (2024)"
    marketShareCEX: string;    // CEX 市场份额，如 "~35% (2025Q1)"
    valuation: string;         // 估值/市值，如 "Private / ~$300B FDV for BNB"
    revenueModel: string;      // 收入模式简述，如 "交易手续费 + 上币费 + BNB销毁"
  };

  // ── 监管与合规 ────────────────────────────────────────────
  regulation: {
    licenses: string[];        // 持有牌照，如 ["VASP (Bahrain)", "DASP (France)"]
    sanctions: string[];       // 曾受处罚，如 ["2023 CFTC $2.7B罚款"]，无则 []
    restricted: string[];      // 被限制地区，如 ["美国", "中国大陆"]
  };

  // ── 关键历史里程碑 ─────────────────────────────────────────
  milestones: Array<{
    year: string;              // 如 "2017"
    event: string;             // 中文简述，≤30字
  }>;

  // ── 风险评估 ──────────────────────────────────────────────
  riskProfile: {
    trustScore: number;        // 信任评分 1-10（参考 CoinGecko / 公开评级）
    centralisation: "high" | "medium" | "low";  // 中心化程度
    auditStatus: string;       // 审计状态，如 "Proof of Reserves by Mazars (2023)"
    majorRisks: string[];      // 主要风险点列表，≤3条
  };

  // ── 元数据 ────────────────────────────────────────────────
  lastUpdated: string;         // 数据最后更新日期，如 "2025-03"
  sources: string[];           // 信息来源，如 ["CoinGecko", "Bloomberg", "官网"]
}
```

---

### 3.2 需要填充的企业列表

请依次为以下 **10 家企业** 填充数据：

| 序号 | 企业 | 类型 | 优先级 |
|------|------|------|--------|
| 1 | **Binance** | CEX | ⭐⭐⭐ 最高 |
| 2 | **Coinbase** | CEX | ⭐⭐⭐ 最高 |
| 3 | **OKX** | CEX | ⭐⭐⭐ 最高 |
| 4 | **Bybit** | CEX | ⭐⭐ 高 |
| 5 | **Kraken** | CEX | ⭐⭐ 高 |
| 6 | **Uniswap** | DEX | ⭐⭐ 高 |
| 7 | **Bitfinex** | CEX | ⭐ 中 |
| 8 | **Gate.io** | CEX | ⭐ 中 |
| 9 | **dYdX** | DEX (hybrid) | ⭐ 中 |
| 10 | **FTX (已倒闭)** | CEX | ⭐ 中（历史参考） |

---

### 3.3 输出格式要求

请将所有企业数据合并为一个 **JSON 数组**输出，格式如下：

```json
[
  {
    "id": "binance",
    "name": "Binance",
    "nameZh": "币安",
    ...
  },
  {
    "id": "coinbase",
    ...
  }
]
```

**注意事项：**
1. 数据需尽量准确，不确定的字段请注明 `"数据待核实"` 而非编造
2. `metrics` 字段中的数字请注明数据年份，如 `"~$15B (2024Q4)"`
3. `milestones` 每家企业列出 **5-8 条**最重要的里程碑事件
4. `regulation.sanctions` 只列已公开的正式处罚，不包括传言
5. 中文描述保持简洁专业，英文名称保持原文

---

## 四、回传后的处理说明

填充完成后，将 JSON 数组回传给主 Claude 实例（本项目负责人），将会：
1. 校验数据格式是否符合 `ExchangeProfile` 结构
2. 写入 `public/data/exchange-profiles.json`
3. 在交易所对比页（`/exchanges`）渲染为详情卡片
4. 补充交易所历史份额数据（如有缺失）

---

## 五、字段枚举参考

### type 枚举
| 值 | 含义 |
|----|------|
| `"cex"` | 中心化交易所 |
| `"dex"` | 去中心化交易所 |
| `"hybrid"` | 混合型（如既有 CEX 又有 DEX 产品） |
| `"infrastructure"` | 基础设施提供商 |

### centralisation 枚举
| 值 | 含义 |
|----|------|
| `"high"` | 高度中心化（用户资产完全由平台托管） |
| `"medium"` | 中等（部分去中心化机制） |
| `"low"` | 低（非托管、链上结算为主） |

---

## 六、完整填充示例（Binance 参考）

```json
{
  "id": "binance",
  "name": "Binance",
  "nameZh": "币安",
  "type": "cex",
  "founded": "2017",
  "headquarters": "Cayman Islands (注册) / 无固定总部",
  "website": "https://www.binance.com",

  "founders": ["赵长鹏 (CZ)", "何一 (Yi He)"],
  "ceo": "Richard Teng",
  "employees": "~6,000",

  "products": ["现货交易", "合约与期权", "理财产品", "Launchpad", "BNB Chain生态", "Web3钱包", "NFT市场"],
  "nativeToken": "BNB",
  "blockchains": ["BNB Chain (BSC)", "opBNB"],

  "metrics": {
    "dailyVolume": "~$15-25B (2024)",
    "registeredUsers": "~2.3亿 (2024)",
    "marketShareCEX": "~35-40% (2024Q4)",
    "valuation": "私有未上市 / BNB FDV ~$900亿 (2025.03)",
    "revenueModel": "交易手续费(0.1%) + 上币费 + BNB季度销毁 + 理财产品利差"
  },

  "regulation": {
    "licenses": [
      "VASP (Bahrain, 2022)",
      "DASP (France, 2023)",
      "OVA (Dubai, 2023)",
      "FSP (New Zealand)"
    ],
    "sanctions": [
      "2023年11月 美国DOJ/CFTC 罚款 $43亿，CZ认罪辞职",
      "2023年 SEC 起诉未注册证券交易"
    ],
    "restricted": ["美国 (退出美国市场)", "中国大陆", "伊朗", "朝鲜"]
  },

  "milestones": [
    {"year": "2017", "event": "在香港成立，ICO融资1500万美元"},
    {"year": "2018", "event": "成为全球最大CEX，迁址马耳他"},
    {"year": "2019", "event": "发布BNB Chain (BSC前身)"},
    {"year": "2020", "event": "BSC主网上线，DeFi爆发推动用户激增"},
    {"year": "2021", "event": "日交易量峰值突破$760亿"},
    {"year": "2022", "event": "FTX危机后市场份额进一步扩大至65%+"},
    {"year": "2023", "event": "认缴$43亿罚款，CZ辞任CEO，Richard Teng接任"},
    {"year": "2025", "event": "市场份额回落至35%，监管合规持续推进"}
  ],

  "riskProfile": {
    "trustScore": 7,
    "centralisation": "high",
    "auditStatus": "Proof of Reserves by Mazars (2022, 后停止合作) / 内部审计持续中",
    "majorRisks": [
      "美国监管持续压力，用户资产托管风险",
      "CZ离任后管理层稳定性存疑",
      "市场份额持续下滑"
    ]
  },

  "lastUpdated": "2025-03",
  "sources": ["CoinGecko", "Bloomberg", "Reuters", "Binance官网", "DOJ公告"]
}
```

---

*本文档生成于 2026-03-05，由 CryptoAnalysis 主实例维护。如有字段不明确，请以本文档定义为准。*
