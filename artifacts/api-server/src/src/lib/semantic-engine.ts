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
      const mod = await import("@huggingface/transformers");
      env = mod.env;
      pipeline = mod.pipeline;
      return true;
    } catch {
      return false;
    }
  })();
  return _transformersLoad;
}
import { getRedisClient } from "./redis";

type FeatureExtractionPipeline = any;
let _pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
let _pipelineLoaded = false;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (
    process.env.APEX_SKIP_SEMANTIC === "1" ||
    process.env.APEX_TINY_HOST === "1" ||
    process.env.REPL_ID
  ) {
    throw new Error("semantic model skipped on tiny host (APEX_SKIP_SEMANTIC / APEX_TINY_HOST)");
  }
  if (!_pipelinePromise) {
    const ok = await loadTransformers();
    if (!ok || !pipeline) {
      throw new Error("semantic model unavailable (@huggingface/transformers not installed)");
    }
    if (env) {
      env.cacheDir = "/tmp/hf-cache";
      env.allowLocalModels = false;
    }
    console.log("[semantic-engine] Loading all-MiniLM-L6-v2 (first time, ~23 MB download)...");
    _pipelinePromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "fp32" },
    ).then((p: FeatureExtractionPipeline) => {
      _pipelineLoaded = true;
      console.log("[semantic-engine] Model ready.");
      return p;
    }).catch((err: unknown) => {
      _pipelinePromise = null;
      throw err;
    });
  }
  return _pipelinePromise;
}

export function isModelLoaded(): boolean {
  return _pipelineLoaded;
}

export async function embedText(text: string): Promise<Float32Array> {
  try {
    const pipe = await getEmbeddingPipeline();
    const output = await pipe(text.slice(0, 512), { pooling: "mean", normalize: true });
    return output.data as Float32Array;
  } catch (err: any) {
    if (String(err?.message || err).includes("skipped on tiny host")) {
      return new Float32Array(384);
    }
    throw err;
  }
}

function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

const _embCache = new Map<number, Float32Array>();

export function getEmbeddingCacheSize(): number {
  return _embCache.size;
}

export function entityToEmbedText(entity: {
  name: string;
  notes?: string | null;
  nationality?: string | null;
  knownResidences?: string | null;
  metadata?: string | null;
}): string {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(entity.metadata ?? "{}"); } catch { /* */ }

  return [
    entity.name, entity.name,
    entity.notes ?? "",
    entity.nationality ?? "",
    entity.knownResidences ?? "",
    meta["engineLabel"] ?? "",
    meta["state"] ?? "",
    meta["nNumber"] ?? "",
    meta["formType"] ?? "",
    meta["bizLocation"] ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 512);
}

const EMB_KEY_PREFIX = "emb:v1:";
const EMB_TTL_SECONDS = 60 * 60 * 24 * 14;

function float32ToBase64(arr: Float32Array): string {
  return Buffer.from(arr.buffer).toString("base64");
}

function base64ToFloat32(b64: string): Float32Array {
  const buf = Buffer.from(b64, "base64");
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export async function storeEmbedding(entityId: number, emb: Float32Array): Promise<void> {
  _embCache.set(entityId, emb);
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(`${EMB_KEY_PREFIX}${entityId}`, float32ToBase64(emb), "EX", EMB_TTL_SECONDS);
    }
  } catch {
  }
}

export async function loadEmbeddingsFromRedis(): Promise<number> {
  try {
    const redis = await getRedisClient();
    if (!redis) return 0;

    let cursor = "0";
    let loaded = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${EMB_KEY_PREFIX}*`, "COUNT", 500);
      cursor = nextCursor;
      if (keys.length === 0) continue;

      const values = await redis.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = values[i];
        if (!key || !val) continue;
        const idStr = key.replace(EMB_KEY_PREFIX, "");
        const entityId = parseInt(idStr, 10);
        if (isNaN(entityId)) continue;
        _embCache.set(entityId, base64ToFloat32(val));
        loaded++;
      }
    } while (cursor !== "0");

    if (loaded > 0) {
      console.log(`[semantic-engine] Loaded ${loaded} embeddings from Redis.`);
    }
    return loaded;
  } catch (err) {
    console.warn("[semantic-engine] Redis load failed:", (err as Error).message);
    return 0;
  }
}

export interface SemanticEngineResult {
  id: number;
  score: number;
}

export async function semanticEngineSearch(
  query: string,
  topK = 100,
): Promise<SemanticEngineResult[]> {
  if (_embCache.size < 100) return [];

  let queryEmb: Float32Array;
  try {
    queryEmb = await embedText(query);
  } catch {
    return [];
  }

  const scored: SemanticEngineResult[] = [];
  for (const [id, emb] of _embCache) {
    scored.push({ id, score: cosineSim(queryEmb, emb) });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function getAllEmbeddings(): ReadonlyMap<number, Float32Array> {
  return _embCache;
}

export function warmUpSemanticEngine(): void {
  getEmbeddingPipeline()
    .then(() => loadEmbeddingsFromRedis())
    .catch((err: unknown) =>
      console.warn("[semantic-engine] Warm-up failed (non-fatal):", (err as Error).message),
    );
}
