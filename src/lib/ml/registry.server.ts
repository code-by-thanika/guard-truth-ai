/**
 * Server-side model registry.
 *
 * Resolution order for the active model:
 *   1. the `is_active` row in `model_versions` (a dataset-trained model)
 *   2. the bootstrap model trained on the seed corpus (cached in memory)
 */
import { SEED_CORPUS } from "./seed-corpus";
import { trainAndEvaluate, type NaiveBayesModel, type TrainingMetrics } from "./nb";

let seedModel: { model: NaiveBayesModel; metrics: TrainingMetrics } | null = null;

/** Train (once per worker) and return the bootstrap model. */
export function getSeedModel() {
  if (!seedModel) {
    seedModel = trainAndEvaluate(SEED_CORPUS, {
      alpha: 0.4,
      maxFeatures: 4000,
      version: "bootstrap-v1",
    });
  }
  return seedModel;
}

export interface ActiveModel {
  model: NaiveBayesModel;
  /** Human readable version label shown in the UI. */
  version: string;
  source: "database" | "bootstrap";
  accuracy: number | null;
}

/** Load the active trained model for prediction. */
export async function loadActiveModel(): Promise<ActiveModel> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("model_versions")
      .select("version, model, accuracy")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.model) {
      return {
        model: data.model as unknown as NaiveBayesModel,
        version: data.version,
        source: "database",
        accuracy: data.accuracy === null ? null : Number(data.accuracy),
      };
    }
  } catch (error) {
    console.error("[ml] failed to load trained model, falling back to bootstrap", error);
  }

  const seed = getSeedModel();
  return {
    model: seed.model,
    version: seed.model.version,
    source: "bootstrap",
    accuracy: seed.metrics.accuracy,
  };
}
