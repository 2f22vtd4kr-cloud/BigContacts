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
import { withPermanentClient, permSadd, permSismember, permScard } from "./redis";
import { logger } from "./logger";

async function safeRedis<T>(fn: (rc: import("ioredis").Redis) => Promise<T>, fallback: T): Promise<T> {
  return withPermanentClient(fn, fallback);
}

export type JobStatus = "queued" | "running" | "paused" | "done" | "failed" | "cancelled";

export interface JobState {
  jobId: string;
  type: string;
  status: JobStatus;
  progress: number;
  inserted: number;
  skipped: number;
  errors: number;
  total: number;
  startedAt: string;
  finishedAt?: string;
  message: string;
  atlasPhase?: number;
  atlasPhaseTotal?: number;
  entityProgress?: number;
  entityTotal?: number;
  entityNames?: string;
  atlasTelemetry?: string;
  outcome?: "complete" | "incomplete";
  resumable?: string;
  targetIds?: string;
  targetIndex?: number;
  targetTotal?: number;
  currentTargetId?: number;
  currentPhase?: string;
  completedTargetIds?: string;
  failedTargetIds?: string;
  retryCounts?: string;
  result?: string;
}

export type AutoPipelineSchedulerStatus = {
  enabled: boolean;
  active: boolean;
  activatedAt?: string;
  lastTriggerAt?: string;
  nextTriggerAt?: string;
  lastLabel?: string;
  lastStatus?: "triggered" | "completed" | "skipped_lock" | "no_targets" | "error";
  lastJobId?: string;
  lastMessage?: string;
  cycles: number;
  skippedDueToLock: number;
  providerNoTarget: number;
};

/** Job hash, log, active pointer — 7d TTL (volatile for eviction-friendly Redis). */
const JOB_TTL = 60 * 60 * 24 * 7;
/** Process-local fallback when permanent Redis is exhausted/disconnected. */
const memoryJobs = new Map<string, JobState>();
const memoryLogs = new Map<string, string[]>();
const memoryLatestByType = new Map<string, string>();
const memoryActiveByType = new Map<string, string>();

const LOG_CAP = 200;
const AUTO_PIPELINE_SCHEDULER_KEY = "apex:autopipeline:scheduler";

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
  memoryJobs.set(jobId, { ...state });
  memoryLatestByType.set(type, jobId);
  const wrote = await safeRedis(async rc => {
    await rc.hset(jk(jobId), state as any);
    await rc.expire(jk(jobId), JOB_TTL);
    await rc.set(`apex:latestjob:${type}`, jobId, "EX", JOB_TTL);
    return true;
  }, false as boolean);
  if (!wrote) {
    logger.warn({ jobId, type }, "createJob: permanent Redis unavailable — using in-memory job state");
  }
  return jobId;
}

export async function updateJob(jobId: string, patch: Partial<JobState>): Promise<void> {
  const prev = memoryJobs.get(jobId);
  if (prev) memoryJobs.set(jobId, { ...prev, ...patch });
  else if (patch.jobId || patch.type) {
    memoryJobs.set(jobId, {
      jobId,
      type: String(patch.type ?? "unknown"),
      status: (patch.status as JobStatus) ?? "running",
      progress: Number(patch.progress ?? 0),
      inserted: Number(patch.inserted ?? 0),
      skipped: Number(patch.skipped ?? 0),
      errors: Number(patch.errors ?? 0),
      total: Number(patch.total ?? 0),
      startedAt: String(patch.startedAt ?? new Date().toISOString()),
      message: String(patch.message ?? ""),
      ...patch,
    } as JobState);
  }
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) flat[k] = String(v);
  await safeRedis(async rc => {
    await rc.hset(jk(jobId), flat);
    await rc.expire(jk(jobId), JOB_TTL);
  }, undefined);
}

export async function clearJobFields(jobId: string, fields: string[]): Promise<void> {
  if (fields.length === 0) return;
  await safeRedis(async rc => {
    await rc.hdel(jk(jobId), ...fields);
    await rc.expire(jk(jobId), JOB_TTL);
  }, undefined);
}

