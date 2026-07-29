/** Maps backend auth errors to clear, human-readable messages. */
function readErrorField(error: unknown, field: "code" | "message"): string {
  if (error instanceof Error && field === "message") return error.message;
  if (error && typeof error === "object" && field in error) {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "string" ? value : "";
  }
  return "";
}

const firebaseMessages: Record<string, string> = {
  "auth/user-not-found": "auth/user-not-found — no account exists for this email.",
  "auth/wrong-password": "auth/wrong-password — the password is incorrect.",
  "auth/email-already-in-use": "auth/email-already-in-use — an account with this email already exists.",
  "auth/invalid-credential": "auth/invalid-credential — the email or password was not accepted.",
  "auth/network-request-failed": "auth/network-request-failed — check your connection and try again.",
};

export function authErrorMessage(error: unknown): string {
  const code = readErrorField(error, "code");
  const raw = readErrorField(error, "message") || String(error ?? "");
  const msg = `${code} ${raw}`.toLowerCase();

  if (code && firebaseMessages[code]) return firebaseMessages[code];

  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Network error — check your connection and try again.";
  if (msg.includes("invalid login credentials"))
    return "Invalid login credentials — the email/password was not accepted. If you registered with Google, use Continue with Google or reset your password.";
  if (msg.includes("email not confirmed"))
    return "Your email isn't verified yet. Open the confirmation link we sent you, then sign in.";
  if (msg.includes("user already registered") || msg.includes("already been registered"))
    return "An account with this email already exists — try signing in instead.";
  if (msg.includes("password should be at least"))
    return "Password is too short — use at least 6 characters.";
  if (msg.includes("invalid email")) return "That email address looks invalid.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (msg.includes("user not found")) return "No account found with that email.";
  if (msg.includes("same password"))
    return "The new password must be different from your current one.";

  return raw || code || "Something went wrong. Please try again.";
}
