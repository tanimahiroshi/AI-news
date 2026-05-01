import { GoogleGenAI } from "@google/genai";
import {
  AnalysisSchema,
  analysisResponseSchema,
  type Analysis,
} from "./schema.js";
import { TREND_ANALYSIS_PROMPT } from "./prompts.js";
import type { Config } from "../config.js";
import type { Settings } from "../settings.js";
import type { EnrichedNewsItem } from "../types.js";
import { UserFacingError } from "../utils/errors.js";
import { cleanText } from "../utils/post-optimizer.js";
import { dedupeAnalysisSources } from "./analysis-dedupe.js";

export async function analyzeTrends(
  items: EnrichedNewsItem[],
  config: Config,
  settings: Settings,
): Promise<Analysis> {
  console.info("[3b/4] 収集記事全体を Gemini Pro で分析中...");
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

  const postsForPrompt = Object.entries(groupBySource(items)).map(
    ([source, rows]) => ({
      source,
      posts: rows.map((row) => ({
        text: cleanText(row.enrichedText),
        url: row.url,
      })),
    }),
  );

  const prompt = TREND_ANALYSIS_PROMPT.replace(
    "{json_data}",
    JSON.stringify(postsForPrompt, null, 2),
  );

  const res = await ai.models.generateContent({
    model: settings.analysis.trendAnalysisModel,
    contents: prompt,
    config: {
      temperature: settings.analysis.temperature,
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema as Record<string, unknown>,
    },
  });

  const candidate = (res as { candidates?: Array<{ finishReason?: string }> })
    .candidates?.[0];

  if (candidate?.finishReason === "SAFETY") {
    throw new UserFacingError(
      "Geminiのセーフティフィルタで分析結果がブロックされました。収集記事を減らして再実行してください。",
    );
  }

  const text = res.text;
  if (!text) {
    throw new UserFacingError("Geminiから空の応答が返りました。");
  }

  try {
    const parsed = AnalysisSchema.parse(JSON.parse(text));
    return dedupeAnalysisSources(parsed);
  } catch (cause) {
    throw new UserFacingError(
      "Geminiの応答をパースできませんでした。再実行してみてください。",
      { cause },
    );
  }
}

function groupBySource(
  items: EnrichedNewsItem[],
): Record<string, EnrichedNewsItem[]> {
  const groups: Record<string, EnrichedNewsItem[]> = {};
  for (const row of items) {
    const key = row.sourceId || "unknown";
    (groups[key] ??= []).push(row);
  }
  return groups;
}
