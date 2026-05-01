import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveRuntimeSettings, settings } from "./settings.js";

describe("resolveRuntimeSettings", () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.NEWS_LOOKBACK_HOURS;
  });

  afterEach(() => {
    process.env = original;
  });

  it("NEWS_LOOKBACK_HOURS が無ければベース設定をそのまま返す", () => {
    expect(resolveRuntimeSettings(settings)).toEqual(settings);
  });

  it("NEWS_LOOKBACK_HOURS が正の整数なら lookbackHours を上書きする", () => {
    process.env.NEWS_LOOKBACK_HOURS = "96";
    const out = resolveRuntimeSettings(settings);
    expect(out.schedule.lookbackHours).toBe(96);
    expect(out.schedule.maxItems).toBe(settings.schedule.maxItems);
  });

  it("無効な値ではベース設定を返す", () => {
    process.env.NEWS_LOOKBACK_HOURS = "0";
    expect(resolveRuntimeSettings(settings)).toEqual(settings);
    process.env.NEWS_LOOKBACK_HOURS = "not-a-number";
    expect(resolveRuntimeSettings(settings)).toEqual(settings);
  });
});
