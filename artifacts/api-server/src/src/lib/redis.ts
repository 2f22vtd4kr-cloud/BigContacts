/**
 * Redis clients for ApexFinder API — dual-client architecture:
 *
 * LOCAL  (REDIS_URL)   — fast ephemeral cache; 30–120 s TTL items, API responses
 * PERMANENT (REDIS_URL_1) — Upstash; deduplication sets, job state, HNWI index
 *
 * Permanent helpers fail closed if no permanent client is available. They must
 * never silently substitute the local cache for distributed/durable state.
 */

import Redis from "ioredis";

export const REDIS_TTL_POLICY = {
  CONTACT_CACHE_SECONDS: 60 * 60 * 24 * 90,
  PERM_DEFAULT_SECONDS: 60 * 60 * 24 * 7,
  LOCAL_DEFAULT_SECONDS: 60,
} as const;

import { logger } from "./logger";

let _localClient: Redis | null = null;
let _permanentClients: Redis[] = [];
let _permanentRedisEnabled =
  process.env["ENABLE_AUTO_PIPELINE"] === "true" ||
  process.env["ENABLE_REDIS_ON_BOOT"] === "true";

const _quotaExhaustedSlots = new Set<number>();

function buildClient(url: string, label: string, slotIndex?: number): Redis {
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
  client.on("connect", () => logger.info(`[${label}] Redis connecting…`));
  client.on("ready", () => logger.info(`[${label}] Redis ready`));
  client.on("error", (err) => {
    if (err.message?.includes("max requests limit exceeded")) {
      if (slotIndex !== undefined && !_quotaExhaustedSlots.has(slotIndex)) {
        _quotaExhaustedSlots.add(slotIndex);
        logger.warn({ slot: slotIndex + 1, label }, `[${label}] Quota exhausted — slot marked as unavailable; falling through to next slot`);
      }
      client.disconnect();
    } else {
      logger.warn({ err: err.message }, `[${label}] Redis error (non-fatal)`);
    }
  });
  client.on("close", () => logger.warn(`[${label}] Redis connection closed`));
  client.on("reconnecting", (ms: number) => logger.info({ ms }, `[${label}] Redis reconnecting`));
  return client;
}

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

export async function connectPermanentRedis(): Promise<void> {
  if (!_permanentRedisEnabled) {
    logger.info("Permanent Redis connection deferred — manual mode has no boot-time Redis traffic");
    return;
  }
  _quotaExhaustedSlots.clear();
  for (let i = 1; i <= 9; i++) {
    const url = process.env[`REDIS_URL_${i}`];
    if (!url) break;
    if (!url.startsWith("redis://") && !url.startsWith("rediss://")) {
      logger.warn({ slot: i }, "Permanent Redis slot skipped — invalid URL (not a redis:// URI)");
      break;
    }
    if (_permanentClients[i - 1]) continue;
    const slotIndex = i - 1;
    const client = buildClient(url, `upstash-${i}`, slotIndex);
    try {
      await client.connect();
      _permanentClients[slotIndex] = client;
      logger.info({ slot: i }, "Permanent Redis connected");
    } catch (err: any) {
      logger.warn({ slot: i, err: err.message }, "Permanent Redis connect failed");
      client.disconnect();
    }
  }
}

export async function enablePermanentRedis(): Promise<void> {
  _permanentRedisEnabled = true;
  await connectPermanentRedis();
}

export async function disconnectRedis(): Promise<void> {
  const all = [_localClient, ..._permanentClients].filter(Boolean) as Redis[];
  await Promise.all(all.map((c) => c.quit().catch(() => c.disconnect())));
  _localClient = null;
  _permanentClients = [];
}

export function getRedisClient(): Redis | null { return _localClient; }

/**
 * Returns the first healthy, non-quota-exhausted permanent client.
 * Never falls back to local Redis: permanent callers own distributed/durable state.
 */
