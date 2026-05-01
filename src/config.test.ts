import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = original;
  });

  const commonEnv = {
    JINA_API_KEY: "test",
    GEMINI_API_KEY: "test",
    GOOGLE_CHAT_WEBHOOK_URL:
      "https://chat.googleapis.com/v1/spaces/AAA/messages?key=test",
  };

  it("正常な環境変数をパースできる", () => {
    process.env = { ...original, ...commonEnv };
    const config = loadConfig();
    expect(config.USE_SAMPLE_DATA).toBe(false);
    expect(config.GEMINI_API_KEY).toBe("test");
    expect(config.GOOGLE_CHAT_WEBHOOK_URL).toContain(
      "chat.googleapis.com/v1/spaces/",
    );
  });

  it("USE_SAMPLE_DATA=true を boolean に変換する", () => {
    process.env = { ...original, ...commonEnv, USE_SAMPLE_DATA: "true" };
    const config = loadConfig();
    expect(config.USE_SAMPLE_DATA).toBe(true);
  });

  it("必須キーが欠落すると process.exit(1) を呼ぶ", () => {
    process.env = {};
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {
        throw new Error("process.exit called");
      }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("Google Chat URL が不正だと process.exit(1)", () => {
    process.env = {
      ...original,
      JINA_API_KEY: "test",
      GEMINI_API_KEY: "test",
      GOOGLE_CHAT_WEBHOOK_URL: "https://example.com/hook",
    };
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {
        throw new Error("process.exit called");
      }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
