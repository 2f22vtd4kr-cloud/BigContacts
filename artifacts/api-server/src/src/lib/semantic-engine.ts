/**
 * Semantic Engine — Phase G1
 *
 * Provides true sentence-embedding semantic search using
 * @huggingface/transformers (Xenova/all-MiniLM-L6-v2, ONNX, 384-dim).
 */

let env: any = null;
let pipeline: any = null;
let _transformersLoad: Promise<boolean> | null = null;
async function loadTransformers(): Promise<boolean> {
  if (pipeline) return true;
  if (_transformersLoad) return _transformersLoad;
  _transformersLoad = (async () => {
    try {
      const transformersModule = "@huggingface/transformers";
      const mod = await import(transformersModule);
      env = mod.env;
      pipeline = mod.pipeline;
      return true;
    } catch { return false; }
  })();
  return _transformersLoad;
}
import { getRedisClient } from "./redis";

type FeatureExtractionPipeline = any;
let _pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
let _pipelineLoaded = false;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (process.env.APEX_SKIP_SEMANTIC === "1" || process.env.APEX_TINY_HOST === "1" || process.env.REPL_ID) {
    throw new Error("semantic model skipped on tiny host (APEX_SKIP_SEMANTIC / APEX_TINY_HOST)");
  }
  if (!_pipelinePromise) {
    const ok = await loadTransformers();
    if (!ok || !pipeline) throw new Error("semantic model unavailable (@huggingface/transformers not installed)");
    if (env) { env.cacheDir = "/tmp/hf-cache"; env.allowLocalModels = false; }
    console.log("[semantic-engine] Loading all-MiniLM-L6-v2 (first time, ~23 MB download)...");
    _pipelinePromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "fp32" })
      .then((p: FeatureExtractionPipeline) => { _pipelineLoaded = true; console.log("[semantic-engine] Model ready."); return p; })
      .catch((err: unknown) => { _pipelinePromise = null; throw err; });
  }
  return _pipelinePromise;
}

export function isModelLoaded(): boolean { return _pipelineLoaded; }

function isNonZeroEmbedding(data: Float32Array): boolean {
  let magnitude = 0;
  for (const value of data) magnitude += value * value;
  return magnitude > 1e-12;
}

export async function embedText(text: string): Promise<Float32Array> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text.slice(0, 512), { pooling: "mean", normalize: true });
  const data = output.data as Float32Array;
  if (!(data instanceof Float32Array) || data.length !== 384 || !isNonZeroEmbedding(data)) {
    throw new Error("semantic model returned an invalid or empty embedding");
  }
  return data;
}

function cosineSim(a: Float32Array, b: Float32Array): number {
  if (a.length !== 384 || b.length !== 384 || !isNonZeroEmbedding(a) || !isNonZeroEmbedding(b)) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < 384; i++) { dot += a[i]! * b[i]!; normA += a[i]! * a[i]!; normB += b[i]! * b[i]!; }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

const _embCache = new Map<number, Float32Array>();
const boundedEnv = (name: string, fallback: number, min: number, max: number): number => {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};
const MAX_EMBEDDING_CACHE_ENTRIES = () => boundedEnv("APEX_MAX_EMBEDDING_CACHE_ENTRIES", 25_000, 100, 100_000);

function putBoundedEmbedding(entityId: number, emb: Float32Array): void {
  if (emb.length !== 384 || !Number.isInteger(entityId) || entityId <= 0 || !isNonZeroEmbedding(emb)) return;
  _embCache.delete(entityId);
  while (_embCache.size >= MAX_EMBEDDING_CACHE_ENTRIES()) {
    const oldest = _embCache.keys().next().value as number | undefined;
    if (oldest === undefined) break;
    _embCache.delete(oldest);
  }
  _embCache.set(entityId, emb);
}

export function getEmbeddingCacheSize(): number { return _embCache.size; }

