import { describe, it, expect } from "vitest";
import { AnalysisSchema, analysisResponseSchema } from "./schema.js";

const validAnalysis = {
  main_news: [
    {
      title: "大手が関東で新規オープン",
      details: ["コンテナ型ユニットを270供給", "駅徒歩圏で契約率高い見込み"],
      sources: ["https://news.example.jp/storage/article-001"],
    },
  ],
  updates: [
    {
      title: "月額プランをリニューアル",
      details: ["初期費用を値下げ"],
      sources: ["https://news.example.jp/storage/article-002"],
    },
  ],
  market_trends: [
    {
      title: "郊外ロケーションのニーズ増",
      details: ["駐車場併設型が増加", "住宅ストック活用事例も"],
      sources: ["https://news.example.jp/storage/article-003"],
    },
  ],
};

describe("AnalysisSchema", () => {
  it("正常なデータをパースできる", () => {
    const result = AnalysisSchema.parse(validAnalysis);
    expect(result.main_news).toHaveLength(1);
    expect(result.updates).toHaveLength(1);
    expect(result.market_trends).toHaveLength(1);
  });

  it("空セクションを許容する", () => {
    const result = AnalysisSchema.parse({
      main_news: [],
      updates: [],
      market_trends: [],
    });
    expect(result.main_news).toHaveLength(0);
  });

  it("必須フィールドが欠けるとエラー", () => {
    expect(() =>
      AnalysisSchema.parse({ main_news: [], updates: [] }),
    ).toThrow();
  });

  it("details が3つを超えるとエラー", () => {
    expect(() =>
      AnalysisSchema.parse({
        main_news: [
          {
            title: "test",
            details: ["1", "2", "3", "4"],
            sources: [],
          },
        ],
        updates: [],
        market_trends: [],
      }),
    ).toThrow();
  });

  it("details が3つちょうどは許容する", () => {
    const result = AnalysisSchema.parse({
      main_news: [
        {
          title: "test",
          details: ["1", "2", "3"],
          sources: [],
        },
      ],
      updates: [],
      market_trends: [],
    });
    expect(result.main_news[0]!.details).toHaveLength(3);
  });
});

describe("analysisResponseSchema", () => {
  it("JSON Schema オブジェクトが生成される", () => {
    expect(analysisResponseSchema).toBeDefined();
    expect(typeof analysisResponseSchema).toBe("object");
  });

  it("3つのセクションプロパティを含む", () => {
    const schema = analysisResponseSchema as Record<string, unknown>;
    const props = (schema as { properties?: Record<string, unknown> })
      .properties;
    expect(props).toBeDefined();
    expect(props).toHaveProperty("main_news");
    expect(props).toHaveProperty("updates");
    expect(props).toHaveProperty("market_trends");
  });
});
