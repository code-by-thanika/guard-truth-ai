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
  detail: string;
  constructor(status: number, message: string, detail = "") {
    super(detail ? `${message} (HTTP ${status}: ${detail})` : message);
    this.status = status;
    this.detail = detail;
  }
}

/** Map a gateway HTTP status to a user-facing cause. */
function describeStatus(status: number): string {
  switch (status) {
    case 401:
      return "AI authentication failed (401) — the LOVABLE_API_KEY is missing, invalid or not deployed.";
    case 402:
      return "AI credits exhausted (402) — add credits to this workspace to continue.";
    case 403:
      return "AI access forbidden (403) — this key is not allowed to use the requested model.";
    case 429:
      return "AI rate limit reached (429) — please try again in a moment.";
    case 400:
      return "The AI request was rejected (400) — invalid model or request body.";
    default:
      return status >= 500
        ? `AI provider error (${status}) — the service is temporarily unavailable.`
        : `AI request failed (${status}).`;
  }
}

/** Call the gateway and return the assistant text. */
export async function callAi(messages: AiMessage[], model = DEFAULT_MODEL): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    throw new AiError(
      401,
      "AI is not configured — LOVABLE_API_KEY is missing from the server environment.",
    );
  }

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({ model, messages }),
    });
  } catch (networkError) {
    console.error("[ai] network failure calling gateway", networkError);
    throw new AiError(
      0,
      "Could not reach the AI service (network error).",
      networkError instanceof Error ? networkError.message : String(networkError),
    );
  }

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    console.error(`[ai] gateway error ${response.status}: ${body}`);
    throw new AiError(response.status, describeStatus(response.status), body);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[ai] empty gateway response", JSON.stringify(payload).slice(0, 500));
    throw new AiError(502, "The AI service returned an empty response.");
  }
  return content;
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
