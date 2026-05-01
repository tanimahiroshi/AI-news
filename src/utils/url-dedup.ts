/**
 * 同一記事の重複カウントを避けるためのキー（表示用 URL は変えず、照合用のみ）。
 * ホスト名の正規化・フラグメント削除・代表的なトラッキングクエリ削除・クエリ並び順の安定化。
 */
export function dedupeArticleUrlKey(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    u.hash = "";
    const hostname = u.hostname.toLowerCase().replace(/^www\./, "");

    const tracking = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
    ]);

    const params = new URLSearchParams(u.search);
    for (const name of [...params.keys()]) {
      if (tracking.has(name.toLowerCase())) {
        params.delete(name);
      }
    }

    const sorted = [...params.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const q = new URLSearchParams(sorted).toString();
    const path = u.pathname.endsWith("/") && u.pathname.length > 1
      ? u.pathname.slice(0, -1)
      : u.pathname;

    return `${hostname}${path}${q ? `?${q}` : ""}`;
  } catch {
    return rawUrl.trim();
  }
}
