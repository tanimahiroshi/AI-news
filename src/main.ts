import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

// ┌──────────────────────────────────────────────────────┐
// │  読み順ガイド                                        │
// │  この main() の4ステップを上から読めば全体が分かる。  │
// │  詳しく見たくなったら各 import 先にジャンプ。          │
// │  設定を変えたい場合は src/settings.ts を開く。        │
// └──────────────────────────────────────────────────────┘

import { loadConfig } from "./config.js";
import { resolveRuntimeSettings, settings } from "./settings.js";
import { fetchWebNews } from "./sources/web-news.js";
import { fetchUrlContents } from "./sources/url-content.js";
import { summarizeUrls } from "./analysis/url-summarizer.js";
import { analyzeTrends } from "./analysis/analyze.js";
import { postToGoogleChat } from "./delivery/google-chat.js";
import { UserFacingError } from "./utils/errors.js";
import type { Analysis } from "./analysis/schema.js";

const EMPTY_ANALYSIS: Analysis = {
  main_news: [],
  updates: [],
  market_trends: [],
};

async function main() {
  const config = loadConfig();
  const runtimeSettings = resolveRuntimeSettings(settings);
  if (
    runtimeSettings.schedule.lookbackHours !== settings.schedule.lookbackHours
  ) {
    console.info(
      `→ ニュース取得期間: 過去${runtimeSettings.schedule.lookbackHours}時間（NEWS_LOOKBACK_HOURS）`,
    );
  }

  console.info("[1/4] Webニュース（RSS）から記事を取得中...");
  const newsItems = await fetchWebNews(config, runtimeSettings);
  console.info(`→ 記事 ${newsItems.length}件 を取得`);

  console.info("[2/4] URL本文を Jina Reader で取得中...");
  let urlContents = new Map<string, string>();
  if (newsItems.length > 0) {
    urlContents = await fetchUrlContents(newsItems, config, runtimeSettings);
    console.info(`→ 本文取得済みURL: ${urlContents.size}件`);
  } else {
    console.info("→ 記事0件のため URL本文取得をスキップ");
  }

  const enriched =
    newsItems.length === 0
      ? []
      : await summarizeUrls(newsItems, urlContents, config, runtimeSettings);

  if (enriched.length === 0) {
    console.info("[3b/4] 収集記事が0件のため Gemini 分析をスキップします");
    console.info("[4/4] Google Chat へ投稿中...");
    await postToGoogleChat(EMPTY_ANALYSIS, config);
    console.info("すべての処理が完了しました");
    return;
  }

  const analysis = await analyzeTrends(enriched, config, runtimeSettings);

  console.info("[4/4] Google Chat へ投稿中...");
  await postToGoogleChat(analysis, config);

  console.info("すべての処理が完了しました");
}

main().catch((error: unknown) => {
  if (error instanceof UserFacingError) {
    console.error(`\n[USER-FACING] ${error.message}`);
    console.error("対処法の詳細は docs/troubleshooting.md を参照してください。");
    if (error.cause) {
      console.error("[DETAIL]", error.cause);
    }
  } else {
    console.error("\n[INTERNAL] Unexpected error:", error);
  }
  process.exit(1);
});
