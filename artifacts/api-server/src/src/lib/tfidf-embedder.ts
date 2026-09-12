/**
 * TF-IDF Vector Space Model
 *
 * Approximates semantic search using cosine similarity over TF-IDF vectors.
 * Includes bigrams for better phrase matching ("private jet", "jet owner").
 * No neural model or external API — fully deterministic.
 *
 * Refreshed every 5 minutes (same TTL as BM25 index).
 */

import { db, entitiesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const CORPUS_TTL_MS = 5 * 60 * 1000;
const MAX_DOC_TEXT_CHARS = 2_000;
const MAX_TFIDF_CORPUS_DOCS = () => {
  const parsed = Number(process.env.APEX_MAX_TFIDF_CORPUS_DOCS);
  if (!Number.isFinite(parsed)) return 100_000;
  return Math.min(500_000, Math.max(1_000, Math.trunc(parsed)));
};

interface CorpusDoc { id: number; vector: Map<string, number>; magnitude: number; }
interface TFIDFCorpus { docs: CorpusDoc[]; idf: Map<string, number>; builtAt: number; }
let _corpus: TFIDFCorpus | null = null;

function tokenize(text: string): string[] {
  const unigrams = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  const bigrams = unigrams.slice(0, -1).map((t, i) => `${t}_${unigrams[i + 1]}`);
  return [...unigrams, ...bigrams];
}

function magnitude(v: Map<string, number>): number { let s = 0; for (const val of v.values()) s += val * val; return Math.sqrt(s); }

async function buildCorpus(): Promise<TFIDFCorpus> {
  // A bounded, recent corpus prevents an ever-growing entity table from turning
  // every five-minute refresh into an unbounded CPU/heap allocation. The neural
  // semantic path has its own bounded cache; this index follows the same rule.
  const rows = await db.select({ id: entitiesTable.id, name: entitiesTable.name, notes: entitiesTable.notes, nationality: entitiesTable.nationality, knownResidences: entitiesTable.knownResidences, sourceRegistries: entitiesTable.sourceRegistries, metadata: entitiesTable.metadata })
    .from(entitiesTable)
    .orderBy(desc(entitiesTable.id))
    .limit(MAX_TFIDF_CORPUS_DOCS());

  const raw = rows.map((e) => {
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(e.metadata ?? "{}"); } catch { /* malformed legacy metadata stays non-fatal */ }
    const text = [e.name, e.name, e.name, e.notes ?? "", e.nationality ?? "", e.knownResidences ?? "", meta.engineLabel ?? "", meta.state ?? ""].join(" ").slice(0, MAX_DOC_TEXT_CHARS);
    return { id: e.id, tokens: tokenize(text) };
  });

  const df = new Map<string, number>();
  for (const doc of raw) for (const term of new Set(doc.tokens)) df.set(term, (df.get(term) ?? 0) + 1);
  const N = raw.length;
  const idf = new Map<string, number>();
  for (const [term, freq] of df) idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);

  const docs: CorpusDoc[] = raw.map((doc) => {
    const tf = new Map<string, number>();
    for (const term of doc.tokens) tf.set(term, (tf.get(term) ?? 0) + 1);
    const len = Math.max(1, doc.tokens.length);
    const vector = new Map<string, number>();
    for (const [term, count] of tf) { const idfVal = idf.get(term); if (idfVal) vector.set(term, (count / len) * idfVal); }
    return { id: doc.id, vector, magnitude: magnitude(vector) };
  });
  return { docs, idf, builtAt: Date.now() };
}

async function getCorpus(): Promise<TFIDFCorpus> { if (!_corpus || Date.now() - _corpus.builtAt > CORPUS_TTL_MS) _corpus = await buildCorpus(); return _corpus; }
export function invalidateTFIDFCorpus(): void { _corpus = null; }
export interface SemanticResult { id: number; score: number; }

export async function semanticSearch(query: string, topK = 100): Promise<SemanticResult[]> {
  const corpus = await getCorpus();
  if (corpus.docs.length === 0) return [];
  const safeQuery = query.trim().slice(0, 2_000);
  const safeTopK = Math.min(Math.max(Math.trunc(Number(topK)) || 100, 1), 100);
  const queryTokens = tokenize(safeQuery);
  if (queryTokens.length === 0) return [];

  const qtf = new Map<string, number>();
  for (const term of queryTokens) qtf.set(term, (qtf.get(term) ?? 0) + 1);
  const qlen = Math.max(1, queryTokens.length);
  const qvec = new Map<string, number>();
  for (const [term, count] of qtf) { const idfVal = corpus.idf.get(term); if (idfVal) qvec.set(term, (count / qlen) * idfVal); }
  const qmag = magnitude(qvec);
  if (qmag === 0) return [];

  const results: SemanticResult[] = [];
  for (const doc of corpus.docs) {
    if (doc.magnitude === 0) continue;
    let dot = 0;
    for (const [term, qval] of qvec) { const dval = doc.vector.get(term); if (dval) dot += qval * dval; }
    const cosine = dot / (qmag * doc.magnitude);
    if (cosine > 0.01) results.push({ id: doc.id, score: cosine });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, safeTopK);
}
