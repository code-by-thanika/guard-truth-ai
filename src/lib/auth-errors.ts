/** Maps backend auth errors to clear, human-readable messages. */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const msg = raw.toLowerCase();

  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Network error — check your connection and try again.";
  if (msg.includes("invalid login credentials"))
    return "No account matches that email and password. If you haven't registered yet, create an account first.";
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

  return raw || "Something went wrong. Please try again.";
}
