import { and, or, eq, sql } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { getAllPermanentClients, markClientExhausted } from "./redis";
import { invalidateActiveJobCache } from "./job-queue";
import { logger } from "./logger";

const JOB_LOCK_TTL_SECONDS = 15 * 60;
const JOB_LOCK_RENEW_INTERVAL_MS = 5 * 60 * 1000;
const leaseTimers = new Map<string, ReturnType<typeof setInterval>>();

type ClaimResult = { available: true; result: number };

type StrictRedisCommand<T> = (redis: import("ioredis").default) => Promise<T>;

/**
 * Distributed job ownership is fail-closed. The generic Redis helpers are
 * intentionally fail-soft for cache-like callers, but a canonical job lock
 * cannot safely interpret a swallowed command failure as "lock unavailable".
 * Try every currently-ready permanent slot and preserve the real non-secret
 * command error for the caller when all slots fail.
 */
async function withStrictPermanentClient<T>(command: StrictRedisCommand<T>): Promise<T> {
  const clients = getAllPermanentClients();
  if (clients.length === 0) {
    throw new Error("Canonical Atlas launch requires an available permanent Redis lock service");
  }

  let lastError: unknown = null;
  for (const client of clients) {
    try {
      return await command(client);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("max requests limit exceeded")) {
        markClientExhausted(client);
        continue;
      }
      throw Object.assign(new Error(`Canonical Atlas Redis lock command failed: ${message}`), { cause: error });
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown Redis command failure");
  throw new Error(`Canonical Atlas Redis lock command unavailable: ${message}`);
}

async function fenceLeaseLostCases(type: string, jobId: string): Promise<void> {
  const finishedAt = new Date().toISOString();
  // This is invoked only after a successful renewal command confirms owner
  // mismatch. A second Redis write can still fail or find a missing job hash;
  // independently fence the active durable case so one-store failure cannot
  // leave the old worker able to continue writing trusted case state.
  const redisFence = withStrictPermanentClient(async (redis) => Number(await redis.eval(
    "local owner=redis.call('get',KEYS[1]); if owner==ARGV[1] then return 0 end; local k=KEYS[2]; local status=redis.call('hget',k,'status'); if not status or status=='done' or status=='failed' or status=='cancelled' then return 0 end; redis.call('hset',k,'status','cancelled','outcome','incomplete','message',ARGV[2],'finishedAt',ARGV[3]); return 1",
    2,
    `apex:activejob:${type}`,
    `apex:job:${jobId}`,
    jobId,
    "Canonical lease lost; refusing further work.",
    finishedAt,
  )) === 1);

  const dbFence = db.update(researchCasesTable)
    .set({ status: "review", currentAction: "canonical-lease-lost", updatedAt: new Date() })
    .where(and(
      eq(researchCasesTable.status, "active"),
      or(
        sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`,
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`,
      ),
    ));

  const [redisResult, databaseResult] = await Promise.allSettled([redisFence, dbFence]);
  if (redisResult.status === "rejected" || databaseResult.status === "rejected") {
    const redisState = redisResult.status === "rejected" ? "failed" : redisResult.value ? "fenced" : "no-op";
    const databaseState = databaseResult.status === "rejected" ? "failed" : "fenced";
    logger.error({ type, jobId, redisState, databaseState }, "Canonical lease-loss fencing incomplete");
    throw new Error(`Canonical lease-loss fencing incomplete: redis=${redisState}; database=${databaseState}`);
  }
}

export async function claimCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const outcome: ClaimResult = {
    available: true,
    // The lease is claimable only for an authoritative queued job snapshot.
    // This atomic check prevents an in-memory-only job from starting research
    // if Redis recovers between createJob() and the lease acquisition.
    result: Number(await withStrictPermanentClient((redis) => redis.eval(
      "if redis.call('exists',KEYS[2])==0 then return -1 end; local status=redis.call('hget',KEYS[2],'status'); if status~='queued' then return -2 end; local claimed=redis.call('set',KEYS[1],ARGV[1],'EX',ARGV[2],'NX'); if claimed then return 1 else return 0 end",
      2,
      `apex:activejob:${type}`,
      `apex:job:${jobId}`,
      jobId,
      String(JOB_LOCK_TTL_SECONDS),
    ))),
  };
  if (outcome.result !== 1) return false;
  invalidateActiveJobCache(type);
  const timerKey = `${type}:${jobId}`; const prior = leaseTimers.get(timerKey); if (prior) clearInterval(prior);
  const timer = setInterval(() => { void renewCanonicalJob(type, jobId).then((renewed) => { if (!renewed) { const current = leaseTimers.get(timerKey); if (current) clearInterval(current); leaseTimers.delete(timerKey); void fenceLeaseLostCases(type, jobId).catch((error) => logger.error({ type, jobId, error: error instanceof Error ? error.message : "unknown" }, "Canonical lease-loss fence failed")); } }).catch((error) => { logger.warn({ type, jobId, error: error instanceof Error ? error.message : "unknown" }, "Canonical lease renewal failed; retrying before fencing"); }); }, JOB_LOCK_RENEW_INTERVAL_MS);
  timer.unref?.(); leaseTimers.set(timerKey, timer); return true;
}

