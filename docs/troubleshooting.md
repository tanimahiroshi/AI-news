# 困ったとき

## GitHub Actions のログの読み方

1. リポジトリの **Actions** タブを開く
2. 実行したワークフローをクリック
3. **run** ジョブをクリックして各ステップを展開
4. `[USER-FACING]` で始まる行を最優先で読む — 次に何をすべきかが書いてある
5. `[INTERNAL]` で始まる行は開発者向けの詳細情報

---

## エラー別の対処法

### RSS / Webニュース取得

| 症状 | 原因 | 対処 |
|---|---|---|
| 記事が極端に少ない | Google News RSS が一時的に空・フィルタが厳しい | `src/settings.ts` の `webNews.keywords` に別キーワードを追加、`rssUrls` に業界メディアのRSSを追加 |
| タイムアウトや fetch エラー | ネットワーク・RSS側の負荷 | しばらく待って再実行。Actions のタイムアウトは `.github/workflows/daily-news.yml` で調整 |
| モックで動かしたい | 本番RSSを触りたくない | `USE_SAMPLE_DATA=true` で `fixtures/sample-news.json` を読むルートで確認 |

### Jina Reader

| 症状 | 原因 | 対処 |
|---|---|---|
| `402 Payment Required` | 1Mトークンの無料枠が枯渇 | **自動フォールバック済み**のため配布物は壊れない。長期利用なら Paid プラン (jina.ai/pricing) へ、または `src/settings.ts` の `urlContent.enabled` を `false` に |

### Gemini

| 症状 | 原因 | 対処 |
|---|---|---|
| `400 API key not valid` | APIキーの誤り | aistudio.google.com で再発行し、GitHub Secrets の `GEMINI_API_KEY` を更新 |
| `429 Resource exhausted` | Free枠の1日上限超過（Flash 250/day, Pro 100/day） | 明日まで待つ。手動実行は1日1〜2回に抑える |
| `SAFETY filter` | 収集記事がセーフティフィルタに抵触 | `src/settings.ts` の `schedule.maxItems` を減らす、またはキーワードを調整する |

### Google Chat（Webhook）

| 症状 | 原因 | 対処 |
|---|---|---|
| `401` / `403` | Webhook のキー／トークンが無効・期限切れ | スペース設定から Webhook を再作成し、`GOOGLE_CHAT_WEBHOOK_URL` を更新 |
| `404` | URL が間違っている | Incoming Webhook の URL をコピーし直す（`https://chat.googleapis.com/v1/spaces/.../messages?...`） |
| HTTPエラーで `[USER-FACING]` | ペイロード過大やネットワーク | `schedule.maxItems` を減らして記事数を抑える |

### その他

| 症状 | 原因 | 対処 |
|---|---|---|
| 成功（緑）だが Chat に投稿がない | Webhook が別スペース・別Webhook URL を指している | Secret の URL と実際に見ているスペースが一致しているか確認 |
| Actions がずっと黄色（実行中） | Jina Reader の大量タイムアウト | `src/settings.ts` の `urlContent.parallelism` を `5` に下げる、または `urlContent.enabled` を `false` にして再実行 |
