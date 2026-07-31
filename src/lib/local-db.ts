/**
 * Browser-local database for TruthGuard AI.
 *
 * Everything (users, session, prediction history, trained models) lives in
 * `localStorage`, so the app runs in Lovable Preview and on Vercel with no
 * backend, no environment variables and no Supabase configuration.
 */
import type { NaiveBayesModel, TrainingMetrics } from "./ml/nb";

const PREFIX = "truthguard.";
export const KEYS = {
  users: `${PREFIX}users`,
  session: `${PREFIX}session`,
  predictions: `${PREFIX}predictions`,
  models: `${PREFIX}models`,
} as const;

export const SESSION_EVENT = "truthguard:session";

export interface LocalUser {
  id: string;
  fullName: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: "admin" | "user";
  language: "en" | "hi";
  theme: "light" | "dark";
  createdAt: string;
}

export interface LocalPrediction {
  id: string;
  userId: string;
  newsText: string;
  source: "typed" | "pasted" | "file" | "image";
  prediction: "FAKE" | "REAL";
  confidence: number;
  modelVersion: string;
  createdAt: string;
}

export interface LocalModelVersion {
  id: string;
  version: string;
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  trainSize: number;
  testSize: number;
  vocabSize: number;
  isActive: boolean;
  createdAt: string;
  model: NaiveBayesModel;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("Local storage is full. Remove old history or trained models and try again.");
  }
}

/* ------------------------------- users ---------------------------------- */

export function getUsers(): LocalUser[] {
  return read<LocalUser[]>(KEYS.users, []);
}

export function saveUsers(users: LocalUser[]) {
  write(KEYS.users, users);
}

export function findUserByUsername(username: string) {
  const needle = username.trim().toLowerCase();
  return getUsers().find((u) => u.username.toLowerCase() === needle) ?? null;
}

export function findUserById(id: string) {
  return getUsers().find((u) => u.id === id) ?? null;
}

/* ------------------------------ password -------------------------------- */

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function makeSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

/** Salted SHA-256 password hash (no plain-text password is ever stored). */
export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

/* ------------------------------- session -------------------------------- */

export function getSessionUserId(): string | null {
  return read<string | null>(KEYS.session, null);
}

export function setSessionUserId(id: string | null) {
  if (!isBrowser()) return;
  if (id) window.localStorage.setItem(KEYS.session, JSON.stringify(id));
  else window.localStorage.removeItem(KEYS.session);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getCurrentUser(): LocalUser | null {
  const id = getSessionUserId();
  return id ? findUserById(id) : null;
}

export function requireCurrentUser(): LocalUser {
  const user = getCurrentUser();
  if (!user) throw new Error("You need to sign in first.");
  return user;
}

/* ----------------------------- predictions ------------------------------ */

export function getPredictions(): LocalPrediction[] {
  return read<LocalPrediction[]>(KEYS.predictions, []);
}

export function savePredictions(rows: LocalPrediction[]) {
  // Keep storage bounded so the quota is never a problem in a demo project.
  write(KEYS.predictions, rows.slice(0, 1000));
}

/* ------------------------------- models --------------------------------- */

export function getModels(): LocalModelVersion[] {
  return read<LocalModelVersion[]>(KEYS.models, []);
}

export function saveModels(models: LocalModelVersion[]) {
  write(KEYS.models, models.slice(0, 5));
}

export interface ActiveModel {
  model: NaiveBayesModel;
  version: string;
  source: "local" | "bootstrap";
  accuracy: number | null;
}

let seedModel: { model: NaiveBayesModel; metrics: TrainingMetrics } | null = null;

/** Train the bootstrap seed model once per page session. */
export function getSeedModel() {
  if (!seedModel) {
    // Lazily required so the seed corpus is only parsed when needed.
    const { SEED_CORPUS } = require("./ml/seed-corpus") as typeof import("./ml/seed-corpus");
    const { trainAndEvaluate } = require("./ml/nb") as typeof import("./ml/nb");
    seedModel = trainAndEvaluate(SEED_CORPUS, {
      alpha: 0.4,
      maxFeatures: 4000,
      version: "bootstrap-v1",
    });
  }
  return seedModel;
}
