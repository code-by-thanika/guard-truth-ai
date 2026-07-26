/**
 * Detection server functions: Naive Bayes classification, prediction
 * history CRUD, dashboard statistics, Gemini-style AI analysis and OCR.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AnalyzeInput,
  ChatInput,
  ClassifyInput,
  HistoryInput,
  IdInput,
  OcrInput,
} from "@/lib/schemas";


/** Run the ML pipeline and store the result in the user's history. */
export const classifyNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { loadActiveModel } = await import("./ml/registry.server");
    const { predictWithModel } = await import("./ml/nb");

    const active = await loadActiveModel();
    const result = predictWithModel(active.model, data.text);

    const { data: row, error } = await context.supabase
      .from("predictions")
      .insert({
        user_id: context.userId,
        news_text: data.text.slice(0, 20000),
        source: data.source,
        prediction: result.label,
        confidence: result.confidence,
        model_version: active.version,
      })
      .select("id, created_at")
      .single();

    if (error) console.error("[predictions] insert failed", error);

    return {
      id: row?.id ?? null,
      createdAt: row?.created_at ?? new Date().toISOString(),
      label: result.label,
      confidence: result.confidence,
      probabilities: result.probabilities,
      topTokens: result.topTokens,
      tokenCount: result.tokenCount,
      knownTokenCount: result.knownTokenCount,
      modelVersion: active.version,
      modelSource: active.source,
      modelAccuracy: active.accuracy,
    };
  });

export interface AiAnalysis {
  explanation: string;
  summary: string;
  suspiciousClaims: string[];
  factCheckTips: string[];
  credibilityScore: number;
}

/** Gemini-style explanation layer: why, summary, claims, fact-check tips. */
export const analyzeNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { callAiJson, AiError } = await import("./ai.server");

    const languageName = data.language === "hi" ? "Hindi (Devanagari script)" : "English";
    try {
      const analysis = await callAiJson<AiAnalysis>([
        {
          role: "system",
          content:
            "You are TruthGuard AI, a media-literacy assistant. A Naive Bayes classifier has already made the verdict; " +
            "your job is ONLY to explain it, summarise the article, flag suspicious claims and give fact-checking tips. " +
            `Reply in ${languageName}. Respond with strict JSON matching: ` +
            '{"explanation": string, "summary": string, "suspiciousClaims": string[], "factCheckTips": string[], "credibilityScore": number (0-100)}. ' +
            "Keep explanation under 120 words, summary under 80 words, and 2-4 items per array.",
        },
        {
          role: "user",
          content: `Classifier verdict: ${data.label} with ${data.confidence}% confidence.\n\nArticle:\n"""${data.text.slice(0, 8000)}"""`,
        },
      ]);

      const safe: AiAnalysis = {
        explanation: String(analysis.explanation ?? ""),
        summary: String(analysis.summary ?? ""),
        suspiciousClaims: (analysis.suspiciousClaims ?? []).slice(0, 6).map(String),
        factCheckTips: (analysis.factCheckTips ?? []).slice(0, 6).map(String),
        credibilityScore: Math.max(0, Math.min(100, Number(analysis.credibilityScore ?? 50))),
      };

      if (data.predictionId) {
        await context.supabase
          .from("predictions")
          .update({ explanation: safe as unknown as import("@/integrations/supabase/types").Json })
          .eq("id", data.predictionId)
          .eq("user_id", context.userId);
      }

      return { ok: true as const, analysis: safe };
    } catch (error) {
      const message =
        error instanceof AiError ? error.message : "Could not generate the AI analysis right now.";
      console.error("[ai] analyze failed", error);
      return { ok: false as const, error: message };
    }
  });

/** Extract text from an uploaded image (OCR stage of the pipeline). */
export const extractTextFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OcrInput.parse(input))
  .handler(async ({ data }) => {
    const { callAi, AiError } = await import("./ai.server");
    try {
      const text = await callAi([
        {
          role: "system",
          content:
            "You are an OCR engine. Return ONLY the readable text found in the image, preserving reading order. " +
            "No commentary, no markdown. If there is no text, return an empty string.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text from this news screenshot." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ]);
      return { ok: true as const, text: text.trim() };
    } catch (error) {
      const message =
        error instanceof AiError ? error.message : "Could not read text from that image.";
      console.error("[ocr] failed", error);
      return { ok: false as const, error: message, text: "" };
    }
  });

/** Fake-news awareness chatbot. */
export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const { callAi, AiError } = await import("./ai.server");
    const languageName = data.language === "hi" ? "Hindi (Devanagari script)" : "English";
    try {
      const reply = await callAi([
        {
          role: "system",
          content:
            "You are TruthGuard AI's assistant. You help people understand misinformation, fact-checking methods, " +
            "source verification, and how the Naive Bayes + TF-IDF detector in this app works. Be concise, practical " +
            `and use markdown. Reply in ${languageName}. Decline unrelated requests politely.`,
        },
        // The model is stateless: always send the full conversation history.
        ...data.messages,
      ]);
      return { ok: true as const, reply };
    } catch (error) {
      const message = error instanceof AiError ? error.message : "The assistant is unavailable.";
      console.error("[chat] failed", error);
      return { ok: false as const, error: message, reply: "" };
    }
  });

/** Prediction history with search + label filter. */
export const listPredictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HistoryInput.parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("predictions")
      .select("id, news_text, source, prediction, confidence, model_version, explanation, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.filter !== "all") query = query.eq("prediction", data.filter);
    if (data.search?.trim()) query = query.ilike("news_text", `%${data.search.trim()}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Delete one of the caller's own predictions. */
export const deletePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("predictions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Dashboard aggregates for the signed-in user. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadActiveModel } = await import("./ml/registry.server");

    const [{ data: rows, error }, active] = await Promise.all([
      context.supabase
        .from("predictions")
        .select("id, news_text, prediction, confidence, source, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(500),
      loadActiveModel(),
    ]);
    if (error) throw new Error(error.message);

    const all = rows ?? [];
    const fake = all.filter((r) => r.prediction === "FAKE");
    const real = all.filter((r) => r.prediction === "REAL");
    const avgConfidence =
      all.length === 0
        ? 0
        : Math.round((all.reduce((s, r) => s + Number(r.confidence), 0) / all.length) * 100) / 100;

    // Last 7 days grouped for the bar chart.
    const days: Array<{ day: string; fake: number; real: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      days.push({
        day: key,
        fake: fake.filter((r) => r.created_at.slice(0, 10) === key).length,
        real: real.filter((r) => r.created_at.slice(0, 10) === key).length,
      });
    }

    return {
      total: all.length,
      fakeCount: fake.length,
      realCount: real.length,
      avgConfidence,
      modelAccuracy: active.accuracy,
      modelVersion: active.version,
      modelSource: active.source,
      daily: days,
      recent: all.slice(0, 6).map((r) => ({
        id: r.id,
        excerpt: r.news_text.slice(0, 140),
        prediction: r.prediction,
        confidence: Number(r.confidence),
        source: r.source,
        created_at: r.created_at,
      })),
    };
  });
