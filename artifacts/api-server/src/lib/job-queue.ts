/**
 * Redis-backed background job queue — uses PERMANENT client (Upstash)
 * so job state survives container restarts.
 *
 * Jobs: apex:job:<jobId>  (HASH)
 * Log:  apex:job:<jobId>:log  (LIST, newest first, capped at 200)
 * Active job per type: apex:activejob:<type>  (STRING)
 * Dedup set: apex:dedup:hnwi  (SET — stored on Upstash for permanence)
 */

import { randomUUID } from "crypto";
import { getPermanentClient, markClientExhausted, permSadd, permSismember, permScard } from "./redis";
import { logger } from "./logger";

/**
 * Execute a Redis command with automatic quota-exhaustion retry.
 * If the first client throws "max requests limit exceeded", marks it exhausted
 * immediately (before the ioredis error event fires) and retries with the next
 * healthy slot.  Falls back to `fallback` if all slots are exhausted.
 */
async function safeRedis<T>(fn: (rc: import("ioredis").Redis) => Promise<T>, fallback: T): Promise<T> {
  const rc = getPermanentClient();
  if (!rc) return fallback;
  try {
    return await fn(rc);
  } catch (err: any) {
    if (err?.message?.includes("max requests limit exceeded")) {
      markClientExhausted(rc);
      const rc2 = getPermanentClient();
      if (rc2 && rc2 !== rc) {
        try { return await fn(rc2); } catch { /* fall through */ }
      }
      logger.warn("All Upstash slots quota-exhausted — job state unavailable");
    } else {
      logger.warn({ err: err?.message }, "Redis command failed in job-queue (non-fatal)");
    }
    return fallback;
  }
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface JobState {
  jobId: string;
  type: string;
  status: JobStatus;
  progress: number;   // 0–100
  inserted: number;
  skipped: number;    // deduped
  errors: number;
  total: number;
  startedAt: string;
  finishedAt?: string;
  message: string;
}

const JOB_TTL = 60 * 60 * 24 * 7; // 7 days on Upstash
const LOG_CAP = 200;

function jk(jobId: string) { return `apex:job:${jobId}`; }
function lk(jobId: string) { return `apex:job:${jobId}:log`; }

export async function createJob(type: string): Promise<string> {
  const jobId = randomUUID();
  const state: JobState = {
    jobId, type, status: "queued",
    progress: 0, inserted: 0, skipped: 0, errors: 0, total: 0,
    startedAt: new Date().toISOString(),
    message: "Queued",
  };
  await safeRedis(async rc => {
    await rc.hset(jk(jobId), state as any);
    await rc.expire(jk(jobId), JOB_TTL);
  }, undefined);
  return jobId;
}

export async function updateJob(jobId: string, patch: Partial<JobState>): Promise<void> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) flat[k] = String(v);
  await safeRedis(async rc => {
    await rc.hset(jk(jobId), flat);
    await rc.expire(jk(jobId), JOB_TTL);
  }, undefined);
}

export async function appendJobLog(jobId: string, line: string): Promise<void> {
  const ts = `${new Date().toISOString()} ${line}`;
  await safeRedis(async rc => {
    await rc.lpush(lk(jobId), ts);
    await rc.ltrim(lk(jobId), 0, LOG_CAP - 1);
    await rc.expire(lk(jobId), JOB_TTL);
  }, undefined);
}

export async function getJob(jobId: string): Promise<JobState | null> {
  const raw = await safeRedis(rc => rc.hgetall(jk(jobId)), null);
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    jobId: raw["jobId"] ?? jobId,
    type: raw["type"] ?? "unknown",
    status: (raw["status"] ?? "queued") as JobStatus,
    progress: Number(raw["progress"] ?? 0),
    inserted: Number(raw["inserted"] ?? 0),
    skipped: Number(raw["skipped"] ?? 0),
    errors: Number(raw["errors"] ?? 0),
    total: Number(raw["total"] ?? 0),
    startedAt: raw["startedAt"] ?? "",
    finishedAt: raw["finishedAt"],
    message: raw["message"] ?? "",
  };
}

export async function getJobLog(jobId: string): Promise<string[]> {
  return safeRedis(rc => rc.lrange(lk(jobId), 0, LOG_CAP - 1), []);
}

// ── Deduplication (Upstash SET — permanent across restarts) ──────────────────

const DEDUP_KEY = "apex:dedup:hnwi";

/** Returns true if this key has already been ingested */
export async function isDuplicate(key: string): Promise<boolean> {
  return permSismember(DEDUP_KEY, key);
}

/** Mark a key as ingested */
export async function markSeen(key: string): Promise<void> {
  await permSadd(DEDUP_KEY, key);
}

/** How many unique records have been seen */
export async function getDedupCount(): Promise<number> {
  return permScard(DEDUP_KEY);
}

/** Clear dedup set — use before a full re-ingest */
export async function clearDedup(): Promise<void> {
  const rc = getPermanentClient();
  if (!rc) return;
  // batchMarkSeen and preloadDedupPrefix both use `apex:${DEDUP_KEY}` as the raw key
  // (because the permanent client adds the "apex:" prefix automatically via permSadd/permScard,
  //  but those functions were NOT used for the raw writes — so the actual Upstash key is
  //  "apex:" + DEDUP_KEY = "apex:apex:dedup:hnwi").
  // We must delete that same raw key, not the un-prefixed DEDUP_KEY.
  const FULL_KEY = `apex:${DEDUP_KEY}`;
  await rc.del(FULL_KEY);
  logger.info({ key: FULL_KEY }, "Dedup set cleared");
}

/**
 * Pre-load dedup set members matching a prefix into a local in-memory Set.
 * Use this at the start of an ingestor to avoid per-record Upstash round-trips.
 * The caller can then check/update the returned Set locally and call batchMarkSeen()
 * after each batch flush.
 */
export async function preloadDedupPrefix(prefix: string): Promise<Set<string>> {
  const seen = new Set<string>();
  const rc = getPermanentClient();
  if (!rc) return seen;
  try {
    // The actual Redis key has the PERM_PREFIX applied by permSadd/permSismember
    const fullKey = `apex:${DEDUP_KEY}`;
    let cursor = "0";
    do {
      const [next, members] = await rc.sscan(fullKey, cursor, "MATCH", `${prefix}*`, "COUNT", 2000);
      cursor = next;
      for (const m of members) seen.add(m);
    } while (cursor !== "0");
    logger.info({ prefix, count: seen.size }, "Dedup prefix pre-loaded");
  } catch (err: any) {
    logger.warn({ err: err.message }, "preloadDedupPrefix failed (non-fatal)");
  }
  return seen;
}

/**
 * Batch-write multiple keys into the permanent dedup set in one round-trip.
 * Use after each successful batch flush.
 */
export async function batchMarkSeen(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const rc = getPermanentClient();
  if (!rc) return;
  try {
    const fullKey = `apex:${DEDUP_KEY}`;
    await rc.sadd(fullKey, ...keys);
  } catch (err: any) {
    logger.warn({ err: err.message }, "batchMarkSeen failed (non-fatal)");
  }
}

// ── Active job tracking ───────────────────────────────────────────────────────

export async function setActiveJob(type: string, jobId: string): Promise<void> {
  await safeRedis(rc => rc.set(`apex:activejob:${type}`, jobId, "EX", JOB_TTL), null);
}

export async function getActiveJob(type: string): Promise<string | null> {
  return safeRedis(rc => rc.get(`apex:activejob:${type}`), null);
}

export async function clearActiveJob(type: string): Promise<void> {
  await safeRedis(rc => rc.del(`apex:activejob:${type}`), null);
}