type LeaseResult = { available: true; renewed: boolean };
export async function renewCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const outcome: LeaseResult = {
    available: true,
    renewed: Number(await withStrictPermanentClient((redis) => redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end", 1, `apex:activejob:${type}`, jobId, String(JOB_LOCK_TTL_SECONDS)))) === 1,
  };
  if (outcome.renewed) invalidateActiveJobCache(type);
  return outcome.renewed;
}

type ReleaseResult = { available: true; released: boolean };
const CANONICAL_OWNER_READ_RETRY_DELAYS_MS = [300, 600] as const;

/**
 * A canonical owner read is safe to retry once only when the failure is a
 * recognized transport interruption. Never classify Upstash quota/capacity,
 * command-policy, or unknown-state failures as transient, and never switch to
 * a secondary Redis URL: those stores are independent databases, not replicas.
 */
function isTransientCanonicalOwnerReadFailure(error: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = error;
  const seen = new Set<object>();
  for (let depth = 0; depth < 4 && current && typeof current === "object" && !seen.has(current); depth++) {
    seen.add(current);
    const shape = current as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
    if (typeof shape.name === "string") parts.push(shape.name);
    if (typeof shape.message === "string") parts.push(shape.message);
    if (typeof shape.code === "string") parts.push(shape.code);
    current = shape.cause;
  }
  if (typeof current === "string") parts.push(current);
  const diagnostic = parts.join(" ");
  if (/max requests limit exceeded|quota|monthly cap|capacity exhausted|budget exhausted/i.test(diagnostic)) return false;
  if (/\b(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ECONNABORTED|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN)\b/i.test(diagnostic)) return true;
  return /socket hang up|socket closed unexpectedly|connection (?:is )?closed unexpectedly|reached the max retries per request limit|(?:command|operation) timed out/i.test(diagnostic);
}

async function readCanonicalJobOwner(type: string): Promise<string | null> {
  return withStrictPermanentClient((redis) => redis.get(`apex:activejob:${type}`));
}

export async function isCanonicalJobOwner(type: string, jobId: string): Promise<boolean> {
  let owner: string | null;
  for (let attempt = 0; ; attempt += 1) {
    try {
      owner = await readCanonicalJobOwner(type);
      break;
    } catch (error) {
      const retryDelayMs = CANONICAL_OWNER_READ_RETRY_DELAYS_MS[attempt];
      if (retryDelayMs === undefined || !isTransientCanonicalOwnerReadFailure(error)) throw error;
      // ioredis reconnects with an initial 200 ms backoff. A shorter retry races
      // that reconnect and can fail the canonical run before the same owner read
      // has a chance to reach the authoritative store again.
      await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  return owner === jobId;
}

export async function releaseCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const timerKey = `${type}:${jobId}`; const timer = leaseTimers.get(timerKey); if (timer) clearInterval(timer); leaseTimers.delete(timerKey);
  const outcome: ReleaseResult = {
    available: true,
    released: Number(await withStrictPermanentClient((redis) => redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", 1, `apex:activejob:${type}`, jobId))) === 1,
  };
  invalidateActiveJobCache(type);
  return outcome.released;
}
