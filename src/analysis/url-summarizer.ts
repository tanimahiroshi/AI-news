import { GoogleGenAI } from "@google/genai";
import type { Config } from "../config.js";
import type { Settings } from "../settings.js";
import type { NewsItem, EnrichedNewsItem } from "../types.js";
import { extractUrls } from "../utils/post-optimizer.js";
import { chunkArray } from "../utils/chunk.js";
import { URL_SUMMARY_PROMPT } from "./prompts.js";

export async function summarizeUrls(
  items: NewsItem[],
  urlContents: Map<string, string>,
  config: Config,
  settings: Settings,
): Promise<EnrichedNewsItem[]> {
  if (urlContents.size === 0) {
    return items.map((row) => ({ ...row, enrichedText: row.text }));
  }

  console.info("[3a/4] 各URLを Gemini Flash で要約中...");
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const summaryCache = new Map<string, string>();
  const entries = [...urlContents.entries()];

  const chunks = chunkArray(entries, settings.urlContent.parallelism);
  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async ([url, content]) => {
        const truncated = content.slice(
          0,
          settings.urlContent.maxSummaryChars *
            settings.urlContent.inputCharsMultiplier,
        );
        const prompt = URL_SUMMARY_PROMPT.replace(
          "{article_text}",
          truncated,
        );

        const res = await ai.models.generateContent({
          model: settings.analysis.urlSummaryModel,
          contents: prompt,
          config: { temperature: 0 },
        });

        const text = res.text?.slice(0, settings.urlContent.maxSummaryChars);
        return { url, summary: text ?? "" };
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.summary) {
        summaryCache.set(r.value.url, r.value.summary);
      }
    }
  }

  console.info(`→ URL要約完了: ${summaryCache.size}件`);

  return items.map((row) => {
    let enrichedText = row.text;
    for (const url of extractUrls(row.text)) {
      const summary = summaryCache.get(url);
      if (summary) {
        enrichedText += `\n[補足情報]: ${summary}`;
      }
    }
    return { ...row, enrichedText };
  });
}
