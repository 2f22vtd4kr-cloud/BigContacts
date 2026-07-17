/**
 * Redis client singleton for ApexFinder API.
 *
 * - Reads REDIS_URL from the environment (supports redis:// and rediss:// TLS).
 * - Uses ioredis with a capped exponential reconnect strategy.
 * - All operations are wrapped so a Redis outage degrades gracefully:
 *   callers fall through to the DB on any Redis error.
 * - Exports typed cache helpers: getCache, setCache, delCache, delCachePattern.
 */

import Redis from "ioredis";
import { logger } from "./logger";

// ── Client ────────────────────────────────────────────────────────────────────

let _client: Redis | null = null;

function createClient(): Redis {
  const url = process.env["REDIS_URL"];
  if (!url) throw new Error("REDIS_URL environment variable is not set.");

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    // Exponential back-off capped at 10 s; give up after 20 attempts
    retryStrategy(times) {
      if (times > 20) return null; // stop retrying
      return Math.min(times * 200, 10_000);
    },
    reconnectOnError(err) {
      // Reconnect on READONLY errors (Redis Sentinel / Cluster fail-overs)
      return err.message.includes("READONLY");
    },
  });

  client.on("connect", () => logger.info("Redis connecting…"));
  client.on("ready", () => logger.info("Redis ready"));
  client.on("error", (err) =>
    logger.warn({ err: err.message }, "Redis error (non-fatal)"),
  );
  client.on("close", () => logger.warn("Redis connection closed"));
  client.on("reconnecting", (ms: number) =>
    logger.info({ ms }, "Redis reconnecting"),
  );

  return client;
}

/** Connect once on server start. Safe to call multiple times. */
export async function connectRedis(): Promise<void> {
  if (_client) return;
  _client = createClient();
  try {
    await _client.connect();
  } catch (err: any) {
    logger.warn({ err: err.message }, "Redis initial connect failed — will retry in background");
  }
}

/** Graceful shutdown — call before process.exit(). */
export async function disconnectRedis(): Promise<void> {
  if (!_client) return;
  await _client.quit().catch(() => _client?.disconnect());
  _client = null;
}

/** Raw client — null if not yet connected. */
export function getRedisClient(): Redis | null {
  return _client;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

const PREFIX = "apex:";

/**
 * Get a cached JSON value. Returns null on miss or any Redis error.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!_client) return null;
  try {
    const raw = await _client.get(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err: any) {
    logger.debug({ key, err: err.message }, "Redis GET miss/error");
    return null;
  }
}

/**
 * Store a JSON value with an optional TTL (seconds). Default: 60 s.
 * Fire-and-forget — never throws.
 */
export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds = 60,
): Promise<void> {
  if (!_client) return;
  try {
    await _client.set(PREFIX + key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err: any) {
    logger.debug({ key, err: err.message }, "Redis SET error (non-fatal)");
  }
}

/**
 * Delete one or more exact cache keys.
 */
export async function delCache(...keys: string[]): Promise<void> {
  if (!_client || keys.length === 0) return;
  try {
    await _client.del(keys.map((k) => PREFIX + k));
  } catch (err: any) {
    logger.debug({ keys, err: err.message }, "Redis DEL error (non-fatal)");
  }
}

/**
 * Delete all keys matching a glob pattern (uses SCAN, not KEYS).
 * Example: delCachePattern("entities:*") wipes all entity cache entries.
 */
export async function delCachePattern(pattern: string): Promise<void> {
  if (!_client) return;
  try {
    const fullPattern = PREFIX + pattern;
    const pipeline = _client.pipeline();
    let cursor = "0";
    do {
      const [next, keys] = await _client.scan(
        cursor,
        "MATCH",
        fullPattern,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length > 0) pipeline.del(...keys);
    } while (cursor !== "0");
    await pipeline.exec();
  } catch (err: any) {
    logger.debug({ pattern, err: err.message }, "Redis SCAN/DEL error (non-fatal)");
  }
}

/**
 * Ping Redis and return latency in ms. Returns null on failure.
 */
export async function pingRedis(): Promise<number | null> {
  if (!_client) return null;
  try {
    const t0 = Date.now();
    await _client.ping();
    return Date.now() - t0;
  } catch {
    return null;
  }
}
