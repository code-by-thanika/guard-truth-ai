import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Search, Trash2 } from "lucide-react";

import { LoadingBlock } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deletePrediction, listPredictions } from "@/lib/detection.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Prediction history — TruthGuard AI" },
      { name: "description", content: "Search, filter and export every fake news prediction you have run." },
      { property: "og:title", content: "Prediction history — TruthGuard AI" },
      { property: "og:description", content: "Your searchable fake news detection history." },
    ],
  }),
  component: HistoryPage,
});

type Filter = "all" | "FAKE" | "REAL";

function HistoryPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const fetchList = useServerFn(listPredictions);
  const removeOne = useServerFn(deletePrediction);

  const { data, isLoading } = useQuery({
    queryKey: ["history", search, filter],
    queryFn: () => fetchList({ data: { search, filter, limit: 200 } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeOne({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const rows = data ?? [];

  const csv = useMemo(() => {
    const head = ["date", "prediction", "confidence", "model", "text"];
    const body = rows.map((r) =>
      [r.created_at, r.prediction, r.confidence, r.model_version ?? "", `"${r.news_text.replace(/"/g, '""')}"`].join(","),
    );
    return [head.join(","), ...body].join("\n");
  }, [rows]);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "truthguard-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("history.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {rows.length} {t("common.rows")}
          </p>
        </div>
        <Button variant="glass" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="size-4" />
          {t("history.export")}
        </Button>
      </div>

      <div className="glass-card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            maxLength={200}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("history.search")}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "FAKE", "REAL"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "ghost"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t("history.all") : f}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label={t("common.loading")} />
      ) : rows.length === 0 ? (
        <p className="glass-card py-16 text-center text-sm text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("history.date")}</th>
                  <th className="px-4 py-3">{t("history.news")}</th>
                  <th className="px-4 py-3">{t("history.prediction")}</th>
                  <th className="px-4 py-3">{t("detect.confidence")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/40">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-2">{r.news_text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          r.prediction === "FAKE"
                            ? "bg-destructive/12 text-destructive"
                            : "bg-success/12 text-success"
                        }`}
                      >
                        {r.prediction}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{Number(r.confidence).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("history.delete")}
                        onClick={() => del.mutate(r.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
