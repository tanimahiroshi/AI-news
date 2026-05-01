export interface NewsItem {
  /** メディア名・公開元など（RSSフィード名または記事ドメイン） */
  sourceId: string;
  /** 見出しや概要など本文として渡すテキスト */
  text: string;
  publishedAt: string;
  url: string;
}

export interface EnrichedNewsItem extends NewsItem {
  enrichedText: string;
}
