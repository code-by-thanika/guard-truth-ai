import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { LoadingBlock, Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile, updateProfile } from "@/lib/local-api";
import { useI18n, type Language } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — TruthGuard AI" },
      { name: "description", content: "Update your display name, interface language and theme preference." },
      { property: "og:title", content: "Profile & settings — TruthGuard AI" },
      { property: "og:description", content: "Manage your TruthGuard AI account preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();

  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (data?.full_name) setFullName(data.full_name);
  }, [data?.full_name]);

  const mutation = useMutation({
    mutationFn: () =>
      updateProfile({ fullName: fullName.trim(), language: language as Language, theme: theme as Theme }),
    onSuccess: () => toast.success(t("profile.saved")),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  if (isLoading) return <LoadingBlock label={t("common.loading")} />;

  return (
    <div className="animate-fade-up mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("profile.title")}</h1>

      <div className="glass-card space-y-5 p-6">
        <div className="grid gap-2">
          <Label htmlFor="fullName">{t("profile.name")}</Label>
          <Input id="fullName" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("profile.language")}</Label>
          <div className="flex gap-2">
            {(["en", "hi"] as Language[]).map((l) => (
              <Button key={l} variant={language === l ? "default" : "ghost"} onClick={() => setLanguage(l)}>
                {l === "en" ? "English" : "हिंदी"}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("profile.theme")}</Label>
          <div className="flex gap-2">
            {(["light", "dark"] as Theme[]).map((th) => (
              <Button key={th} variant={theme === th ? "default" : "ghost"} onClick={() => setTheme(th)}>
                {th === "light" ? t("profile.light") : t("profile.dark")}
              </Button>
            ))}
          </div>
        </div>
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("profile.username")}</dt>
            <dd className="font-medium">{data?.username ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("profile.registered")}</dt>
            <dd className="font-medium">
              {data?.created_at ? new Date(data.created_at).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>
        <Button variant="hero" disabled={mutation.isPending || fullName.trim().length === 0} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner className="size-4 border-primary-foreground/40 border-t-primary-foreground" /> : <Save className="size-4" />}
          {t("profile.save")}
        </Button>
      </div>
    </div>
  );
}