export function getPermanentClient(): Redis | null {
  if (!_permanentRedisEnabled) return null;
  return _permanentClients.find(
    (c, i) => c?.status === "ready" && !_quotaExhaustedSlots.has(i),
  ) ?? null;
}

export function getAllPermanentClients(): Redis[] {
  return _permanentClients.filter(
    (c, i) => c?.status === "ready" && !_quotaExhaustedSlots.has(i),
  );
}

export function isSlotQuotaExhausted(slot: number): boolean {
  return _quotaExhaustedSlots.has(slot - 1);
}

export function clearQuotaExhaustedSlots(): void {
  if (_quotaExhaustedSlots.size === 0) return;
  _quotaExhaustedSlots.clear();
  logger.info("Cleared sticky Redis quota-exhausted slot flags");
}

let _lastQuotaRecoverAt = 0;
export async function tryRecoverExhaustedSlots(): Promise<number> {
  if (_quotaExhaustedSlots.size === 0) return 0;
  const now = Date.now();
  if (now - _lastQuotaRecoverAt < 30_000) return 0;
  _lastQuotaRecoverAt = now;
  let recovered = 0;
  for (const idx of [..._quotaExhaustedSlots]) {
    const client = _permanentClients[idx];
    if (!client || client.status !== "ready") continue;
    try {
      const pong = await Promise.race([
        client.ping(),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error("ping-timeout")), 2500)),
      ]);
      if (String(pong).toUpperCase() === "PONG") {
        _quotaExhaustedSlots.delete(idx);
        recovered += 1;
        logger.info({ slot: idx + 1 }, "Redis slot recovered from sticky exhausted flag");
      }
    } catch (err: any) {
      if (String(err?.message || "").includes("max requests limit exceeded")) continue;
    }
  }
  return recovered;
}

export function markClientExhausted(client: Redis): void {
  const i = _permanentClients.indexOf(client);
  if (i >= 0 && !_quotaExhaustedSlots.has(i)) {
    _quotaExhaustedSlots.add(i);
    logger.warn({ slot: i + 1 }, `Permanent Redis slot ${i + 1} marked exhausted via command-level catch`);
  }
}

type RedisCommand<T> = (client: Redis) => Promise<T>;
export async function withPermanentClient<T>(command: RedisCommand<T>, fallback: T): Promise<T> {
  const attempted = new Set<Redis>();
  for (;;) {
    const client = getPermanentClient();
    if (!client || attempted.has(client)) return fallback;
    attempted.add(client);
    try {
      return await command(client);
    } catch (err: any) {
      if (err?.message?.includes("max requests limit exceeded")) {
        markClientExhausted(client);
        continue;
      }
      logger.warn({ err: err?.message }, "Permanent Redis command failed (non-fatal)");
      return fallback;
    }
  }
}

export async function withContactCacheClient<T>(command: RedisCommand<T>, fallback: T): Promise<T> {
  const attempted = new Set<Redis>();
  for (;;) {
    const client = getContactCacheClient();
    if (!client || attempted.has(client)) return fallback;
    attempted.add(client);
    try {
      return await command(client);
    } catch (err: any) {
      if (err?.message?.includes("max requests limit exceeded")) {
        markClientExhausted(client);
        continue;
      }
      logger.warn({ err: err?.message }, "Contact-cache Redis command failed (non-fatal)");
      return fallback;
    }
  }
}

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
  try { const ttl = Math.max(1, ttlSeconds ?? REDIS_TTL_POLICY.LOCAL_DEFAULT_SECONDS); await c.set(LOCAL_PREFIX + key, JSON.stringify(value), "EX", ttl); } catch { /* non-fatal */ }
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

