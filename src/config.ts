import { z } from "zod";

const schema = z.object({
  JINA_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GOOGLE_CHAT_WEBHOOK_URL: z
    .string()
    .url()
    .refine(
      (u) =>
        u.startsWith("https://chat.googleapis.com/v1/spaces/") &&
        u.includes("/messages"),
      {
        message:
          "Google Chat の Incoming Webhook URL（https://chat.googleapis.com/v1/spaces/.../messages?...）を設定してください",
      },
    ),
  USE_SAMPLE_DATA: z
    .enum(["true", "false", ""])
    .default("false")
    .transform((v) => v === "true"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(): Config {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    reportAndExit("環境変数の検証に失敗しました", result.error);
  }
  return result.data;
}

function reportAndExit(title: string, error: z.ZodError): never {
  const missing = error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`[CONFIG] ${title}:\n${missing}`);
  process.exit(1);
}
