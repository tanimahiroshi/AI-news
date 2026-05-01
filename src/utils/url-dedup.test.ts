import { describe, it, expect } from "vitest";
import { dedupeArticleUrlKey } from "./url-dedup.js";

describe("dedupeArticleUrlKey", () => {
  it("utm を除去すると同一キーになる", () => {
    const a =
      "https://news.example.jp/article?utm_source=x&utm_medium=y&id=1";
    const b = "https://news.example.jp/article?id=1";
    expect(dedupeArticleUrlKey(a)).toBe(dedupeArticleUrlKey(b));
  });

  it("ホストの www と大小は正規化される", () => {
    expect(dedupeArticleUrlKey("https://WWW.EXAMPLE.jp/path")).toBe(
      dedupeArticleUrlKey("https://example.jp/path"),
    );
  });

  it("フラグメントは無視される", () => {
    expect(dedupeArticleUrlKey("https://ex.com/a#x")).toBe(
      dedupeArticleUrlKey("https://ex.com/a#y"),
    );
  });

  it("末尾スラッシュは同一視される（ルート以外）", () => {
    expect(dedupeArticleUrlKey("https://ex.com/foo/")).toBe(
      dedupeArticleUrlKey("https://ex.com/foo"),
    );
  });
});
