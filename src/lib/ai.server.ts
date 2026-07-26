/**
 * Lovable AI Gateway helper (server-only).
 * Used for prediction explanations, summaries, fact-check tips, the chatbot
 * and OCR-style text extraction from uploaded images.
 */
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const DEFAULT_MODEL = "google/gemini-3.6-flash";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Call the gateway and return the assistant text. */
export async function callAi(messages: AiMessage[], model = DEFAULT_MODEL): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiError(500, "AI is not configured (missing key).");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[ai] gateway error ${response.status}: ${body}`);
    if (response.status === 429) throw new AiError(429, "AI rate limit reached. Try again shortly.");
    if (response.status === 402) throw new AiError(402, "AI credits exhausted for this workspace.");
    throw new AiError(response.status, "The AI service is temporarily unavailable.");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "";
}

/** Ask the model for JSON and parse it defensively. */
export async function callAiJson<T>(messages: AiMessage[], model = DEFAULT_MODEL): Promise<T> {
  const raw = await callAi(messages, model);
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(candidate) as T;
}
