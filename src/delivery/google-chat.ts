import type { Config } from "../config.js";
import type { Analysis } from "../analysis/schema.js";
import { UserFacingError } from "../utils/errors.js";

/** Google Chat Incoming Webhook — Card メッセージ */
export async function postToGoogleChat(
  analysis: Analysis,
  config: Config,
): Promise<void> {
  const payload = buildWebhookPayload(analysis);
  await sendWebhook(config.GOOGLE_CHAT_WEBHOOK_URL, payload);
  console.info("Google Chat 投稿完了");
}

export async function notifyGoogleChatPlainText(
  webhookUrl: string,
  text: string,
): Promise<void> {
  await sendWebhook(webhookUrl, { text });
}

async function sendWebhook(
  webhookUrl: string,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    throw new UserFacingError(
      `Google Chat への投稿に失敗しました（HTTP ${res.status}）。Webhook URL とネットワークを確認してください。`,
      { cause: raw.slice(0, 500) },
    );
  }
}

function buildWebhookPayload(analysis: Analysis): Record<string, unknown> {
  const sections: Array<{ widgets: unknown[] }> = [];

  const blocks: Array<{ title: string; items: Analysis["main_news"] }> = [
    { title: "主要なニュース・話題", items: analysis.main_news },
    { title: "注目のアップデート", items: analysis.updates },
    { title: "市場・トレンド", items: analysis.market_trends },
  ];

  for (const block of blocks) {
    if (block.items.length === 0) continue;

    sections.push({
      widgets: [
        {
          textParagraph: {
            text: `<b>${escapeHtml(block.title)}</b>`,
          },
        },
      ],
    });

    for (const topic of block.items) {
      const paragraphs: string[] = [];
      paragraphs.push(`<b>${escapeHtml(topic.title)}</b>`);
      if (topic.details.length > 0) {
        paragraphs.push(escapeHtml(topic.details.join("\n")));
      }
      if (topic.sources.length > 0) {
        paragraphs.push(sourceLinksHtml(topic.sources));
      }

      sections.push({
        widgets: [
          {
            textParagraph: {
              text: paragraphs.join("<br><br>"),
            },
          },
        ],
      });
    }
  }

  if (sections.length === 0) {
    return {
      text: "直近24時間に該当するニュースはありませんでした。",
    };
  }

  // トップレベル text は付けない（カード header と吹き出しで二重表示になるため）
  return {
    cardsV2: [
      {
        cardId: "self-storage-news-digest",
        card: {
          header: {
            title: "24時間のまとめ",
          },
          sections,
        },
      },
    ],
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Google Chat の textParagraph でクリック可能にする（公式サポートの `<a href>`） */
function sourceLinksHtml(urls: string[]): string {
  return urls
    .map((u) => {
      const href = escapeHref(u.trim());
      const label = escapeHtml(u.trim());
      return `<a href="${href}">${label}</a>`;
    })
    .join("<br>");
}

function escapeHref(url: string): string {
  return url.replace(/"/g, "&quot;");
}
