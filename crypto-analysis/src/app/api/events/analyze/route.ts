/**
 * POST /api/events/analyze
 *
 * Given a crypto event, ask Qwen to return a structured analysis
 * with 4 dimensions: background, signal mechanism, price pathway, duration.
 *
 * Body:    { event: CryptoEvent }
 * Returns: { analysis: AnalysisResult }
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { CryptoEvent } from "@/types/market";

export interface AnalysisResult {
  background: string; // 事件背景：1-2句
  signal: string;     // 信号机制：为何是利好/利空
  pathway: string;    // 影响路径：传导链条
  duration: string;   // 持续性：时间维度与主要风险
  strength: number;   // 信号强度：1-5整数（5最强）
}

/* ------------------------------------------------------------------ */
/*  In-memory cache (key = date + description)                        */
/* ------------------------------------------------------------------ */

const cache = new Map<string, AnalysisResult>();

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DASHSCOPE_API_KEY 未配置" }, { status: 400 });
  }

  let event: CryptoEvent;
  try {
    const body = await req.json();
    event = body.event as CryptoEvent;
    if (!event?.date || !event?.description) {
      return NextResponse.json({ error: "缺少 event 字段" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "请求体解析失败" }, { status: 400 });
  }

  const cacheKey = `${event.date}::${event.description}`;
  if (cache.has(cacheKey)) {
    return NextResponse.json({ analysis: cache.get(cacheKey), cached: true });
  }

  const baseURL =
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const client = new OpenAI({ apiKey, baseURL });

  const typeLabel =
    event.type === "bull" ? "利好" : event.type === "bear" ? "利空" : "中性";

  const prompt = `你是专业的加密货币市场分析师。请对以下加密市场事件进行结构化分析，并严格按照JSON格式输出，不要有任何多余内容。

事件信息：
- 时间：${event.date}（${event.displayDate}）
- 描述：${event.description}
- 类型：${typeLabel}
- 相关币种：${event.coin}
- 当时价格：${event.priceTag}
${event.sourceUrl ? `- 来源：${event.sourceUrl}` : ""}

请输出以下JSON结构（每个字段1-2句话，中文，专业简洁）：
{
  "background": "事件的核心内容与宏观背景，补充简短描述的完整含义",
  "signal": "为什么被判定为「${typeLabel}」：核心影响机制（供需/情绪/监管/流动性），要有具体逻辑",
  "pathway": "从事件触发到价格变化的完整传导路径，用→连接各环节",
  "duration": "该利好/利空信号的持续性评估与主要不确定因素",
  "strength": 综合评估该信号的市场冲击力，输出1-5的整数（1=轻微影响，2=一般，3=中等，4=强烈，5=极强/结构性冲击）
}`;

  try {
    const completion = await client.chat.completions.create({
      model: "qwen-plus",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 650,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch =
      raw.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      raw.match(/(\{[\s\S]*\})/);

    let analysis: AnalysisResult;
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[1].trim()) as AnalysisResult;
    } else {
      // Fallback: wrap entire response as background
      analysis = {
        background: raw,
        signal: "—",
        pathway: "—",
        duration: "—",
        strength: 3,
      };
    }

    cache.set(cacheKey, analysis);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Qwen analyze error:", err);
    return NextResponse.json(
      { error: "AI 分析调用失败：" + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
