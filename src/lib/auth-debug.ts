/** Development-only auth configuration diagnostics. Never logs secret values. */
const FIREBASE_ENV_NAMES = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

function envValue(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function logAuthConfiguration() {
  if (!import.meta.env.DEV) return;

  const firebaseStatus = Object.fromEntries(
    FIREBASE_ENV_NAMES.map((name) => [name, Boolean(envValue(name))]),
  );

  console.info("[TruthGuard Auth] Configuration check", {
    provider: "Lovable Cloud Auth",
    hasBackendUrl: Boolean(envValue("VITE_SUPABASE_URL")),
    hasPublishableKey: Boolean(envValue("VITE_SUPABASE_PUBLISHABLE_KEY")),
    firebaseEnvPresent: Object.values(firebaseStatus).some(Boolean),
    firebaseEnvComplete: Object.values(firebaseStatus).every(Boolean),
    firebaseStatus,
  });
}