export async function appendJobLog(jobId: string, line: string, opts?: { dedupeKey?: string }): Promise<void> {
  if (opts?.dedupeKey) {
    const ok = await safeRedis(async (rc) => {
      const key = `apex:joblog:dedupe:${jobId}:${opts.dedupeKey}`;
      const set = await rc.set(key, "1", "EX", 86400, "NX");
      return set === "OK" || set === true;
    }, true);
    if (!ok) return;
  }
  const memCheck = memoryLogs.get(jobId) ?? [];
  if (memCheck[0] && memCheck[0].includes(line.slice(0, 120))) return;
  const ts = `${new Date().toISOString()} ${line}`;
  const mem = memoryLogs.get(jobId) ?? [];
  mem.unshift(ts);
  memoryLogs.set(jobId, mem.slice(0, LOG_CAP));
  await safeRedis(async rc => {
    await rc.lpush(lk(jobId), ts);
    await rc.ltrim(lk(jobId), 0, LOG_CAP - 1);
    await rc.expire(lk(jobId), JOB_TTL);
  }, undefined);
  // Non-blocking mirror into Bureau Live (noise-gated + rate-limited)
  void import("./bureau-live-log")
    .then(m => m.mirrorJobLogLine(jobId, line))
    .catch(() => undefined);
}

export async function getJob(jobId: string): Promise<JobState | null> {
  const raw = await safeRedis(rc => rc.hgetall(jk(jobId)), null);
  if (!raw || Object.keys(raw).length === 0) {
    return memoryJobs.get(jobId) ?? null;
  }
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
    atlasPhase: raw["atlasPhase"] !== undefined ? Number(raw["atlasPhase"]) : undefined,
    atlasPhaseTotal: raw["atlasPhaseTotal"] !== undefined ? Number(raw["atlasPhaseTotal"]) : undefined,
    entityProgress: raw["entityProgress"] !== undefined ? Number(raw["entityProgress"]) : undefined,
    entityTotal: raw["entityTotal"] !== undefined ? Number(raw["entityTotal"]) : undefined,
    entityNames: raw["entityNames"],
    atlasTelemetry: raw["atlasTelemetry"],
    outcome: raw["outcome"] === "incomplete" || raw["outcome"] === "complete"
      ? raw["outcome"]
      : undefined,
    resumable: raw["resumable"],
    targetIds: raw["targetIds"],
    targetIndex: raw["targetIndex"] !== undefined ? Number(raw["targetIndex"]) : undefined,
    targetTotal: raw["targetTotal"] !== undefined ? Number(raw["targetTotal"]) : undefined,
    currentTargetId: raw["currentTargetId"] !== undefined ? Number(raw["currentTargetId"]) : undefined,
    currentPhase: raw["currentPhase"],
    completedTargetIds: raw["completedTargetIds"],
    failedTargetIds: raw["failedTargetIds"],
    retryCounts: raw["retryCounts"],
    result: raw["result"],
  };
}

export async function getJobLog(jobId: string): Promise<string[]> {
  const fromRedis = await safeRedis(rc => rc.lrange(lk(jobId), 0, LOG_CAP - 1), null as string[] | null);
  if (fromRedis && fromRedis.length) return fromRedis;
  return memoryLogs.get(jobId) ?? [];
}

const DEDUP_KEY = "apex:dedup:hnwi";

export async function isDuplicate(key: string): Promise<boolean> {
  return permSismember(DEDUP_KEY, key);
}

export async function markSeen(key: string): Promise<void> {
  await permSadd(DEDUP_KEY, key);
}

export async function getDedupCount(): Promise<number> {
  return permScard(DEDUP_KEY);
}

export async function clearDedup(): Promise<void> {
  const FULL_KEY = `apex:${DEDUP_KEY}`;
  await withPermanentClient(async rc => {
    await rc.del(FULL_KEY);
    logger.info({ key: FULL_KEY }, "Dedup set cleared");
  }, undefined);
}

