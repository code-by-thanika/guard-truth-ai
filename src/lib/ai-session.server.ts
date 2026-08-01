/**
 * Server-side session guard for the AI Gateway endpoints (server-only).
 *
 * The app stores accounts in the browser, so the browser router guard cannot
 * protect the HTTP endpoints TanStack Start exposes for each server function.
 * These helpers add a real server-side check: the AI endpoints only run for
 * callers holding an encrypted, server-signed session cookie, and each session
 * is capped so the endpoints cannot be used as an unmetered AI proxy.
 */
import { getSession, updateSession } from "@tanstack/react-start/server";

export interface AiSessionData {
  userId: string;
  username: string;
  issuedAt: number;
}

const SESSION_NAME = "truthguard-session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionConfig() {
  const password = process.env["APP_SESSION_SECRET"];
  if (!password) {
    throw new Error("Server session is not configured (APP_SESSION_SECRET is missing).");
  }
  return {
    password,
    name: SESSION_NAME,
    maxAge: MAX_AGE_SECONDS,
    cookie: { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" },
  };
}

/** Mint the encrypted session cookie for a signed-in local account. */
export async function issueAiSession(userId: string, username: string) {
  await updateSession<AiSessionData>(sessionConfig(), {
    userId,
    username,
    issuedAt: Date.now(),
  });
}

/* --------------------------- per-session budget --------------------------- */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS_PER_WINDOW = 60;
const budgets = new Map<string, { count: number; resetAt: number }>();

function consumeBudget(userId: string) {
  const now = Date.now();
  const entry = budgets.get(userId);
  if (!entry || entry.resetAt <= now) {
    budgets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (entry.count >= MAX_CALLS_PER_WINDOW) {
    throw new Error("AI usage limit reached for this session. Please try again later.");
  }
  entry.count += 1;
}

/**
 * Throws unless the caller presents a valid server-signed session and is
 * within its AI usage budget. Returns the session's user id.
 */
export async function requireAiSession(): Promise<string> {
  const session = await getSession<AiSessionData>(sessionConfig());
  const userId = session.data?.userId;
  if (!userId) {
    throw new Error("Unauthorized: sign in to use the AI features.");
  }
  consumeBudget(userId);
  return userId;
}
