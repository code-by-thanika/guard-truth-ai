/**
 * AI server functions (Lovable AI Gateway only — no database, no auth).
 * Used for verdict explanations, OCR text extraction and the assistant chat.
 */
import { createServerFn } from "@tanstack/react-start";
import { AnalyzeInput, ChatInput, OcrInput } from "@/lib/schemas";

export interface AiAnalysis {
  explanation: string;
  summary: string;
  suspiciousClaims: string[];
  factCheckTips: string[];
  credibilityScore: number;
}

/** Explain a verdict: why, summary, suspicious claims, fact-check tips. */
export const analyzeNews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
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
        ...data.messages,
      ]);
      return { ok: true as const, reply };
    } catch (error) {
      const message = error instanceof AiError ? error.message : "The assistant is unavailable.";
      console.error("[chat] failed", error);
      return { ok: false as const, error: message, reply: "" };
    }
  });
