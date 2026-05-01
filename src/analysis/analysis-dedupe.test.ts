import { describe, it, expect } from "vitest";
import { dedupeAnalysisSources } from "./analysis-dedupe.js";
import type { Analysis } from "./schema.js";

describe("dedupeAnalysisSources", () => {
  it("同一 sources はセクション内で1つになる", () => {
    const input: Analysis = {
      main_news: [
        {
          title: "A",
          details: [],
          sources: [
            "https://ex.com/a?utm_source=1",
            "https://ex.com/a?utm_source=2",
          ],
        },
      ],
      updates: [],
      market_trends: [],
    };
    const out = dedupeAnalysisSources(input);
    expect(out.main_news[0]!.sources).toHaveLength(1);
  });

  it("main_news に出た URL は updates では落ちる", () => {
    const input: Analysis = {
      main_news: [
        {
          title: "A",
          details: [],
          sources: ["https://ex.com/shared"],
        },
      ],
      updates: [
        {
          title: "B",
          details: [],
          sources: ["https://ex.com/shared"],
        },
      ],
      market_trends: [],
    };
    const out = dedupeAnalysisSources(input);
    expect(out.main_news[0]!.sources).toEqual(["https://ex.com/shared"]);
    expect(out.updates[0]!.sources).toEqual([]);
  });
});
