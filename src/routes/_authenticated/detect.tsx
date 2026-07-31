import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, Sparkles, Upload } from "lucide-react";

import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeNews, extractTextFromImage, type AiAnalysis } from "@/lib/ai.functions";
import { classifyNews } from "@/lib/local-api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/detect")({
  head: () => ({
    meta: [
      { title: "Detect fake news — TruthGuard AI" },
      { name: "description", content: "Analyse a headline, article, .txt file or screenshot with the Naïve Bayes classifier." },
      { property: "og:title", content: "Detect fake news — TruthGuard AI" },
      { property: "og:description", content: "Run the Naïve Bayes + TF-IDF fake news detector." },
    ],
  }),
  component: DetectPage,
});

type Source = "typed" | "pasted" | "file" | "image";

function DetectPage() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [source, setSource] = useState<Source>("typed");
  const [result, setResult] = useState<Awaited<ReturnType<typeof classifyNews>> | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);

  const analyze = useServerFn(analyzeNews);
  const ocr = useServerFn(extractTextFromImage);

  const run = useMutation({
    mutationFn: async () => {
      const prediction = await classifyNews({ text, source });
      setResult(prediction);
      setAnalysis(null);
      const ai = await analyze({
        data: {
          predictionId: prediction.id ?? undefined,
          text,
          label: prediction.label,
          confidence: prediction.confidence,
          language,
        },
      });
      if (ai.ok) setAnalysis(ai.analysis);
      else toast.error(ai.error);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const readImage = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const res = await ocr({ data: { imageDataUrl: dataUrl } });
      if (!res.ok) throw new Error(res.error);
      setText(res.text);
      setSource("image");
      toast.success(t("detect.ocrDone"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  async function handleTxt(file: File) {
    setText((await file.text()).slice(0, 20000));
    setSource("file");
  }

  const isFake = result?.label === "FAKE";

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("detect.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("detect.subtitle")}</p>
      </div>

      <div className="glass-card space-y-4 p-5">
        <Textarea
          rows={9}
          maxLength={20000}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (source !== "typed" && source !== "pasted") setSource("pasted");
          }}
          placeholder={t("detect.placeholder")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="hero" size="lg" disabled={text.trim().length < 30 || run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? <Spinner className="size-4 border-primary-foreground/40 border-t-primary-foreground" /> : <Sparkles className="size-4" />}
            {run.isPending ? t("detect.analysing") : t("detect.analyse")}
          </Button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
            <FileText className="size-4" />
            {t("detect.dropFile")}
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleTxt(e.target.files[0])}
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
            {readImage.isPending ? <Spinner className="size-4" /> : <ImageIcon className="size-4" />}
            {readImage.isPending ? t("detect.ocrRunning") : t("detect.dropImage")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && readImage.mutate(e.target.files[0])}
            />
          </label>

          <Button variant="ghost" onClick={() => { setText(""); setResult(null); setAnalysis(null); }}>
            {t("detect.clear")}
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            <Upload className="mr-1 inline size-3" />
            {text.trim().length} chars
          </span>
        </div>
      </div>

      {result && (
        <div className="grid gap-5 lg:grid-cols-5">
          <section className={`glass-card p-6 lg:col-span-2 ${isFake ? "ring-1 ring-destructive/40" : "ring-1 ring-success/40"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detect.verdict")}</p>
            <p className={`font-display mt-2 text-3xl font-bold ${isFake ? "text-destructive" : "text-success"}`}>
              {isFake ? t("detect.fake") : t("detect.real")}
            </p>
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("detect.confidence")}</span>
                <span className="tabular-nums">{result.confidence.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${isFake ? "bg-destructive" : "bg-success"}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {result.knownTokenCount}/{result.tokenCount} known terms · model {result.modelVersion}
            </p>
            {result.topTokens.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detect.tokens")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.topTokens.map((tk) => (
                    <span key={tk.token} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {tk.token}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="glass-card space-y-5 p-6 lg:col-span-3">
            {!analysis ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                {t("common.loading")}
              </div>
            ) : (
              <>
                <div>
                  <h2 className="font-display text-lg font-semibold">{t("detect.explain")}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{analysis.explanation}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detect.summary")}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{analysis.summary}</p>
                </div>
                {analysis.suspiciousClaims.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detect.claims")}</h3>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                      {analysis.suspiciousClaims.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {analysis.factCheckTips.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detect.tips")}</h3>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                      {analysis.factCheckTips.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
