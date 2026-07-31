/**
 * Local (browser-only) application API.
 *
 * These functions replace the previous backend calls: authentication,
 * profile, prediction history, dashboard/admin analytics and model
 * retraining all run against `localStorage`.
 */
import { csvToDocuments } from "./ml/csv";
import { predictWithModel, trainAndEvaluate } from "./ml/nb";
import {
  findUserByUsername,
  getCurrentUser,
  getModels,
  getPredictions,
  getSeedModel,
  getUsers,
  hashPassword,
  makeSalt,
  requireCurrentUser,
  saveModels,
  savePredictions,
  saveUsers,
  setSessionUserId,
  type ActiveModel,
  type LocalPrediction,
  type LocalUser,
} from "./local-db";
import { RegisterInput } from "./auth-shared";
import { ClassifyInput, HistoryInput, RetrainInput } from "./schemas";

/* ------------------------------- auth ----------------------------------- */

export async function registerAccount(input: { fullName: string; username: string; password: string }) {
  const parsed = RegisterInput.parse(input);
  const username = parsed.username.toLowerCase();
  if (findUserByUsername(username)) throw new Error("That username is already taken.");

  const salt = makeSalt();
  const users = getUsers();
  const user: LocalUser = {
    id: crypto.randomUUID(),
    fullName: parsed.fullName,
    username,
    salt,
    passwordHash: await hashPassword(parsed.password, salt),
    // The first registered account owns the admin panel.
    role: users.length === 0 ? "admin" : "user",
    language: "en",
    theme: "light",
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return { ok: true as const, username };
}

export async function loginWithPassword(username: string, password: string) {
  const user = findUserByUsername(username);
  if (!user) throw new Error("Invalid username or password.");
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error("Invalid username or password.");
  setSessionUserId(user.id);
  return user;
}

export function logout() {
  setSessionUserId(null);
}

/* ------------------------------ profile --------------------------------- */

export async function getProfile() {
  const user = requireCurrentUser();
  return {
    id: user.id,
    username: user.username,
    full_name: user.fullName,
    language: user.language,
    theme: user.theme,
    created_at: user.createdAt,
  };
}

export async function updateProfile(data: {
  fullName: string;
  language: "en" | "hi";
  theme: "light" | "dark";
}) {
  const user = requireCurrentUser();
  saveUsers(
    getUsers().map((u) =>
      u.id === user.id
        ? { ...u, fullName: data.fullName.trim().slice(0, 80), language: data.language, theme: data.theme }
        : u,
    ),
  );
  return { ok: true };
}

/* ------------------------------- model ---------------------------------- */

export function loadActiveModel(): ActiveModel {
  const active = getModels().find((m) => m.isActive);
  if (active) {
    return { model: active.model, version: active.version, source: "local", accuracy: active.accuracy };
  }
  const seed = getSeedModel();
  return {
    model: seed.model,
    version: seed.model.version,
    source: "bootstrap",
    accuracy: seed.metrics.accuracy,
  };
}

/* ---------------------------- classification ---------------------------- */

export async function classifyNews(input: { text: string; source: LocalPrediction["source"] }) {
  const data = ClassifyInput.parse(input);
  const user = requireCurrentUser();
  const active = loadActiveModel();
  const result = predictWithModel(active.model, data.text);

  const row: LocalPrediction = {
    id: crypto.randomUUID(),
    userId: user.id,
    newsText: data.text.slice(0, 20000),
    source: data.source,
    prediction: result.label,
    confidence: result.confidence,
    modelVersion: active.version,
    createdAt: new Date().toISOString(),
  };
  savePredictions([row, ...getPredictions()]);

  return {
    id: row.id,
    createdAt: row.createdAt,
    label: result.label,
    confidence: result.confidence,
    probabilities: result.probabilities,
    topTokens: result.topTokens,
    tokenCount: result.tokenCount,
    knownTokenCount: result.knownTokenCount,
    modelVersion: active.version,
    modelSource: active.source,
    modelAccuracy: active.accuracy,
  };
}

/* ------------------------------ history --------------------------------- */

export async function listPredictions(input: {
  search?: string;
  filter?: "all" | "FAKE" | "REAL";
  limit?: number;
}) {
  const data = HistoryInput.parse(input);
  const user = requireCurrentUser();
  const needle = data.search?.trim().toLowerCase() ?? "";

  return getPredictions()
    .filter((r) => r.userId === user.id)
    .filter((r) => (data.filter === "all" ? true : r.prediction === data.filter))
    .filter((r) => (needle ? r.newsText.toLowerCase().includes(needle) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, data.limit)
    .map((r) => ({
      id: r.id,
      news_text: r.newsText,
      source: r.source,
      prediction: r.prediction,
      confidence: r.confidence,
      model_version: r.modelVersion,
      created_at: r.createdAt,
    }));
}

export async function deletePrediction(id: string) {
  const user = requireCurrentUser();
  savePredictions(getPredictions().filter((r) => !(r.id === id && r.userId === user.id)));
  return { ok: true };
}

/* ----------------------------- dashboard -------------------------------- */

export async function getDashboardStats() {
  const user = requireCurrentUser();
  const active = loadActiveModel();
  const all = getPredictions()
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const fake = all.filter((r) => r.prediction === "FAKE");
  const real = all.filter((r) => r.prediction === "REAL");
  const avgConfidence =
    all.length === 0
      ? 0
      : Math.round((all.reduce((s, r) => s + r.confidence, 0) / all.length) * 100) / 100;

  const daily: Array<{ day: string; fake: number; real: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    daily.push({
      day: key,
      fake: fake.filter((r) => r.createdAt.slice(0, 10) === key).length,
      real: real.filter((r) => r.createdAt.slice(0, 10) === key).length,
    });
  }

  return {
    total: all.length,
    fakeCount: fake.length,
    realCount: real.length,
    avgConfidence,
    modelAccuracy: active.accuracy,
    modelVersion: active.version,
    modelSource: active.source,
    daily,
    recent: all.slice(0, 6).map((r) => ({
      id: r.id,
      excerpt: r.newsText.slice(0, 140),
      prediction: r.prediction,
      confidence: r.confidence,
      source: r.source,
      created_at: r.createdAt,
    })),
  };
}

/* -------------------------------- admin --------------------------------- */

export async function getMyRole() {
  const user = getCurrentUser();
  return { isAdmin: user?.role === "admin" };
}

/** Claim admin while nobody else holds the role (single-machine demo setup). */
export async function claimFirstAdmin() {
  const user = requireCurrentUser();
  const users = getUsers();
  if (users.some((u) => u.role === "admin" && u.id !== user.id)) {
    return { ok: false as const, error: "An administrator already exists on this device." };
  }
  saveUsers(users.map((u) => (u.id === user.id ? { ...u, role: "admin" as const } : u)));
  return { ok: true as const };
}

function assertAdminUser() {
  const user = requireCurrentUser();
  if (user.role !== "admin") throw new Error("Forbidden: admin access required.");
  return user;
}

export async function listUsers() {
  assertAdminUser();
  const predictions = getPredictions();
  return getUsers()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => {
      const own = predictions.filter((p) => p.userId === u.id);
      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        language: u.language,
        createdAt: u.createdAt,
        roles: [u.role],
        predictions: own.length,
        fake: own.filter((p) => p.prediction === "FAKE").length,
        real: own.filter((p) => p.prediction === "REAL").length,
      };
    });
}

