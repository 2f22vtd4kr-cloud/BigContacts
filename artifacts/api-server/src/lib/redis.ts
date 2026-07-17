/**
 * Redis clients for ApexFinder API — dual-client architecture:
 *
 * LOCAL  (REDIS_URL)   — fast ephemeral cache; 30–120 s TTL items, API responses
 * PERMANENT (REDIS_URL_1) — Upstash; deduplication sets, job state, HNWI index
 *
 * All helpers fall back gracefully if a client is unavailable (Redis outage ≠ app crash).
 * If REDIS_URL_1 fills up, a REDIS_URL_2 can be hot-swapped in by adding it to the env
 * and calling connectPermanent() again — the first healthy client wins each call.
 */

import Redis from "ioredis";
import { logger } from "./logger";

// ── Client singletons ─────────────────────────────────────────────────────────

let _localClient: Redis | null = null;
let _permanentClients: Redis[] = []; // one per REDIS_URL_N

function buildClient(url: string, label: string): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    tls: url.startsWith("rediss://") ? {} : undefined,
    retryStrategy(times) {
      if (times > 20) return null;
      return Math.min(times * 200, 10_000);
    },
    reconnectOnError(err) {
      return err.message.includes("READONLY");
    },
  });

  client.on("connect",      () => logger.info(`[${label}] Redis connecting…`));
  client.on("ready",        () => logger.info(`[${label}] Redis ready`));
  client.on("error",        (err) => logger.warn({ err: err.message }, `[${label}] Redis error (non-fatal)`));
  client.on("close",        () => logger.warn(`[${label}] Redis connection closed`));
  client.on("reconnecting", (ms: number) => logger.info({ ms }, `[${label}] Redis reconnecting`));

  return client;
}

/** Connect the fast local cache client (REDIS_URL → localhost:6379) */
export async function connectRedis(): Promise<void> {
  if (_localClient) return;
  const url = process.env["REDIS_URL"];
  if (!url) {
    logger.warn("REDIS_URL not set — local cache disabled");
    return;
  }
  _localClient = buildClient(url, "local");
  try {
    await _localClient.connect();
    logger.info("Redis connection initiated");
  } catch (err: any) {
    logger.warn({ err: err.message }, "Redis initial connect failed — will retry in background");
  }
}

/**
 * Connect all permanent Upstash clients.
 * Reads REDIS_URL_1, REDIS_URL_2, … REDIS_URL_9 in order; stops at first missing key.
 */
export async function connectPermanentRedis(): Promise<void> {
  for (let i = 1; i <= 9; i++) {
    const url = process.env[`REDIS_URL_${i}`];
    if (!url) break;
    if (_permanentClients[i - 1]) continue; // already connected
    const client = buildClient(url, `upstash-${i}`);
    try {
      await client.connect();
      _permanentClients[i - 1] = client;
      logger.info({ slot: i }, "Permanent Redis connected");
    } catch (err: any) {
      logger.warn({ slot: i, err: err.message }, "Permanent Redis connect failed");
    }
  }
}

/** Shutdown all clients gracefully */
export async function disconnectRedis(): Promise<void> {
  const all = [_localClient, ..._permanentClients].filter(Boolean) as Redis[];
  await Promise.all(all.map((c) => c.quit().catch(() => c.disconnect())));
  _localClient = null;
  _permanentClients = [];
}

/** Fast local cache client — null if not connected */
export function getRedisClient(): Redis | null { return _localClient; }

/**
 * Returns the first healthy permanent client.
 * Falls back to local client if no permanent clients exist.
 * In future when Upstash DB_1 fills up, adding REDIS_URL_2 automatically expands capacity.
 */
export function getPermanentClient(): Redis | null {
  const alive = _permanentClients.find((c) => c.status === "ready");
  return alive ?? _localClient;
}

/** All permanent clients (for sharded writes) */
export function getAllPermanentClients(): Redis[] {
  return _permanentClients.filter((c) => c.status === "ready");
}

// ── LOCAL cache helpers (short-lived API responses) ───────────────────────────

const LOCAL_PREFIX = "apex:";

export async function getCache<T>(key: string): Promise<T | null> {
  const c = getRedisClient();
  if (!c) return null;
  try {
    const raw = await c.get(LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  const c = getRedisClient();
  if (!c) return;
  try { await c.set(LOCAL_PREFIX + key, JSON.stringify(value), "EX", ttlSeconds); } catch { /* non-fatal */ }
}

export async function delCache(...keys: string[]): Promise<void> {
  const c = getRedisClient();
  if (!c || keys.length === 0) return;
  try { await c.del(keys.map((k) => LOCAL_PREFIX + k)); } catch { /* non-fatal */ }
}

export async function delCachePattern(pattern: string): Promise<void> {
  const c = getRedisClient();
  if (!c) return;
  try {
    const fullPattern = LOCAL_PREFIX + pattern;
    const pipeline = c.pipeline();
    let cursor = "0";
    do {
      const [next, keys] = await c.scan(cursor, "MATCH", fullPattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) pipeline.del(...keys);
    } while (cursor !== "0");
    await pipeline.exec();
  } catch { /* non-fatal */ }
}

// ── PERMANENT helpers (Upstash — dedup, job state, HNWI index) ───────────────

const PERM_PREFIX = "apex:";

export async function permGet<T>(key: string): Promise<T | null> {
  const c = getPermanentClient();
  if (!c) return null;
  try {
    const raw = await c.get(PERM_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export async function permSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const c = getPermanentClient();
  if (!c) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) await c.set(PERM_PREFIX + key, serialized, "EX", ttlSeconds);
    else await c.set(PERM_PREFIX + key, serialized);
  } catch { /* non-fatal */ }
}

export async function permHset(key: string, fields: Record<string, string | number>): Promise<void> {
  const c = getPermanentClient();
  if (!c) return;
  try { await c.hset(PERM_PREFIX + key, fields as any); } catch { /* non-fatal */ }
}

export async function permHgetall(key: string): Promise<Record<string, string> | null> {
  const c = getPermanentClient();
  if (!c) return null;
  try {
    const data = await c.hgetall(PERM_PREFIX + key);
    return Object.keys(data ?? {}).length > 0 ? data : null;
  } catch { return null; }
}

export async function permSadd(key: string, ...members: string[]): Promise<void> {
  const c = getPermanentClient();
  if (!c) return;
  try { await c.sadd(PERM_PREFIX + key, ...members); } catch { /* non-fatal */ }
}

export async function permSismember(key: string, member: string): Promise<boolean> {
  const c = getPermanentClient();
  if (!c) return false;
  try { return (await c.sismember(PERM_PREFIX + key, member)) === 1; } catch { return false; }
}

export async function permScard(key: string): Promise<number> {
  const c = getPermanentClient();
  if (!c) return 0;
  try { return await c.scard(PERM_PREFIX + key); } catch { return 0; }
}

export async function permExpire(key: string, ttlSeconds: number): Promise<void> {
  const c = getPermanentClient();
  if (!c) return;
  try { await c.expire(PERM_PREFIX + key, ttlSeconds); } catch { /* non-fatal */ }
}

export async function pingRedis(): Promise<number | null> {
  const c = getRedisClient();
  if (!c) return null;
  try {
    const t0 = Date.now();
    await c.ping();
    return Date.now() - t0;
  } catch { return null; }
}
