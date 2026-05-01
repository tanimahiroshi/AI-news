import { describe, it, expect, vi } from "vitest";
import { fetchUrlContents } from "./url-content.js";
import type { Config } from "../config.js";
import type { Settings } from "../settings.js";
import type { NewsItem } from "../types.js";

const mockConfig: Config = {
  JINA_API_KEY: "test-jina",
  GEMINI_API_KEY: "test-gemini",
  GOOGLE_CHAT_WEBHOOK_URL:
    "https://chat.googleapis.com/v1/spaces/AAA/messages?key=test",
  USE_SAMPLE_DATA: true,
};

const baseSettings: Settings = {
  schedule: { lookbackHours: 24, maxItems: 100 },
  webNews: { keywords: [], rssUrls: [] },
  urlContent: {
    enabled: true,
    timeoutMs: 5000,
    parallelism: 5,
    maxSummaryChars: 200,
    inputCharsMultiplier: 20,
  },
  analysis: {
    urlSummaryModel: "gemini-2.5-flash",
    trendAnalysisModel: "gemini-2.5-pro",
    temperature: 0,
  },
};

const disabledSettings: Settings = {
  ...baseSettings,
  urlContent: { ...baseSettings.urlContent, enabled: false },
};

const itemsNoUrl: NewsItem[] = [
  {
    sourceId: "news.example.jp",
    text: "URLなしの記事概要のみ",
    publishedAt: "2026-04-16T10:00:00.000Z",
    url: "https://news.example.jp/storage/article-000",
  },
];

function makeItemsWithUrls(...urls: string[]): NewsItem[] {
  return urls.map((u, i) => ({
    sourceId: "news.example.jp",
    text: `Link ${u}`,
    publishedAt: "2026-04-16T10:00:00.000Z",
    url: `https://news.example.jp/storage/article-${i + 1}`,
  }));
}

describe("fetchUrlContents", () => {
  it("urlContent.enabled=false のとき空Mapを返す", async () => {
    const result = await fetchUrlContents(
      makeItemsWithUrls("https://example.com/article"),
      mockConfig,
      disabledSettings,
    );
    expect(result.size).toBe(0);
  });

  it("URLがない記事では空Mapを返す", async () => {
    const result = await fetchUrlContents(
      itemsNoUrl,
      mockConfig,
      baseSettings,
    );
    expect(result.size).toBe(0);
  });

  it("Jina 200 OK で本文を取得できる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (init?.method === "HEAD") {
          return Promise.resolve({ url });
        }
        if (url.startsWith("https://r.jina.ai/")) {
          return Promise.resolve(
            new Response("Article body content", { status: 200 }),
          );
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );

    const items = makeItemsWithUrls("https://example.com/article");
    const result = await fetchUrlContents(items, mockConfig, baseSettings);
    expect(result.size).toBe(1);
    const content = [...result.values()][0];
    expect(content).toBe("Article body content");
  });

  it("Jina 402 でフォールバックし残りをスキップする", async () => {
    let jinaCallCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (init?.method === "HEAD") {
          return Promise.resolve({ url });
        }
        if (url.startsWith("https://r.jina.ai/")) {
          jinaCallCount++;
          if (jinaCallCount === 1) {
            return Promise.resolve(new Response("First article", { status: 200 }));
          }
          return Promise.resolve(new Response(null, { status: 402 }));
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );

    const items = makeItemsWithUrls(
      "https://a.example.com/1",
      "https://b.example.com/2",
      "https://c.example.com/3",
    );
    const result = await fetchUrlContents(items, mockConfig, {
      ...baseSettings,
      urlContent: { ...baseSettings.urlContent, parallelism: 1 },
    });
    expect(result.size).toBe(1);
    expect([...result.values()][0]).toBe("First article");
  });
});