export async function preloadDedupPrefix(prefix: string): Promise<Set<string>> {
  const seen = new Set<string>();
  await withPermanentClient(async rc => {
    const fullKey = `apex:${DEDUP_KEY}`;
    let cursor = "0";
    do {
      const [next, members] = await rc.sscan(fullKey, cursor, "MATCH", `${prefix}*`, "COUNT", 2000);
      cursor = next;
      for (const m of members) seen.add(m);
    } while (cursor !== "0");
    logger.info({ prefix, count: seen.size }, "Dedup prefix pre-loaded");
  }, undefined);
  return seen;
}

export async function batchMarkSeen(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const fullKey = `apex:${DEDUP_KEY}`;
  await withPermanentClient(async rc => {
    await rc.sadd(fullKey, ...keys);
  }, undefined);
}

const ACTIVE_JOB_READ_CACHE = new Map<string, { at: number; id: string | null }>();
const ACTIVE_JOB_READ_TTL_MS = 8_000;

export async function setActiveJob(type: string, jobId: string): Promise<void> {
  memoryActiveByType.set(type, jobId);
  memoryLatestByType.set(type, jobId);
  ACTIVE_JOB_READ_CACHE.set(type, { at: Date.now(), id: jobId });
  const wrote = await safeRedis(async rc => {
    await rc.set(`apex:activejob:${type}`, jobId, "EX", JOB_TTL);
    return (await rc.get(`apex:activejob:${type}`)) === jobId;
  }, false);
  if (!wrote) {
    console.warn(`[job-queue] setActiveJob Redis write failed — using in-process lock for ${type}=${jobId}`);
  }
}

export async function getActiveJob(type: string): Promise<string | null> {
  const cached = ACTIVE_JOB_READ_CACHE.get(type);
  if (cached && Date.now() - cached.at < ACTIVE_JOB_READ_TTL_MS) {
    return cached.id;
  }
  // null fallback means Redis miss OR command failed (quota). Distinguish via sentinel.
  let redisOk = false;
  const fromRedis = await safeRedis(async rc => {
    redisOk = true;
    return rc.get(`apex:activejob:${type}`);
  }, null as string | null);

  if (fromRedis) {
    memoryActiveByType.set(type, fromRedis);
    ACTIVE_JOB_READ_CACHE.set(type, { at: Date.now(), id: fromRedis });
    return fromRedis;
  }

  // Redis answered empty → clear memory (another instance deleted the lock)
  if (redisOk) {
    memoryActiveByType.delete(type);
    ACTIVE_JOB_READ_CACHE.set(type, { at: Date.now(), id: null });
    return null;
  }

  // Redis unavailable (quota / network) → in-process lock so Launch can run on one API
  const mem = memoryActiveByType.get(type) ?? null;
  ACTIVE_JOB_READ_CACHE.set(type, { at: Date.now(), id: mem });
  return mem;
}

/**
 * Read several active-job pointers in one Redis command.
 *
 * The idle desk asks for the status of many possible job types. Calling
 * getActiveJob() once per type turns a harmless 15-second UI poll into a
 * steady stream of Upstash commands. Keep the per-type cache for callers
 * that need one lock, but use MGET for the dashboard-wide status path.
 */
export async function getActiveJobs(types: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const uniqueTypes = [...new Set(types)].filter(Boolean);
  if (uniqueTypes.length === 0) return result;

  const now = Date.now();
  const allFresh = uniqueTypes.every((type) => {
    const cached = ACTIVE_JOB_READ_CACHE.get(type);
    if (!cached || now - cached.at >= ACTIVE_JOB_READ_TTL_MS) return false;
    result.set(type, cached.id);
    return true;
  });
  if (allFresh) return result;

  const values = await safeRedis(async rc => {
    return rc.mget(...uniqueTypes.map(type => `apex:activejob:${type}`));
  }, null as Array<string | null> | null);

  if (values) {
    uniqueTypes.forEach((type, index) => {
      const id = values[index] ?? null;
      result.set(type, id);
      if (id) memoryActiveByType.set(type, id);
      else memoryActiveByType.delete(type);
      ACTIVE_JOB_READ_CACHE.set(type, { at: now, id });
    });
    return result;
  }

  // Redis unavailable: preserve the same in-process fallback semantics as
  // getActiveJob(), without generating one failed command per job type.
  uniqueTypes.forEach((type) => {
    const id = memoryActiveByType.get(type) ?? null;
    result.set(type, id);
    ACTIVE_JOB_READ_CACHE.set(type, { at: now, id });
  });
  return result;
}

