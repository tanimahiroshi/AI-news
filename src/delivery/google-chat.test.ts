import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Config } from "../config.js";
import type { Analysis } from "../analysis/schema.js";

const mockConfig: Config = {
  JINA_API_KEY: "test-jina",
  GEMINI_API_KEY: "test-gemini",
  GOOGLE_CHAT_WEBHOOK_URL:
    "https://chat.googleapis.com/v1/spaces/AAA/messages?key=test",
  USE_SAMPLE_DATA: true,
};

const validAnalysis: Analysis = {
  main_news: [
    {
      title: "大手が関東で新規オープン",
      details: ["コンテナ型270ユニット"],
      sources: ["https://news.example.jp/storage/article-001"],
    },
  ],
  updates: [
    {
      title: "料金プラン改定のお知らせ",
      details: ["初期費用を値下げ"],
      sources: ["https://news.example.jp/storage/article-002"],
    },
  ],
  market_trends: [],
};

describe("postToGoogleChat", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: 200 }))),
    );
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("正常な Analysis を Webhook に POST できる", async () => {
    const { postToGoogleChat } = await import("./google-chat.js");
    await postToGoogleChat(validAnalysis, mockConfig);

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe(mockConfig.GOOGLE_CHAT_WEBHOOK_URL);
    expect(call[1]?.method).toBe("POST");
    const body = JSON.parse(call[1]?.body as string) as {
      text?: string;
      cardsV2?: Array<{ card?: { header?: { title?: string } } }>;
    };
    expect(body.text).toBeUndefined();
    expect(Array.isArray(body.cardsV2)).toBe(true);
    expect(body.cardsV2?.[0]?.card?.header?.title).toBe("24時間のまとめ");
    const raw = JSON.stringify(body);
    expect(raw).toContain('<a href=\\"https://news.example.jp/storage/article-001\\">');
    expect(raw).toContain('<a href=\\"https://news.example.jp/storage/article-002\\">');
  });

  it("空の Analysis ではカードなしのテキストのみ送信する", async () => {
    const { postToGoogleChat } = await import("./google-chat.js");
    const emptyAnalysis: Analysis = {
      main_news: [],
      updates: [],
      market_trends: [],
    };
    await expect(
      postToGoogleChat(emptyAnalysis, mockConfig),
    ).resolves.not.toThrow();

    const fetchMock = vi.mocked(globalThis.fetch);
    const body = JSON.parse(
      fetchMock.mock.calls[0]![1]?.body as string,
    ) as Record<string, unknown>;
    expect(body.cardsV2).toBeUndefined();
    expect(body.text).toBe(
      "直近24時間に該当するニュースはありませんでした。",
    );
  });

  it("HTTPエラー時は UserFacingError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 400 }))),
    );
    vi.resetModules();

    const { postToGoogleChat } = await import("./google-chat.js");
    const { UserFacingError } = await import("../utils/errors.js");

    await expect(postToGoogleChat(validAnalysis, mockConfig)).rejects.toThrow(
      UserFacingError,
    );
  });
});
