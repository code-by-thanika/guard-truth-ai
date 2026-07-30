/** Shared validation + helpers for the local username/password auth flow. */
import { z } from "zod";

/** Usernames are the only identity; a deterministic internal address is derived from them. */
export const LOGIN_EMAIL_DOMAIN = "truthguard.local";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dots, underscores or hyphens only.");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(72, "Password must be at most 72 characters.");

export const RegisterInput = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
  username: usernameSchema,
  password: passwordSchema,
});

export function usernameToLoginEmail(username: string) {
  return `${username.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
}
