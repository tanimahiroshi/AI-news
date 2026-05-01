import { describe, it, expect, vi } from "vitest";
import type { Settings } from "../settings.js";
import type { Config } from "../config.js";
import type { NewsItem } from "../types.js";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

const { summarizeUrls } = await import("./url-summarizer.js");

const mockConfig: Config = {
  JINA_API_KEY: "test",
  GEMINI_API_KEY: "test",
  GOOGLE_CHAT_WEBHOOK_URL:
    "https://chat.googleapis.com/v1/spaces/AAA/messages?key=test",
  USE_SAMPLE_DATA: true,
};

const mockSettings: Settings = {
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

const sampleItems: NewsItem[] = [
  {
    sourceId: "news.example.jp",
    text: "詳細はこちら https://example.com/article",
    publishedAt: "2026-04-16T10:00:00.000Z",
    url: "https://news.example.jp/storage/article-001",
  },
];

describe("summarizeUrls", () => {
  it("urlContents が空のとき元テキストをそのまま返す", async () => {
    const result = await summarizeUrls(
      sampleItems,
      new Map(),
      mockConfig,
      mockSettings,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.enrichedText).toBe(
      "詳細はこちら https://example.com/article",
    );
  });

  it("urlContents があるとき [補足情報] を挿入する", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "記事の要約テキスト",
    });

    const urlContents = new Map([
      ["https://example.com/article", "Full article body text here..."],
    ]);

    const result = await summarizeUrls(
      sampleItems,
      urlContents,
      mockConfig,
      mockSettings,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.enrichedText).toContain("[補足情報]");
    expect(result[0]!.enrichedText).toContain("記事の要約テキスト");
  });
});
