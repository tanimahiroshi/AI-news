import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const TopicSchema = z.object({
  title: z.string(),
  details: z.array(z.string()).max(3),
  sources: z.array(z.string()),
});

export const AnalysisSchema = z.object({
  main_news: z.array(TopicSchema),
  updates: z.array(TopicSchema),
  market_trends: z.array(TopicSchema),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const analysisResponseSchema = zodToJsonSchema(AnalysisSchema, {
  target: "openApi3",
  $refStrategy: "none",
});
