export interface Settings {
  schedule: {
    lookbackHours: number;
    maxItems: number;
  };
  webNews: {
    /** Google News RSS の検索クエリ（それぞれ独立したRSSフィードになる） */
    keywords: string[];
    /** keywords に加えて読み込む追加RSSのURL（業界サイトのフィードなど） */
    rssUrls: string[];
  };
  urlContent: {
    enabled: boolean;
    timeoutMs: number;
    parallelism: number;
    maxSummaryChars: number;
    inputCharsMultiplier: number;
  };
  analysis: {
    urlSummaryModel: string;
    trendAnalysisModel: string;
    temperature: number;
  };
}

function googleNewsRssUrl(query: string): string {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`;
}

export const settings: Settings = {
  schedule: {
    lookbackHours: 24,
    maxItems: 500,
  },
  webNews: {
    keywords: [
      "セルフストレージ",
      "トランクルーム",
      "コンテナ倉庫",
      "レンタル収納",
      "収納コンテナ",
    ],
    rssUrls: [
      // --- PR TIMES 企業RSS（公式プレスが配信されているもの） ---
      "https://prtimes.jp/companyrdf.php?company_id=34173", // エリアリンク（ハローストレージ）
      "https://prtimes.jp/companyrdf.php?company_id=56757", // 加瀬ホールディングス（加瀬倉庫／加瀬のレンタルボックスの発信窓口）
      "https://prtimes.jp/companyrdf.php?company_id=38669", // 株式会社キュラーズ（キュラーズ／Quraz）
      "https://prtimes.jp/companyrdf.php?company_id=62166", // 株式会社UKCorporation（スペラボ／Spelab）
      "https://prtimes.jp/companyrdf.php?company_id=138297", // 株式会社ストレージ王
      "https://prtimes.jp/companyrdf.php?company_id=120636", // 株式会社パルマ（Keepit／キーピット）
      // --- Google News（PR TIMES 未登録／企業RSSなしに近い場合の補完） ---
      googleNewsRssUrl(
        '"株式会社ライゼ" OR ライゼボックス OR REISEBOX',
      ),
      googleNewsRssUrl('"三協フロンテア" OR U-SPACE OR ユースペース'),
      // 株式会社ランドピア（ブランド：スペースプラス）
      googleNewsRssUrl(
        '"株式会社ランドピア" OR "スペースプラス" OR SpacePlus',
      ),
      googleNewsRssUrl(
        '"株式会社アゼト" OR オレンジコンテナ OR AZTO',
      ),
      // --- 公式サイト RSS（ニュース／お知らせ系フィード） ---
      "https://www.arealink.co.jp/feed/", // エリアリンク（ハローストレージ）
      "https://www.arealink.co.jp/news/feed/", // エリアリンク（ニュース一覧のフィード）
      "https://www.kasegroup.co.jp/wp/?feed=rss2&cat=5", // 加瀬グループ・新着情報（加瀬のレンタルボックス等）
      "https://www.landpia.co.jp/feed/", // 株式会社ランドピア（スペースプラス）※一覧表記「ランドリンク」は運営会社はランドピア
      "https://www.storageoh.co.jp/feed/", // 株式会社ストレージ王（WPブログRSS）
      "https://www.palma.jp/feed/", // 株式会社パルマ（キーピット運営元）
      // 公式HPにRSSが無い／404 の場合のサイト限定ニュース（Google News）
      googleNewsRssUrl("site:quraz.com"), // 株式会社キュラーズ
      googleNewsRssUrl("site:reisebox.co.jp"), // 株式会社ライゼ（ライゼボックス）
      googleNewsRssUrl("site:sankyofrontier.com"), // 三協フロンテア（U-SPACE／ユースペース）
      googleNewsRssUrl(
        "site:uk-corp.co.jp OR site:spalab-chintai.uk-corp.co.jp",
      ), // 株式会社UKコーポレーション（スペラボ）
      googleNewsRssUrl("site:azto.jp"), // 株式会社アゼト（オレンジコンテナ／AZTO）
    ],
  },
  urlContent: {
    enabled: true,
    timeoutMs: 10_000,
    parallelism: 10,
    maxSummaryChars: 200,
    inputCharsMultiplier: 20,
  },
  analysis: {
    urlSummaryModel: "gemini-2.5-flash",
    trendAnalysisModel: "gemini-2.5-pro",
    temperature: 0,
  },
};

/** keywords と rssUrls を結合した RSS フィードURL一覧（実行時に生成） */
export function resolveWebNewsFeedUrls(s: Settings): string[] {
  const fromKeywords = s.webNews.keywords.map(googleNewsRssUrl);
  return [...fromKeywords, ...s.webNews.rssUrls];
}

const MAX_NEWS_LOOKBACK_HOURS = 24 * 14;

/**
 * `NEWS_LOOKBACK_HOURS` が正の整数なら `schedule.lookbackHours` を上書き（ローカル検証など）。
 */
export function resolveRuntimeSettings(base: Settings): Settings {
  const raw = process.env.NEWS_LOOKBACK_HOURS?.trim();
  if (!raw) return base;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > MAX_NEWS_LOOKBACK_HOURS) {
    return base;
  }
  return {
    ...base,
    schedule: { ...base.schedule, lookbackHours: Math.floor(n) },
  };
}
