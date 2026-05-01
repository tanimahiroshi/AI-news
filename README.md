# セルフストレージ業界ニュース

Google News RSS などから24時間以内のセルフストレージ関連ニュースを自動収集し、Gemini で分析して **Google Chat** に投稿するツールです。

```
┌──────────────────────────────────────────────────────────┐
│  セルフストレージ業界ニュース（過去24時間のまとめ）       │
│                                                          │
│  主要なニュース・話題                                    │
│  ──────────────────────────────                          │
│  大手が関東エリアでコンテナ型トランクルームを新規展開       │
│                                                          │
│  注目のアップデート                                      │
│  ──────────────────────────────                          │
│  月額プランの見直しと提携キャンペーンの開始               │
│                                                          │
│  市場・トレンド                                          │
│  ──────────────────────────────                          │
│  住宅ストック活用・郊外ニーズの高まり                     │
└──────────────────────────────────────────────────────────┘
```

---

## 全体像

```
┌─────────────┐
│  トリガー     │  GitHub Actions（手動 / 定期）
└──────┬──────┘
       ▼
┌─────────────┐
│  ソース元    │  Web — Google News RSS（キーワードは settings で変更）
└──────┬──────┘
       ▼
┌─────────────┐
│  加工        │  Jina Reader（記事本文）+ Gemini Flash（URL要約）
│             │  + Gemini Pro（業界トレンドの構造化JSON）
└──────┬──────┘
       ▼
┌─────────────┐
│  配信先      │  Google Chat（Incoming Webhook）
└─────────────┘
```

---

## 料金について

| サービス | 料金 |
|---|---|
| GitHub Actions | 毎月2,000分無料（実行は数分で完了） |
| RSS / Web取得 | 無料（公開フィードの読み取り） |
| Jina Reader | 無料枠あり（1Mトークン、使い切り型） |
| Gemini（Flash + Pro） | 無料枠で完結（1日1回の実行なら超過しない） |
| Google Chat | Google Workspace に準ずる |

記事の絞り込みや取得件数は `src/settings.ts` の `schedule.maxItems` や `webNews.keywords` で調整できます。

---

## セットアップ概要

### 準備するもの

- **GitHub アカウント**（Private リポジトリ推奨）
- **Google Chat スペース** と **Incoming Webhook URL**
- **Gemini API キー**（Google AI Studio）
- **Jina API キー**（無料登録）

### GitHub Secrets

| Secret | 説明 |
|--------|------|
| `GOOGLE_CHAT_WEBHOOK_URL` | Chat スペースで発行した Webhook URL |
| `GEMINI_API_KEY` | Gemini の API キー |
| `JINA_API_KEY` | Jina Reader の API キー |

詳細な画面操作は `.env.example` と Google Chat の「アプリと統合 → Webhooks」を参照してください。

### モックルートで試す

```bash
USE_SAMPLE_DATA=true npm start
```

`fixtures/sample-news.json` を読み RSS・キーを省略して動作確認できます。

GitHub Actions では workflow_dispatch の **use_sample_data** にチェックすると同様です。

---

## ローカル開発

```bash
npm ci
copy .env.example .env   # Windows — .env に実値を記入
npm test
npm run typecheck
npm start
```

---

## 設定・カスタマイズ

- **キーワード・追加RSS**: `src/settings.ts` の `webNews`
- **取得件数・対象時間**: `schedule.maxItems`, `schedule.lookbackHours`（任意で環境変数 `NEWS_LOOKBACK_HOURS` で上書き）
- **プロンプト**: `src/analysis/prompts.ts`
- **出力JSONスキーマ**: `src/analysis/schema.ts`（`main_news` / `updates` / `market_trends`）

---

## 定期実行

`.github/workflows/daily-news.yml` の `schedule` は既定で **毎日 08:00 JST**（UTC `0 23 * * *`）です。**土日も実行**されます。取得期間は `src/settings.ts` の **`schedule.lookbackHours`**（既定 24 時間）です。

**祝日は判定しない**（祝日もその曜日どおり実行）。

---

## 困ったとき

[docs/troubleshooting.md](docs/troubleshooting.md) に RSS・Gemini・Google Chat・Jina の代表的なエラーと対処をまとめています。

---

## 技術スタック

| 項目 | 選定 |
|---|---|
| 実行基盤 | GitHub Actions |
| 言語 | TypeScript（Node.js 22） |
| ニュース取得 | rss-parser + Google News RSS |
| URL本文取得 | Jina Reader |
| AI | Gemini 2.5 Flash / Pro |
| 通知 | Google Chat Incoming Webhook |
