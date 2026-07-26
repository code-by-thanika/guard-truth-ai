import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ShieldAlert, ShieldCheck, Gauge, ArrowRight } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { StatCard } from "@/components/StatCard";
import { LoadingBlock } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/lib/detection.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TruthGuard AI" },
      { name: "description", content: "Your fake news detection stats, verdict distribution and recent analyses." },
      { property: "og:title", content: "Dashboard — TruthGuard AI" },
      { property: "og:description", content: "Track fake vs real verdicts and model accuracy." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchStats() });

  if (isLoading || !data) return <LoadingBlock label={t("common.loading")} />;

  const pie = [
    { name: t("dash.fake"), value: data.fakeCount, color: "var(--destructive)" },
    { name: t("dash.real"), value: data.realCount, color: "var(--success)" },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("dash.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Model {data.modelVersion} · {data.modelSource}
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/detect">
            {t("nav.detect")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dash.total")} value={data.total} icon={Activity} />
        <StatCard label={t("dash.fake")} value={data.fakeCount} icon={ShieldAlert} tone="destructive" />
        <StatCard label={t("dash.real")} value={data.realCount} icon={ShieldCheck} tone="success" />
        <StatCard
          label={t("dash.accuracy")}
          value={`${data.modelAccuracy.toFixed(1)}%`}
          hint={`Avg confidence ${data.avgConfidence}%`}
          icon={Gauge}
          tone="warning"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="glass-card p-5 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold">{t("dash.activity")}</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="fake" name={t("dash.fake")} fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="real" name={t("dash.real")} fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">{t("dash.distribution")}</h2>
          <div className="mt-4 h-72">
            {data.total === 0 ? (
              <p className="pt-16 text-center text-sm text-muted-foreground">{t("dash.empty")}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {pie.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="glass-card p-5">
        <h2 className="font-display text-lg font-semibold">{t("dash.recent")}</h2>
        {data.recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("dash.empty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/70">
            {data.recent.map((r) => (
              <li key={r.id} className="flex items-start gap-4 py-3">
                <span
                  className={`mt-0.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    r.prediction === "FAKE" ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success"
                  }`}
                >
                  {r.prediction}
                </span>
                <p className="line-clamp-2 flex-1 text-sm text-foreground/90">{r.excerpt}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{r.confidence.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
