# セルフストレージ業界ニュース

Web（主に Google News RSS）からセルフストレージ関連ニュースを収集（CI は毎日 08:00 JST・祝日は未考慮）し、Gemini で分析して Google Chat に投稿する自動配信ツール。

## プロジェクト構造

```
src/
├── main.ts # エントリポイント（最初にここを読む）
├── settings.ts # 受講生が触る全設定（TS定数）
├── config.ts # 環境変数の zod 検証
├── types.ts # 共通型定義
├── sources/
│ ├── web-news.ts # RSS（Google News等）から記事取得 + モックルート分岐
│ └── url-content.ts # Jina Reader で URL 本文並列取得
├── analysis/
│ ├── url-summarizer.ts # Gemini Flash で各URL要約
│ ├── analyze.ts # Gemini Pro で最終トレンド分析
│ ├── schema.ts # zod スキーマ（SSoT）
│ └── prompts.ts # プロンプト2つ
├── delivery/
│ └── google-chat.ts # Card 組み立て + Google Chat Webhook投稿
└── utils/
 ├── chunk.ts # 配列チャンク分割
 ├── errors.ts # UserFacingError
 └── post-optimizer.ts # URL抽出・t.co展開・テキスト整形
```

## 実行方法

```bash
npm start # 通常実行（RSS取得）
USE_SAMPLE_DATA=true npm start # モックルート（RSS・Webhook検証）
```

## 読む順番

1. `src/main.ts` — 4ステップの全体像
2. `src/sources/web-news.ts` — ソース元
3. `src/analysis/analyze.ts` — 処理
4. `src/delivery/google-chat.ts` — 届ける先
5. `src/settings.ts` — 設定を変えたいとき

## GitHub Secrets

| シークレット名 | 用途 |
|---|---|
| `GOOGLE_CHAT_WEBHOOK_URL` | Google Chat スペースの Incoming Webhook URL |
| `JINA_API_KEY` | Jina Reader |
| `GEMINI_API_KEY` | Gemini Flash + Pro |

## 禁止事項

- curl で直接 Slack API / X API を叩かない
- `src/settings.ts` 以外のファイルで設定値をハードコードしない
- 受講生に見せたいエラー文言は `UserFacingError` の `message` に入れる（`main.ts` が `[USER-FACING]` プレフィックス付きで出力する）。`throw new Error(...)` だけだと `[INTERNAL]` 扱いになり、受講生が混乱する
