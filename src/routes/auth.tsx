import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Lock, User as UserIcon, AtSign } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { loginWithPassword, registerAccount } from "@/lib/local-api";
import { RegisterInput } from "@/lib/auth-shared";

const SearchSchema = z.object({
  mode: z.enum(["login", "register"]).default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => SearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — TruthGuard AI" },
      {
        name: "description",
        content: "Sign in with your username or register a TruthGuard AI account to analyse news.",
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

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [navigate, sessionLoading, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        if (password !== confirmPassword) throw new Error(t("auth.mismatch"));
        const parsed = RegisterInput.parse({ fullName, username, password });
        await registerAccount(parsed);
        toast.success(t("auth.registered"));
        setPassword("");
        setConfirmPassword("");
        navigate({ to: "/auth", search: { mode: "login" } });
      } else {
        try {
          await loginWithPassword(username, password);
        } catch {
          throw new Error(t("auth.invalid"));
        }
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? t("common.error"))
          : error instanceof Error
            ? error.message
            : t("common.error");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "register" ? t("auth.createAccount") : t("auth.welcome");

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
                    maxLength={80}
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  required
                  autoComplete="username"
                  maxLength={24}
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                />
              </div>
            </div>

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
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    maxLength={72}
                    autoComplete="new-password"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" disabled={busy} className="mt-1">
              {busy && <Spinner className="size-4 border-primary-foreground/40 border-t-primary-foreground" />}
              {mode === "register" ? t("auth.register") : t("auth.login")}
            </Button>
          </form>

          <div className="mt-6 text-sm">
            {mode === "login" ? (
              <Link to="/auth" search={{ mode: "register" }} className="font-medium text-primary hover:underline">
                {t("auth.register")}
              </Link>
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