const PERM_PREFIX = "apex:";
export async function permGet<T>(key: string): Promise<T | null> {
  return withPermanentClient(async c => {
    const raw = await c.get(PERM_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  }, null);
}
export async function permSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : REDIS_TTL_POLICY.PERM_DEFAULT_SECONDS;
  await withPermanentClient(async c => { await c.set(PERM_PREFIX + key, JSON.stringify(value), "EX", ttl); }, undefined);
}
export async function permHset(key: string, fields: Record<string, string | number>): Promise<void> {
  await withPermanentClient(c => c.hset(PERM_PREFIX + key, fields as any).then(() => undefined), undefined);
}
export async function permHgetall(key: string): Promise<Record<string, string> | null> {
  return withPermanentClient(async c => {
    const data = await c.hgetall(PERM_PREFIX + key);
    return Object.keys(data ?? {}).length > 0 ? data : null;
  }, null);
}
export async function permSadd(key: string, ...members: string[]): Promise<void> {
  await withPermanentClient(c => c.sadd(PERM_PREFIX + key, ...members).then(() => undefined), undefined);
}
export async function permSismember(key: string, member: string): Promise<boolean> {
  return withPermanentClient(async c => (await c.sismember(PERM_PREFIX + key, member)) === 1, false);
}
export async function permScard(key: string): Promise<number> {
  return withPermanentClient(c => c.scard(PERM_PREFIX + key), 0);
}
export async function permExpire(key: string, ttlSeconds: number): Promise<void> {
  await withPermanentClient(c => c.expire(PERM_PREFIX + key, ttlSeconds).then(() => undefined), undefined);
}

const HEALTH_PING_TTL_OK_MS = 60_000;
const HEALTH_PING_TTL_FAIL_MS = 8_000;
let _healthPingCache: { at: number; latencyMs: number | null } | null = null;
export function invalidateRedisHealthCache(): void { _healthPingCache = null; }
export async function pingRedis(opts?: { force?: boolean }): Promise<number | null> {
  const now = Date.now();
  if (!opts?.force && _healthPingCache) {
    const ttl = _healthPingCache.latencyMs !== null ? HEALTH_PING_TTL_OK_MS : HEALTH_PING_TTL_FAIL_MS;
    if (now - _healthPingCache.at < ttl) return _healthPingCache.latencyMs;
  }
  const c = getPermanentClient();
  if (!c) { _healthPingCache = { at: now, latencyMs: null }; return null; }
  try {
    const t0 = Date.now();
    await Promise.race([c.ping(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("ping-timeout")), 2500))]);
    const latencyMs = Date.now() - t0;
    _healthPingCache = { at: Date.now(), latencyMs };
    return latencyMs;
  } catch {
    _healthPingCache = { at: Date.now(), latencyMs: null };
    return null;
  }
}
export function getRedisHealthSnapshot(): { status: "ok" | "error" | "not_connected"; latencyMs: number | null; cached: boolean } {
  const c = getPermanentClient();
  if (!c) return { status: "not_connected", latencyMs: null, cached: false };
  if (_healthPingCache) {
    const ttl = _healthPingCache.latencyMs !== null ? HEALTH_PING_TTL_OK_MS : HEALTH_PING_TTL_FAIL_MS;
    if (Date.now() - _healthPingCache.at < ttl) return { status: _healthPingCache.latencyMs !== null ? "ok" : "error", latencyMs: _healthPingCache.latencyMs, cached: true };
  }
  if (c.status === "ready") return { status: "ok", latencyMs: _healthPingCache?.latencyMs ?? null, cached: Boolean(_healthPingCache) };
  return { status: "error", latencyMs: null, cached: false };
}

