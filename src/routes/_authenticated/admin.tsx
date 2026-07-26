import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Activity, ShieldAlert, Gauge, Upload, Shield } from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import {
  activateModelVersion,
  claimFirstAdmin,
  getAdminAnalytics,
  getMyRole,
  listUsers,
  retrainModel,
} from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — TruthGuard AI" },
      { name: "description", content: "Global analytics, user management and Naïve Bayes model retraining." },
      { property: "og:title", content: "Admin panel — TruthGuard AI" },
      { property: "og:description", content: "Retrain the fake news classifier from Kaggle datasets." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const claim = useServerFn(claimFirstAdmin);
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const fetchUsers = useServerFn(listUsers);
  const train = useServerFn(retrainModel);
  const activate = useServerFn(activateModelVersion);

  const [fakeCsv, setFakeCsv] = useState("");
  const [trueCsv, setTrueCsv] = useState("");

  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const isAdmin = role.data?.isAdmin === true;

  const analytics = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fetchAnalytics(), enabled: isAdmin });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers(), enabled: isAdmin });

  const claimAdmin = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("You are now an administrator.");
        queryClient.invalidateQueries();
      } else toast.error(res.error);
    },
  });

  const retrain = useMutation({
    mutationFn: () => train({ data: { fakeCsv, trueCsv, maxRowsPerClass: 2000, alpha: 0.4, maxFeatures: 6000 } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Trained ${res.version} — accuracy ${res.metrics.accuracy.toFixed(2)}%`);
        queryClient.invalidateQueries();
      } else toast.error(res.error);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const setActive = useMutation({
    mutationFn: (id: string) => activate({ data: { id } }),
    onSuccess: () => {
      toast.success("Model activated");
      queryClient.invalidateQueries();
    },
  });

  if (role.isLoading) return <LoadingBlock label={t("common.loading")} />;

  if (!isAdmin) {
    return (
      <div className="glass-card mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto size-10 text-primary" />
        <h1 className="font-display mt-4 text-xl font-bold">{t("admin.notAdmin")}</h1>
        <Button variant="hero" className="mt-6" disabled={claimAdmin.isPending} onClick={() => claimAdmin.mutate()}>
          {claimAdmin.isPending && <Spinner className="size-4" />}
          {t("admin.claim")}
        </Button>
      </div>
    );
  }

  async function readCsv(file: File, which: "fake" | "true") {
    const text = await file.text();
    if (which === "fake") setFakeCsv(text);
    else setTrueCsv(text);
    toast.success(`${file.name} loaded (${Math.round(text.length / 1024)} KB)`);
  }

  return (
    <div className="animate-fade-up space-y-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("admin.title")}</h1>

      {analytics.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("admin.users")} value={analytics.data.users} icon={Users} />
          <StatCard label={t("dash.total")} value={analytics.data.total} icon={Activity} />
          <StatCard label={t("dash.fake")} value={analytics.data.fakeCount} icon={ShieldAlert} tone="destructive" />
          <StatCard
            label={t("dash.accuracy")}
            value={`${(analytics.data.activeModel.accuracy ?? 0).toFixed(1)}%`}
            hint={analytics.data.activeModel.version}
            icon={Gauge}
            tone="warning"
          />
        </div>
      )}

      <section className="glass-card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">{t("admin.retrain")}</h2>
        <p className="text-sm text-muted-foreground">
          Upload the Kaggle <code>Fake.csv</code> and <code>True.csv</code> files to refit the classifier.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
            <Upload className="size-4" />
            {t("admin.uploadFake")} {fakeCsv ? "✓" : ""}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && readCsv(e.target.files[0], "fake")} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
            <Upload className="size-4" />
            {t("admin.uploadTrue")} {trueCsv ? "✓" : ""}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && readCsv(e.target.files[0], "true")} />
          </label>
          <Button variant="hero" disabled={!fakeCsv || !trueCsv || retrain.isPending} onClick={() => retrain.mutate()}>
            {retrain.isPending && <Spinner className="size-4 border-primary-foreground/40 border-t-primary-foreground" />}
            {retrain.isPending ? t("admin.training") : t("admin.startTraining")}
          </Button>
        </div>
      </section>

      {analytics.data && analytics.data.versions.length > 0 && (
        <section className="glass-card overflow-hidden">
          <h2 className="font-display p-5 pb-3 text-lg font-semibold">{t("admin.versions")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">F1</th>
                  <th className="px-4 py-3">Vocab</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {analytics.data.versions.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-medium">{v.version}</td>
                    <td className="px-4 py-3 tabular-nums">{(v.accuracy ?? 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 tabular-nums">{(v.f1_score ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 tabular-nums">{v.vocab_size ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {v.is_active ? (
                        <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-bold text-success">active</span>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setActive.mutate(v.id)}>
                          {t("admin.activate")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {users.data && (
        <section className="glass-card overflow-hidden">
          <h2 className="font-display p-5 pb-3 text-lg font-semibold">{t("admin.users")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Predictions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {users.data.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.fullName ?? "—"}</td>
                    <td className="px-4 py-3">{u.roles.join(", ") || "user"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {u.predictions} ({u.fake}F / {u.real}R)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