export function entityToEmbedText(entity: { name: string; notes?: string | null; nationality?: string | null; knownResidences?: string | null; metadata?: string | null }): string {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(entity.metadata ?? "{}"); } catch { /* malformed legacy metadata stays non-fatal */ }
  return [entity.name, entity.name, entity.notes ?? "", entity.nationality ?? "", entity.knownResidences ?? "", meta["engineLabel"] ?? "", meta["state"] ?? "", meta["nNumber"] ?? "", meta["formType"] ?? "", meta["bizLocation"] ?? ""].filter(Boolean).join(" ").slice(0, 512);
}

const EMB_KEY_PREFIX = "emb:v1:";
const EMB_TTL_SECONDS = 60 * 60 * 24 * 14;
function float32ToBase64(arr: Float32Array): string { return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString("base64"); }
function base64ToFloat32(b64: string): Float32Array | null {
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.byteLength !== 384 * 4) return null;
    const emb = new Float32Array(buf.buffer, buf.byteOffset, 384);
    return isNonZeroEmbedding(emb) ? emb : null;
  } catch { return null; }
}

export async function storeEmbedding(entityId: number, emb: Float32Array): Promise<void> {
  if (emb.length !== 384 || !Number.isInteger(entityId) || entityId <= 0 || !isNonZeroEmbedding(emb)) return;
  putBoundedEmbedding(entityId, emb);
  try {
    const redis = getRedisClient();
    if (redis) await redis.set(`${EMB_KEY_PREFIX}${entityId}`, float32ToBase64(emb), "EX", EMB_TTL_SECONDS);
  } catch { /* cache failure does not corrupt the entity record */ }
}

export async function loadEmbeddingsFromRedis(): Promise<number> {
  try {
    const redis = getRedisClient();
    if (!redis) return 0;
    let cursor = "0";
    let loaded = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${EMB_KEY_PREFIX}*`, "COUNT", 500);
      cursor = nextCursor;
      if (keys.length === 0) continue;
      const values = await redis.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        if (_embCache.size >= MAX_EMBEDDING_CACHE_ENTRIES()) break;
        const key = keys[i], val = values[i];
        if (!key || !val) continue;
        const entityId = Number.parseInt(key.slice(EMB_KEY_PREFIX.length), 10);
        if (!Number.isSafeInteger(entityId) || entityId <= 0) continue;
        const emb = base64ToFloat32(val);
        if (!emb) continue;
        putBoundedEmbedding(entityId, emb);
        loaded++;
      }
      if (_embCache.size >= MAX_EMBEDDING_CACHE_ENTRIES()) break;
    } while (cursor !== "0");
    if (loaded > 0) console.log(`[semantic-engine] Loaded ${loaded} embeddings from Redis (bounded at ${MAX_EMBEDDING_CACHE_ENTRIES()}).`);
    return loaded;
  } catch (err) {
    console.warn("[semantic-engine] Redis load failed:", (err as Error).message);
    return 0;
  }
}

export interface SemanticEngineResult { id: number; score: number; }

export async function semanticEngineSearch(query: string, topK = 100, filterIds?: ReadonlySet<number>): Promise<SemanticEngineResult[]> {
  if (_embCache.size < 100) return [];
  const safeQuery = query.trim().slice(0, 2_000);
  const safeTopK = Math.min(Math.max(Math.trunc(Number(topK)) || 100, 1), 100);
  if (!safeQuery) return [];
  let queryEmb: Float32Array;
  try { queryEmb = await embedText(safeQuery); } catch { return []; }
  const scored: SemanticEngineResult[] = [];
  for (const [id, emb] of _embCache) {
    if (filterIds && !filterIds.has(id)) continue;
    scored.push({ id, score: cosineSim(queryEmb, emb) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, safeTopK);
}

export function getAllEmbeddings(): ReadonlyMap<number, Float32Array> { return _embCache; }
export function warmUpSemanticEngine(): void { getEmbeddingPipeline().then(() => loadEmbeddingsFromRedis()).catch((err: unknown) => console.warn("[semantic-engine] Warm-up failed (non-fatal):", (err as Error).message)); }