const CONTACT_PREFIX = "contact:v1:";
export function getContactCacheClient(): Redis | null {
  const primary = getPermanentClient();
  if (primary) return primary;
  const slot2 = _permanentClients[1];
  if (slot2?.status === "ready" && !_quotaExhaustedSlots.has(1)) return slot2;
  return null;
}
export interface CachedContact {
  name: string; email?: string | null; phone?: string | null; phoneSource?: string | null; linkedinUrl?: string | null; linkedinHeadline?: string | null; twitterHandle?: string | null; twitterBio?: string | null; instagramHandle?: string | null; telegramHandle?: string | null; telegramBio?: string | null; personalWebsite?: string | null; foundationName?: string | null; website?: string | null; twitter?: string | null; contactConfidence: number; enrichmentSources: string[]; enrichedAt: string; emailConfidence?: number; phoneConfidence?: number; sourceHits?: Record<string, number>; reviewOnlyContacts?: Array<Record<string, unknown>>;
}
export async function contactCacheSet(stableKey: string, data: CachedContact): Promise<void> {
  await withContactCacheClient(c => c.set(CONTACT_PREFIX + stableKey, JSON.stringify(data), "EX", REDIS_TTL_POLICY.CONTACT_CACHE_SECONDS).then(() => undefined), undefined);
}
export async function contactCacheDelete(stableKey: string): Promise<void> {
  await withContactCacheClient(c => c.del(CONTACT_PREFIX + stableKey).then(() => undefined), undefined);
}
export async function contactCacheGet(stableKey: string): Promise<CachedContact | null> {
  return withContactCacheClient(async c => { const raw = await c.get(CONTACT_PREFIX + stableKey); return raw ? (JSON.parse(raw) as CachedContact) : null; }, null);
}
export async function contactCacheScanAll(): Promise<Array<{ key: string; data: CachedContact }>> {
  return withContactCacheClient(async c => {
    const results: Array<{ key: string; data: CachedContact }> = [];
    let cursor = "0";
    do {
      const [next, keys] = await c.scan(cursor, "MATCH", CONTACT_PREFIX + "*", "COUNT", 200);
      cursor = next;
      if (keys.length > 0) {
        const values = await c.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const raw = values[i];
          if (!raw) continue;
          try { results.push({ key: keys[i]!.slice(CONTACT_PREFIX.length), data: JSON.parse(raw) as CachedContact }); } catch { /* malformed entry — skip */ }
        }
      }
    } while (cursor !== "0");
    return results;
  }, []);
}

export interface RedisSlotInfo { slot: number; label: string; configured: boolean; status: "ready" | "exhausted" | "connecting" | "disconnected" | "not_configured"; }
export function getLocalRedisStatus(): RedisSlotInfo {
  const url = process.env["REDIS_URL"];
  if (!url) return { slot: 0, label: "local", configured: false, status: "not_configured" };
  if (!_localClient) return { slot: 0, label: "local", configured: true, status: "disconnected" };
  const s = _localClient.status;
  let status: RedisSlotInfo["status"] = "disconnected";
  if (s === "ready") status = "ready"; else if (s === "connecting" || s === "reconnecting") status = "connecting";
  return { slot: 0, label: "local", configured: true, status };
}
export function getPermanentClientStatuses(): RedisSlotInfo[] {
  const result: RedisSlotInfo[] = [];
  for (let i = 1; i <= 9; i++) {
    const url = process.env[`REDIS_URL_${i}`];
    if (!url) break;
    const client = _permanentClients[i - 1];
    const exhausted = _quotaExhaustedSlots.has(i - 1);
    let status: RedisSlotInfo["status"] = "disconnected";
    if (!client) status = "disconnected"; else if (exhausted) status = "exhausted"; else { const s = client.status; if (s === "ready") status = "ready"; else if (s === "connecting" || s === "reconnecting") status = "connecting"; }
    result.push({ slot: i, label: `upstash-${i}`, configured: true, status });
  }
  return result;
}
export async function contactCacheCount(): Promise<number> {
  return withContactCacheClient(async c => {
    let count = 0; let cursor = "0";
    do { const [next, keys] = await c.scan(cursor, "MATCH", CONTACT_PREFIX + "*", "COUNT", 200); cursor = next; count += keys.length; } while (cursor !== "0");
    return count;
  }, 0);
}
