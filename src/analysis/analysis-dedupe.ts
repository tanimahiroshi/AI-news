import type { Analysis } from "./schema.js";
import { dedupeArticleUrlKey } from "../utils/url-dedup.js";

/**
 * sources 内の重複 URL を除去し、さらに main_news → updates → market_trends の順で
 * 既に出現した URL は後続セクションでは載せない（同一記事の二重掲載防止）。
 */
export function dedupeAnalysisSources(analysis: Analysis): Analysis {
  const globallySeen = new Set<string>();

  function sourcesDedupedLocallyThenGlobal(urls: string[]): string[] {
    const localSeen = new Set<string>();
    const afterLocal: string[] = [];
    for (const u of urls) {
      const key = dedupeArticleUrlKey(u);
      if (localSeen.has(key)) continue;
      localSeen.add(key);
      afterLocal.push(u);
    }

    const out: string[] = [];
    for (const u of afterLocal) {
      const key = dedupeArticleUrlKey(u);
      if (globallySeen.has(key)) continue;
      globallySeen.add(key);
      out.push(u);
    }
    return out;
  }

  const mapBlock = (topics: Analysis["main_news"]) =>
    topics.map((t) => ({
      ...t,
      sources: sourcesDedupedLocallyThenGlobal(t.sources),
    }));

  return {
    main_news: mapBlock(analysis.main_news),
    updates: mapBlock(analysis.updates),
    market_trends: mapBlock(analysis.market_trends),
  };
}
