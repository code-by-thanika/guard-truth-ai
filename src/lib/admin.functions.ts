/**
 * Admin server functions: user list, global analytics and Naive Bayes
 * retraining from the Kaggle Fake.csv / True.csv dataset.
 *
 * Every handler re-verifies the caller's admin role through RLS-scoped
 * queries before touching privileged data.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RetrainInput = z.object({
  fakeCsv: z.string().min(1).max(12_000_000),
  trueCsv: z.string().min(1).max(12_000_000),
  maxRowsPerClass: z.number().int().min(50).max(6000).default(2000),
  alpha: z.number().min(0.01).max(2).default(0.4),
  maxFeatures: z.number().int().min(500).max(20000).default(6000),
});

type AuthedContext = { supabase: { rpc: (fn: string, args: unknown) => PromiseLike<{ data: unknown }> } };

/** Throws unless the caller holds the admin role. */
async function assertAdmin(context: AuthedContext, userId: string) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden: admin access required.");
}

/** Is the current user an admin? Used to show/hide the admin nav item. */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

/**
 * Bootstrap the first administrator: succeeds only while no admin exists,
 * so the project owner can claim the admin panel after signing up.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      return { ok: false as const, error: "An administrator already exists for this project." };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** All registered users with their role and prediction counts. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, { data: predictions }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, language, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("predictions").select("user_id, prediction"),
    ]);

    return (profiles ?? []).map((profile) => {
      const own = (predictions ?? []).filter((p) => p.user_id === profile.id);
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        language: profile.language,
        createdAt: profile.created_at,
        roles: (roles ?? []).filter((r) => r.user_id === profile.id).map((r) => r.role),
        predictions: own.length,
        fake: own.filter((p) => p.prediction === "FAKE").length,
        real: own.filter((p) => p.prediction === "REAL").length,
      };
    });
  });

/** Global analytics across every user. */
export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadActiveModel } = await import("./ml/registry.server");

    const [{ data: predictions }, { count: users }, { data: versions }, active] = await Promise.all([
      supabaseAdmin
        .from("predictions")
        .select("prediction, confidence, source, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("model_versions")
        .select(
          "id, version, algorithm, accuracy, precision_score, recall_score, f1_score, train_size, test_size, vocab_size, is_active, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      loadActiveModel(),
    ]);

    const rows = predictions ?? [];
    const bySource = ["typed", "pasted", "file", "image"].map((source) => ({
      source,
      count: rows.filter((r) => r.source === source).length,
    }));

    const days: Array<{ day: string; count: number }> = [];
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      days.push({ day: key, count: rows.filter((r) => r.created_at.slice(0, 10) === key).length });
    }

    return {
      users: users ?? 0,
      total: rows.length,
      fakeCount: rows.filter((r) => r.prediction === "FAKE").length,
      realCount: rows.filter((r) => r.prediction === "REAL").length,
      avgConfidence:
        rows.length === 0
          ? 0
          : Math.round((rows.reduce((s, r) => s + Number(r.confidence), 0) / rows.length) * 100) /
            100,
      bySource,
      daily: days,
      activeModel: {
        version: active.version,
        source: active.source,
        accuracy: active.accuracy,
        vocabSize: active.model.terms.length,
      },
      versions: (versions ?? []).map((v) => ({
        ...v,
        accuracy: v.accuracy === null ? null : Number(v.accuracy),
        precision_score: v.precision_score === null ? null : Number(v.precision_score),
        recall_score: v.recall_score === null ? null : Number(v.recall_score),
        f1_score: v.f1_score === null ? null : Number(v.f1_score),
      })),
    };
  });

/**
 * Retrain the Naive Bayes classifier from the uploaded Kaggle CSVs.
 * Runs an 80/20 split for metrics, refits on the whole dataset, then stores
 * and activates the new model version.
 */
export const retrainModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RetrainInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, context.userId);

    const { csvToDocuments } = await import("./ml/csv");
    const { trainAndEvaluate } = await import("./ml/nb");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const fakeDocs = csvToDocuments(data.fakeCsv, data.maxRowsPerClass);
    const realDocs = csvToDocuments(data.trueCsv, data.maxRowsPerClass);

    if (fakeDocs.length < 20 || realDocs.length < 20) {
      return {
        ok: false as const,
        error: "Both files need at least 20 usable rows with a `text` or `title` column.",
      };
    }

    const version = `dataset-${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, "")}`;
    const { model, metrics } = trainAndEvaluate(
      [
        ...fakeDocs.map((text) => ({ text, label: "FAKE" as const })),
        ...realDocs.map((text) => ({ text, label: "REAL" as const })),
      ],
      { alpha: data.alpha, maxFeatures: data.maxFeatures, version },
    );

    await supabaseAdmin.from("model_versions").update({ is_active: false }).eq("is_active", true);

    const { error } = await supabaseAdmin.from("model_versions").insert({
      version,
      algorithm: "MultinomialNB + TF-IDF",
      accuracy: metrics.accuracy,
      precision_score: metrics.precision,
      recall_score: metrics.recall,
      f1_score: metrics.f1,
      train_size: metrics.trainSize,
      test_size: metrics.testSize,
      vocab_size: metrics.vocabSize,
      model: model as unknown as import("@/integrations/supabase/types").Json,
      is_active: true,
      trained_by: context.userId,
    });
    if (error) return { ok: false as const, error: error.message };

    return {
      ok: true as const,
      version,
      metrics,
      fakeDocs: fakeDocs.length,
      realDocs: realDocs.length,
    };
  });

/** Activate a previously trained model version. */
export const activateModelVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("model_versions").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabaseAdmin
      .from("model_versions")
      .update({ is_active: true })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
