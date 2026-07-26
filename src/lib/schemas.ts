/** Zod schemas for the detection server functions (kept out of the
 * server-function module so code-splitting can't strip them). */
import { z } from "zod";

export const ClassifyInput = z.object({
  text: z.string().trim().min(30, "Please provide at least 30 characters of news text.").max(20000),
  source: z.enum(["typed", "pasted", "file", "image"]).default("typed"),
});

export const AnalyzeInput = z.object({
  predictionId: z.string().uuid().optional(),
  text: z.string().trim().min(30).max(20000),
  label: z.enum(["FAKE", "REAL"]),
  confidence: z.number().min(0).max(100),
  language: z.enum(["en", "hi"]).default("en"),
});

export const OcrInput = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(9_000_000),
});

export const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  language: z.enum(["en", "hi"]).default("en"),
});

export const HistoryInput = z.object({
  search: z.string().max(200).optional(),
  filter: z.enum(["all", "FAKE", "REAL"]).default("all"),
  limit: z.number().int().min(1).max(500).default(100),
});

export const IdInput = z.object({ id: z.string().uuid() });

export const RetrainInput = z.object({
  fakeCsv: z.string().min(1).max(12_000_000),
  trueCsv: z.string().min(1).max(12_000_000),
  maxRowsPerClass: z.number().int().min(50).max(6000).default(2000),
  alpha: z.number().min(0.01).max(2).default(0.4),
  maxFeatures: z.number().int().min(500).max(20000).default(6000),
});

/** Throws unless the `has_role` check returned true for the admin role. */
export function assertAdmin(isAdmin: unknown) {
  if (isAdmin !== true) throw new Error("Forbidden: admin access required.");
}
