import { describe, it, expect } from "vitest";
import { fetchWebNews } from "./web-news.js";
import type { Config } from "../config.js";
import { settings } from "../settings.js";

const mockConfig: Config = {
  JINA_API_KEY: "test-jina",
  GEMINI_API_KEY: "test-gemini",
  GOOGLE_CHAT_WEBHOOK_URL:
    "https://chat.googleapis.com/v1/spaces/AAA/messages?key=test",
  USE_SAMPLE_DATA: true,
};

describe("fetchWebNews（モックルート）", () => {
  it("USE_SAMPLE_DATA=true で fixtures/sample-news.json を読み込む", async () => {
    const items = await fetchWebNews(mockConfig, settings);
    expect(items.length).toBe(30);
  });

  it("各記事に必須フィールドがある", async () => {
    const items = await fetchWebNews(mockConfig, settings);
    for (const row of items) {
      expect(row.sourceId).toBeDefined();
      expect(typeof row.sourceId).toBe("string");
      expect(row.text).toBeDefined();
      expect(typeof row.text).toBe("string");
      expect(row.publishedAt).toBeDefined();
      expect(row.url).toBeDefined();
      expect(row.url).toMatch(/^https:\/\//);
    }
  });
});
