import Parser from "rss-parser";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Config } from "../config.js";
import { resolveWebNewsFeedUrls, type Settings } from "../settings.js";
import type { NewsItem } from "../types.js";
import { dedupeArticleUrlKey } from "../utils/url-dedup.js";

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; StorageNewsBot/1.0; +https://github.com/)",
  },
});

export async function fetchWebNews(
  config: Config,
  settings: Settings,
): Promise<NewsItem[]> {
  if (config.USE_SAMPLE_DATA) {
    return loadSampleNews();
  }
  return fetchFromRss(settings);
}

async function loadSampleNews(): Promise<NewsItem[]> {
  const path = resolve(import.meta.dirname, "../../fixtures/sample-news.json");
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as NewsItem[];
}

async function fetchFromRss(settings: Settings): Promise<NewsItem[]> {
  const feedUrls = resolveWebNewsFeedUrls(settings);
  const cutoff = Date.now() - settings.schedule.lookbackHours * 60 * 60 * 1000;
  const seenArticleKeys = new Set<string>();
  const items: NewsItem[] = [];

  const results = await Promise.allSettled(
    feedUrls.map(async (feedUrl) => {
      const feed = await parser.parseURL(feedUrl);
      const feedLabel = feed.title?.trim() || hostnameOnly(feedUrl);

      for (const entry of feed.items ?? []) {
        const url = normalizeArticleUrl(entry.link);
        if (!url) continue;

        const articleKey = dedupeArticleUrlKey(url);
        if (seenArticleKeys.has(articleKey)) continue;

        const pubMs =
          parsePubDate(entry.isoDate) ?? parsePubDate(entry.pubDate);
        if (pubMs !== undefined && pubMs < cutoff) continue;

        seenArticleKeys.add(articleKey);

        const title = entry.title?.trim() ?? "";
        const snippet =
          entry.contentSnippet?.trim() ?? entry.summary?.trim() ?? "";
        const text = [title, snippet].filter(Boolean).join("\n");

        items.push({
          sourceId: articleSourceLabel(url, feedLabel),
          text,
          publishedAt:
            entry.isoDate ??
            entry.pubDate ??
            new Date().toISOString(),
          url,
        });
      }
    }),
  );

  for (const r of results) {
    if (r.status === "rejected") {
      console.warn("[web-news] RSS取得エラー:", r.reason);
    }
  }

  items.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const capped = items.slice(0, settings.schedule.maxItems);
  console.info(`→ RSSから記事 ${capped.length}件（重複除去・期間フィルタ後）`);
  return capped;
}

function hostnameOnly(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "rss";
  }
}

function normalizeArticleUrl(link: string | undefined): string | undefined {
  if (!link?.trim()) return undefined;
  try {
    const u = new URL(link.trim());
    u.hash = "";
    return u.toString();
  } catch {
    return undefined;
  }
}

function parsePubDate(pubDate: string | undefined): number | undefined {
  if (!pubDate) return undefined;
  const ms = Date.parse(pubDate);
  return Number.isFinite(ms) ? ms : undefined;
}

/** 記事URLのホストを優先し、無ければフィード名をソースとする */
function articleSourceLabel(articleUrl: string, feedLabel: string): string {
  try {
    return new URL(articleUrl).hostname.replace(/^www\./, "");
  } catch {
    return feedLabel;
  }
}