export async function getAdminAnalytics() {
  assertAdminUser();
  const active = loadActiveModel();
  const rows = getPredictions();

  const bySource = (["typed", "pasted", "file", "image"] as const).map((source) => ({
    source,
    count: rows.filter((r) => r.source === source).length,
  }));

  const daily: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    daily.push({ day: key, count: rows.filter((r) => r.createdAt.slice(0, 10) === key).length });
  }

  return {
    users: getUsers().length,
    total: rows.length,
    fakeCount: rows.filter((r) => r.prediction === "FAKE").length,
    realCount: rows.filter((r) => r.prediction === "REAL").length,
    avgConfidence:
      rows.length === 0
        ? 0
        : Math.round((rows.reduce((s, r) => s + r.confidence, 0) / rows.length) * 100) / 100,
    bySource,
    daily,
    activeModel: {
      version: active.version,
      source: active.source,
      accuracy: active.accuracy,
      vocabSize: active.model.terms.length,
    },
    versions: getModels().map((v) => ({
      id: v.id,
      version: v.version,
      algorithm: v.algorithm,
      accuracy: v.accuracy,
      f1_score: v.f1,
      precision_score: v.precision,
      recall_score: v.recall,
      vocab_size: v.vocabSize,
      train_size: v.trainSize,
      test_size: v.testSize,
      is_active: v.isActive,
      created_at: v.createdAt,
    })),
  };
}

/** Retrain the Naive Bayes classifier from uploaded Kaggle CSVs. */
export async function retrainModel(input: {
  fakeCsv: string;
  trueCsv: string;
  maxRowsPerClass?: number;
  alpha?: number;
  maxFeatures?: number;
}) {
  assertAdminUser();
  const data = RetrainInput.parse(input);

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

  const entry = {
    id: crypto.randomUUID(),
    version,
    algorithm: "MultinomialNB + TF-IDF",
    accuracy: metrics.accuracy,
    precision: metrics.precision,
    recall: metrics.recall,
    f1: metrics.f1,
    trainSize: metrics.trainSize,
    testSize: metrics.testSize,
    vocabSize: metrics.vocabSize,
    isActive: true,
    createdAt: new Date().toISOString(),
    model,
  };

  try {
    saveModels([entry, ...getModels().map((m) => ({ ...m, isActive: false }))]);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not store the trained model.",
    };
  }

  return { ok: true as const, version, metrics, fakeDocs: fakeDocs.length, realDocs: realDocs.length };
}

export async function activateModelVersion(id: string) {
  assertAdminUser();
  saveModels(getModels().map((m) => ({ ...m, isActive: m.id === id })));
  return { ok: true };
}
