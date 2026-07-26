/**
 * TruthGuard AI - Machine Learning core
 * ------------------------------------------------------------------
 * A dependency-free implementation of the classic fake-news pipeline:
 *
 *   1. Text cleaning (lowercase, strip punctuation/digits/URLs)
 *   2. Stopword removal (NLTK English stopword list)
 *   3. TF-IDF vectorisation (smooth IDF + L2 normalisation, as sklearn)
 *   4. Multinomial Naive Bayes classification (Laplace/Lidstone alpha)
 *   5. Confidence score from the softmax of the class log-scores
 *
 * The maths mirrors `sklearn.feature_extraction.text.TfidfVectorizer`
 * and `sklearn.naive_bayes.MultinomialNB` so results are comparable to
 * a Python notebook trained on the same dataset.
 */

/** NLTK English stopword list (plus a few news-domain fillers). */
export const STOPWORDS = new Set(
  `i me my myself we our ours ourselves you you're you've you'll you'd your yours yourself
   yourselves he him his himself she she's her hers herself it it's its itself they them their
   theirs themselves what which who whom this that that'll these those am is are was were be
   been being have has had having do does did doing a an the and but if or because as until
   while of at by for with about against between into through during before after above below
   to from up down in out on off over under again further then once here there when where why
   how all any both each few more most other some such no nor not only own same so than too
   very s t can will just don don't should should've now d ll m o re ve y ain aren aren't
   couldn couldn't didn didn't doesn doesn't hadn hadn't hasn hasn't haven haven't isn isn't
   ma mightn mightn't mustn mustn't needn needn't shan shan't shouldn shouldn't wasn wasn't
   weren weren't won won't wouldn wouldn't said says reuters via amp`
    .split(/\s+/)
    .filter(Boolean),
);

/** Class labels used across the app. */
export type Label = "FAKE" | "REAL";

/** Serialisable trained model (stored as JSONB in the database). */
export interface NaiveBayesModel {
  version: string;
  /** Vocabulary terms; index = feature id. */
  terms: string[];
  /** Inverse document frequency per feature. */
  idf: number[];
  /** log P(class) */
  logPrior: Record<Label, number>;
  /** log P(term | class) per feature. */
  logLikelihood: Record<Label, number[]>;
  alpha: number;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  trainSize: number;
  testSize: number;
  vocabSize: number;
  confusion: { tp: number; fp: number; tn: number; fn: number };
}

export interface Sample {
  text: string;
  label: Label;
}

/* ------------------------------------------------------------------ */
/* 1 + 2. Text cleaning and tokenisation                              */
/* ------------------------------------------------------------------ */

/** Lowercase, drop URLs, punctuation and digits; collapse whitespace. */
export function cleanText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean -> split -> remove stopwords and very short tokens. */
export function tokenize(raw: string): string[] {
  return cleanText(raw)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/** Term-frequency map for a single document. */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  return tf;
}

/* ------------------------------------------------------------------ */
/* 3. TF-IDF vectorisation                                            */
/* ------------------------------------------------------------------ */

interface Vocabulary {
  terms: string[];
  index: Map<string, number>;
  idf: number[];
}

/**
 * Build the vocabulary + IDF weights from the training documents.
 * Features are ranked by document frequency and capped at `maxFeatures`
 * (the equivalent of TfidfVectorizer(max_features=...)).
 */
function buildVocabulary(docs: string[][], maxFeatures: number, minDf: number): Vocabulary {
  const df = new Map<string, number>();
  for (const tokens of docs) {
    for (const term of new Set(tokens)) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const terms = [...df.entries()]
    .filter(([, count]) => count >= minDf)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxFeatures)
    .map(([term]) => term);

  const n = docs.length;
  const index = new Map<string, number>();
  const idf: number[] = [];
  terms.forEach((term, i) => {
    index.set(term, i);
    // Smooth IDF, identical to sklearn: ln((1 + n) / (1 + df)) + 1
    idf.push(Math.log((1 + n) / (1 + (df.get(term) ?? 0))) + 1);
  });

  return { terms, index, idf };
}

/** Sparse TF-IDF vector: feature index -> L2-normalised weight. */
export function vectorize(
  tokens: string[],
  index: Map<string, number>,
  idf: number[],
): Array<[number, number]> {
  const tf = termFrequency(tokens);
  const raw: Array<[number, number]> = [];
  for (const [term, count] of tf) {
    const i = index.get(term);
    if (i === undefined) continue;
    raw.push([i, count * idf[i]]);
  }
  const norm = Math.sqrt(raw.reduce((sum, [, w]) => sum + w * w, 0));
  if (norm === 0) return raw;
  return raw.map(([i, w]) => [i, w / norm] as [number, number]);
}

/* ------------------------------------------------------------------ */
/* 4. Multinomial Naive Bayes                                         */
/* ------------------------------------------------------------------ */

export interface TrainOptions {
  alpha?: number;
  maxFeatures?: number;
  minDf?: number;
  version?: string;
}

