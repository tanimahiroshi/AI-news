import type { Config } from "../config.js";
import type { Settings } from "../settings.js";
import type { NewsItem } from "../types.js";
import { extractUrls, expandUrls } from "../utils/post-optimizer.js";
import { chunkArray } from "../utils/chunk.js";

/**
 * 記事テキスト内URLの本文を Jina Reader で取得する。
 * 返す Map のキーはテキストに出現する短縮URL（extractUrls で抽出したもの）。
 */
export async function fetchUrlContents(
  items: NewsItem[],
  config: Config,
  settings: Settings,
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();

  if (!settings.urlContent.enabled) {
    console.info("URL本文取得は src/settings.ts の urlContent.enabled=false のため無効");
    return contents;
  }

  const allRawUrls = items.flatMap((row) => extractUrls(row.text));
  const uniqueRawUrls = [...new Set(allRawUrls)];

  if (uniqueRawUrls.length === 0) return contents;

  console.info(`→ ${uniqueRawUrls.length}件 のURLをHEADで展開中`);
  const urlMapping = await expandUrls(uniqueRawUrls);
  console.info(
    `→ 外部URL: ${urlMapping.size}件（x.com/twitter.com を除外済み）`,
  );

  if (urlMapping.size === 0) return contents;

  let jina402Detected = false;
  const entries = [...urlMapping.entries()];
  const chunks = chunkArray(entries, settings.urlContent.parallelism);

  for (const chunk of chunks) {
    if (jina402Detected) break;

    const results = await Promise.allSettled(
      chunk.map(async ([originalUrl, expandedUrl]) => {
        const ctl = new AbortController();
        const timer = setTimeout(
          () => ctl.abort(),
          settings.urlContent.timeoutMs,
        );
        try {
          const res = await fetch(`https://r.jina.ai/${expandedUrl}`, {
            headers: {
              Accept: "text/plain",
              ...(config.JINA_API_KEY
                ? { Authorization: `Bearer ${config.JINA_API_KEY}` }
                : {}),
            },
            signal: ctl.signal,
          });

          if (res.status === 402 || res.status === 401) {
            jina402Detected = true;
            console.warn(
              `[Jina] ${res.status} — 無料枠が枯渇しました。URL本文なしで分析を続行します。`,
            );
            return { originalUrl, content: undefined };
          }
          if (!res.ok) {
            return { originalUrl, content: undefined };
          }
          const text = await res.text();
          return { originalUrl, content: text };
        } finally {
          clearTimeout(timer);
        }
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.content) {
        contents.set(r.value.originalUrl, r.value.content);
      }
    }
  }

  if (jina402Detected) {
    console.warn(
      `[Jina] フォールバック: ${contents.size} URLs の本文を取得済み。残りはスキップします。`,
    );
  } else {
    console.info(`→ 本文取得完了: ${contents.size}件`);
  }

  return contents;
}