/** Call after set/clear active job so status does not serve a stale pointer. */
export function invalidateActiveJobCache(type?: string): void {
  if (type) ACTIVE_JOB_READ_CACHE.delete(type);
  else ACTIVE_JOB_READ_CACHE.clear();
}


export async function getLatestJob(type: string): Promise<JobState | null> {
  // NEVER SCAN apex:job:* on the hot path — free Upstash is ~500k cmds/month;
  // a full SCAN on every idle atlas-status poll burned the quota with almost no data.
  const fromRedis = await safeRedis(async rc => {
    const pointerKey = `apex:latestjob:${type}`;
    const jobId = await rc.get(pointerKey);
    if (!jobId) return null;
    return getJob(jobId);
  }, null);
  if (fromRedis) return fromRedis;
  const mid = memoryLatestByType.get(type);
  if (mid) return getJob(mid);
  return null;
}

export async function updateAutoPipelineScheduler(
  patch: Partial<AutoPipelineSchedulerStatus>,
): Promise<void> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) flat[key] = String(value);
  }
  if (Object.keys(flat).length === 0) return;
  await safeRedis(async rc => {
    await rc.hset(AUTO_PIPELINE_SCHEDULER_KEY, flat);
    await rc.expire(AUTO_PIPELINE_SCHEDULER_KEY, JOB_TTL);
  }, undefined);
}

export async function getAutoPipelineScheduler(): Promise<AutoPipelineSchedulerStatus> {
  const raw = await safeRedis(rc => rc.hgetall(AUTO_PIPELINE_SCHEDULER_KEY), {});
  return {
    enabled: raw["enabled"] === "true",
    active: raw["active"] === "true",
    activatedAt: raw["activatedAt"],
    lastTriggerAt: raw["lastTriggerAt"],
    nextTriggerAt: raw["nextTriggerAt"],
    lastLabel: raw["lastLabel"],
    lastStatus: ["triggered", "completed", "skipped_lock", "no_targets", "error"].includes(raw["lastStatus"] ?? "")
      ? raw["lastStatus"] as AutoPipelineSchedulerStatus["lastStatus"]
      : undefined,
    lastJobId: raw["lastJobId"],
    lastMessage: raw["lastMessage"],
    cycles: Number(raw["cycles"] ?? 0),
    skippedDueToLock: Number(raw["skippedDueToLock"] ?? 0),
    providerNoTarget: Number(raw["providerNoTarget"] ?? 0),
  };
}

export async function clearActiveJob(type: string): Promise<void> {
  ACTIVE_JOB_READ_CACHE.set(type, { at: Date.now(), id: null });
  memoryActiveByType.delete(type);
  await safeRedis(rc => rc.del(`apex:activejob:${type}`), null);
  invalidateActiveJobCache(type);
}

export async function forceClearActiveJob(type: string): Promise<void> {
  await clearActiveJob(type);
}

/** Clear only if the active pointer still equals jobId (no race with a newer Launch). */
export async function clearActiveJobIfMatches(type: string, jobId: string): Promise<boolean> {
  invalidateActiveJobCache(type);
  const active = await getActiveJob(type);
  if (active !== jobId) return false;
  await clearActiveJob(type);
  return true;
}

export async function ownsActiveJob(type: string, jobId: string): Promise<boolean> {
  return (await getActiveJob(type)) === jobId;
}

export async function clearActiveJobIfOwned(type: string, jobId: string): Promise<boolean> {
  return clearActiveJobIfMatches(type, jobId);
}
