import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Mail, Lock, User as UserIcon } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { authErrorMessage } from "@/lib/auth-errors";
import { logAuthConfiguration } from "@/lib/auth-debug";


const SearchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => SearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — TruthGuard AI" },
      {
        name: "description",
        content: "Sign in or create a TruthGuard AI account to analyse news and track your history.",
      },
      { property: "og:title", content: "Sign in — TruthGuard AI" },
      { property: "og:description", content: "Access the TruthGuard AI fake news detector." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    logAuthConfiguration();
  }, []);

  useEffect(() => {
    if (!sessionLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [navigate, sessionLoading, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: normalizedName },
          },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Registration did not create an authenticated account.");
        if (data.user.identities && data.user.identities.length === 0) {
          toast.error("An account with this email already exists — sign in, reset your password, or use Google.");
          navigate({ to: "/auth", search: { mode: "login" }, replace: true });
          return;
        }
        if (data.session) {
          toast.success("Account created. You're signed in.");
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Account created. Check your inbox to confirm your email, then sign in.");
          navigate({ to: "/auth", search: { mode: "login" }, replace: true });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent — check your inbox.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        if (!data.user) throw new Error("Login did not return an authenticated account.");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setBusy(false);
        toast.error(authErrorMessage(result.error));
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      setBusy(false);
      toast.error(authErrorMessage(error));
    }
  }

  if (sessionLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Spinner className="size-6" />
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }


  const title =
    mode === "register"
      ? t("auth.createAccount")
      : mode === "forgot"
        ? t("auth.forgot")
        : t("auth.welcome");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[30rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t("nav.home")}
        </Link>

        <div className="glass-card animate-fade-up p-7 sm:p-8">
          <Logo />
          <h1 className="font-display mt-6 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Naïve Bayes fake news detection, explained.
          </p>

          <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    required
                    maxLength={100}
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="grid gap-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    maxLength={72}
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" disabled={busy} className="mt-1">
              {busy && <Spinner className="size-4 border-primary-foreground/40 border-t-primary-foreground" />}
              {mode === "register"
                ? t("auth.register")
                : mode === "forgot"
                  ? t("auth.reset")
                  : t("auth.login")}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" size="lg" className="w-full" onClick={handleGoogle} disabled={busy}>
                <GoogleIcon />
                {t("auth.google")}
              </Button>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
            {mode === "login" ? (
              <>
                <Link to="/auth" search={{ mode: "forgot" }} className="text-muted-foreground hover:text-primary">
                  {t("auth.forgot")}
                </Link>
                <Link to="/auth" search={{ mode: "register" }} className="font-medium text-primary hover:underline">
                  {t("auth.register")}
                </Link>
              </>
            ) : (
              <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
                {t("auth.backToLogin")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.2h6.5c-.1 1.1-.8 2.7-2.3 3.8l-.1.1 3.4 2.6c2-1.8 3-4.5 3-8.5z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.5-2.8l-3.6-2.7c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8l-.1.1-3.6 2.7C3.6 21.3 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.5 14.8c-.3-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3V10L1.8 7.2A11.9 11.9 0 0 0 .5 12.5c0 1.9.5 3.7 1.3 5.3l3.7-3z" />
      <path fill="#EA4335" d="M12 4.7c2.1 0 3.6.9 4.4 1.7l3.2-3.1C17.6 1.5 15.1.5 12 .5 7.5.5 3.6 3.2 1.8 7.2l3.7 2.9C6.4 7.3 9 4.7 12 4.7z" />
    </svg>
  );
}
