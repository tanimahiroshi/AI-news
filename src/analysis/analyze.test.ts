import { describe, it, expect, vi } from "vitest";
import { UserFacingError } from "../utils/errors.js";
import type { Settings } from "../settings.js";
import type { Config } from "../config.js";
import type { EnrichedNewsItem } from "../types.js";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

const { analyzeTrends } = await import("./analyze.js");

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
    enabled: false,
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

const sampleItems: EnrichedNewsItem[] = [
  {
    sourceId: "news.example.jp",
    text: "セルフストレージ業界ニュース",
    publishedAt: "2026-04-16T10:00:00.000Z",
    url: "https://news.example.jp/storage/article-001",
    enrichedText: "セルフストレージ業界ニュース",
  },
];

const validResponse = {
  main_news: [
    {
      title: "Test News",
      details: ["Detail"],
      sources: ["https://news.example.jp/storage/article-001"],
    },
  ],
  updates: [],
  market_trends: [],
};

describe("analyzeTrends", () => {
  it("正常な JSON を返すと Analysis を返す", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(validResponse),
      candidates: [{ finishReason: "STOP" }],
    });

    const result = await analyzeTrends(sampleItems, mockConfig, mockSettings);
    expect(result.main_news).toHaveLength(1);
    expect(result.main_news[0]!.title).toBe("Test News");
  });

  it("SAFETY finishReason で UserFacingError をスローする", async () => {
    mockGenerateContent.mockResolvedValue({
      text: undefined,
      candidates: [{ finishReason: "SAFETY" }],
    });

    await expect(
      analyzeTrends(sampleItems, mockConfig, mockSettings),
    ).rejects.toThrow(UserFacingError);
  });
});