/** Fit TF-IDF + MultinomialNB on the given labelled samples. */
export function trainNaiveBayes(samples: Sample[], options: TrainOptions = {}): NaiveBayesModel {
  const alpha = options.alpha ?? 1;
  const maxFeatures = options.maxFeatures ?? 4000;
  const minDf = options.minDf ?? 1;

  const docs = samples.map((s) => tokenize(s.text));
  const { terms, index, idf } = buildVocabulary(docs, maxFeatures, minDf);
  const v = terms.length;

  const labels: Label[] = ["FAKE", "REAL"];
  const counts: Record<Label, Float64Array> = {
    FAKE: new Float64Array(v),
    REAL: new Float64Array(v),
  };
  const docsPerClass: Record<Label, number> = { FAKE: 0, REAL: 0 };

  docs.forEach((tokens, docIndex) => {
    const label = samples[docIndex].label;
    docsPerClass[label] += 1;
    for (const [i, weight] of vectorize(tokens, index, idf)) {
      counts[label][i] += weight;
    }
  });

  const total = samples.length || 1;
  const logPrior = {} as Record<Label, number>;
  const logLikelihood = {} as Record<Label, number[]>;

  for (const label of labels) {
    logPrior[label] = Math.log((docsPerClass[label] + 1) / (total + labels.length));
    const classTotal = counts[label].reduce((sum, x) => sum + x, 0);
    const denominator = classTotal + alpha * v;
    const row = new Array<number>(v);
    for (let i = 0; i < v; i += 1) {
      row[i] = Math.log((counts[label][i] + alpha) / denominator);
    }
    logLikelihood[label] = row;
  }

  return {
    version: options.version ?? `v${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, "")}`,
    terms,
    idf,
    logPrior,
    logLikelihood,
    alpha,
  };
}

export interface PredictionResult {
  label: Label;
  /** Confidence for the predicted class, 0-100. */
  confidence: number;
  probabilities: Record<Label, number>;
  /** Tokens that pushed the decision the most, strongest first. */
  topTokens: Array<{ token: string; weight: number; towards: Label }>;
  tokenCount: number;
  knownTokenCount: number;
}

/** Classify a document with the trained model. */
export function predictWithModel(model: NaiveBayesModel, text: string): PredictionResult {
  const index = new Map(model.terms.map((term, i) => [term, i] as const));
  const tokens = tokenize(text);
  const vector = vectorize(tokens, index, model.idf);

  const scores: Record<Label, number> = {
    FAKE: model.logPrior.FAKE,
    REAL: model.logPrior.REAL,
  };
  const contributions: Array<{ token: string; weight: number; towards: Label }> = [];

  for (const [i, weight] of vector) {
    const fake = weight * model.logLikelihood.FAKE[i];
    const real = weight * model.logLikelihood.REAL[i];
    scores.FAKE += fake;
    scores.REAL += real;
    const delta = fake - real;
    contributions.push({
      token: model.terms[i],
      weight: Math.abs(delta),
      towards: delta > 0 ? "FAKE" : "REAL",
    });
  }

  // Softmax over the two class log-scores -> calibrated-ish probabilities.
  const max = Math.max(scores.FAKE, scores.REAL);
  const expFake = Math.exp(scores.FAKE - max);
  const expReal = Math.exp(scores.REAL - max);
  const sum = expFake + expReal;
  const probabilities: Record<Label, number> = {
    FAKE: expFake / sum,
    REAL: expReal / sum,
  };

  const label: Label = probabilities.FAKE >= probabilities.REAL ? "FAKE" : "REAL";

  return {
    label,
    confidence: Math.round(probabilities[label] * 10000) / 100,
    probabilities,
    topTokens: contributions.sort((a, b) => b.weight - a.weight).slice(0, 8),
    tokenCount: tokens.length,
    knownTokenCount: vector.length,
  };
}

/* ------------------------------------------------------------------ */
/* 5. Train / test split and evaluation                               */
/* ------------------------------------------------------------------ */

/** Deterministic pseudo-random shuffle (seeded) so runs are repeatable. */
export function shuffle<T>(items: T[], seed = 42): T[] {
  const output = [...items];
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

/**
 * Train on 80% of the data, evaluate on the held-out 20%, then refit on
 * everything so the shipped model uses the full dataset.
 */
export function trainAndEvaluate(
  samples: Sample[],
  options: TrainOptions = {},
): { model: NaiveBayesModel; metrics: TrainingMetrics } {
  const data = shuffle(samples);
  const splitAt = Math.max(1, Math.floor(data.length * 0.8));
  const train = data.slice(0, splitAt);
  const test = data.slice(splitAt);

  const evalModel = trainNaiveBayes(train, options);

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const sample of test) {
    const { label } = predictWithModel(evalModel, sample.text);
    // "Positive" class = FAKE (the class we care about detecting).
    if (label === "FAKE" && sample.label === "FAKE") tp += 1;
    else if (label === "FAKE" && sample.label === "REAL") fp += 1;
    else if (label === "REAL" && sample.label === "REAL") tn += 1;
    else fn += 1;
  }

  const evaluated = test.length || 1;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);

  const model = trainNaiveBayes(data, options);

  return {
    model,
    metrics: {
      accuracy: (tp + tn) / evaluated,
      precision,
      recall,
      f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
      trainSize: train.length,
      testSize: test.length,
      vocabSize: model.terms.length,
      confusion: { tp, fp, tn, fn },
    },
  };
}
