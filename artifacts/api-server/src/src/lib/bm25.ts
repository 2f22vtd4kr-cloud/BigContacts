/**
 * BM25 Keyword Search Index
 *
 * Builds a bounded in-memory inverted index over entity text fields.
 * Refreshed every 5 minutes or on explicit invalidation.
 */

import { db, entitiesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const K1 = 1.5;
const B = 0.75;
const INDEX_TTL_MS = 5 * 60 * 1000;
const MAX_DOC_TEXT_CHARS = 2_000;
const MAX_BM25_INDEX_DOCS = () => {
  const parsed = Number(process.env.APEX_MAX_BM25_INDEX_DOCS);
  if (!Number.isFinite(parsed)) return 100_000;
  return Math.min(500_000, Math.max(1_000, Math.trunc(parsed)));
};

interface IndexDoc { id: number; tokens: string[]; termCounts: Map<string, number>; }
interface BM25Index { docs: IndexDoc[]; idf: Map<string, number>; avgDocLen: number; builtAt: number; }
let _index: BM25Index | null = null;

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
}

async function buildIndex(): Promise<BM25Index> {
  const rows = await db.select({
    id: entitiesTable.id,
    name: entitiesTable.name,
    notes: entitiesTable.notes,
    nationality: entitiesTable.nationality,
    knownResidences: entitiesTable.knownResidences,
    sourceRegistries: entitiesTable.sourceRegistries,
    metadata: entitiesTable.metadata,
    email: entitiesTable.email,
    phone: entitiesTable.phone,
    linkedinUrl: entitiesTable.linkedinUrl,
    estimatedNetWorth: entitiesTable.estimatedNetWorth,
  }).from(entitiesTable).orderBy(desc(entitiesTable.id)).limit(MAX_BM25_INDEX_DOCS());

  const docs: IndexDoc[] = rows.map((e) => {
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(e.metadata ?? "{}"); } catch { /* malformed legacy metadata stays non-fatal */ }
    let nwToken = "";
    if (e.estimatedNetWorth) {
      if (e.estimatedNetWorth >= 100_000_000) nwToken = "ultrahnw";
      else if (e.estimatedNetWorth >= 30_000_000) nwToken = "veryhnw";
      else if (e.estimatedNetWorth >= 4_000_000) nwToken = "hnw";
    }
    const text = [
      e.name, e.name, e.name, e.notes ?? "", e.nationality ?? "", e.knownResidences ?? "",
      e.sourceRegistries ?? "", meta.engineLabel ?? "", meta.state ?? "", meta.nNumber ?? "",
      meta.formType ?? "", meta.bizLocation ?? "", e.email ? e.email.split("@")[0] ?? "" : "",
      e.phone ? "phone mobile tel" : "", e.linkedinUrl ? "linkedin profile" : "", nwToken,
    ].join(" ").slice(0, MAX_DOC_TEXT_CHARS);
    const tokens = tokenize(text);
    const termCounts = new Map<string, number>();
    for (const token of tokens) termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
    return { id: e.id, tokens, termCounts };
  });

  const df = new Map<string, number>();
  for (const doc of docs) for (const term of doc.termCounts.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [term, docFreq] of df) idf.set(term, Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1));
  const avgDocLen = docs.length ? docs.reduce((s, d) => s + d.tokens.length, 0) / docs.length : 1;
  return { docs, idf, avgDocLen, builtAt: Date.now() };
}

async function getIndex(): Promise<BM25Index> { if (!_index || Date.now() - _index.builtAt > INDEX_TTL_MS) _index = await buildIndex(); return _index; }
export function invalidateBM25Index(): void { _index = null; }
export interface BM25Result { id: number; score: number; }

export async function bm25Search(query: string, topK = 100): Promise<BM25Result[]> {
  const index = await getIndex();
  const queryTokens = tokenize(query.slice(0, 2_000));
  const safeTopK = Math.min(Math.max(Math.trunc(Number(topK)) || 100, 1), 100);
  if (queryTokens.length === 0 || index.docs.length === 0) return [];
  const scores = new Map<number, number>();
  for (const qTerm of queryTokens) {
    const idfVal = index.idf.get(qTerm);
    if (!idfVal) continue;
    for (const doc of index.docs) {
      const tf = doc.termCounts.get(qTerm) ?? 0;
      if (tf === 0) continue;
      const dl = doc.tokens.length;
      const bm25 = idfVal * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (dl / index.avgDocLen))));
      scores.set(doc.id, (scores.get(doc.id) ?? 0) + bm25);
    }
  }
  return [...scores.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score).slice(0, safeTopK);
}
