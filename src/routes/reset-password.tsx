/** Public route where password-recovery links land. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — TruthGuard AI" },
      { name: "description", content: "Choose a new password for your TruthGuard AI account." },
      { property: "og:title", content: "Reset password — TruthGuard AI" },
      { property: "og:description", content: "Choose a new password for your TruthGuard AI account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setRecovery(isRecovery || Boolean(data.session));
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop" />
      <div className="w-full max-w-md">
        <div className="glass-card p-7 sm:p-8">
          <Logo />
          <h1 className="font-display mt-6 text-2xl font-bold tracking-tight">Set a new password</h1>
          {recovery ? (
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
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
              <Button type="submit" variant="hero" size="lg" disabled={busy}>
                {busy && <Spinner className="size-4 border-primary-foreground/40 border-t-primary-foreground" />}
                Update password
              </Button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              This link is invalid or has expired. Request a new reset email from the{" "}
              <Link to="/auth" search={{ mode: "forgot" }} className="text-primary hover:underline">
                forgot password
              </Link>{" "}
              page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
