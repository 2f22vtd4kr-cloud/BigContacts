import { and, or, eq, sql } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { getAllPermanentClients, markClientExhausted } from "./redis";
import { invalidateActiveJobCache } from "./job-queue";

const JOB_LOCK_TTL_SECONDS = 15 * 60;
const JOB_LOCK_RENEW_INTERVAL_MS = 5 * 60 * 1000;
const leaseTimers = new Map<string, ReturnType<typeof setInterval>>();

type ClaimResult = { available: true; result: string | null };

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
      throw new Error(`Canonical Atlas Redis lock command failed: ${message}`);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown Redis command failure");
  throw new Error(`Canonical Atlas Redis lock command unavailable: ${message}`);
}

async function fenceLeaseLostCases(type: string, jobId: string): Promise<void> {
  const finishedAt = new Date().toISOString();
  const redisFence = withStrictPermanentClient(async (redis) => {
    await redis.hset(`apex:job:${jobId}`, { status: "cancelled", outcome: "incomplete", message: "Canonical lease lost; refusing further work.", finishedAt });
  });
  const dbFence = db.update(researchCasesTable).set({ status: "review", currentAction: "canonical-lease-lost", updatedAt: new Date() }).where(and(eq(researchCasesTable.status, "active"), or(sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`, sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`)));
  await Promise.allSettled([redisFence, dbFence]);
}

export async function claimCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const outcome: ClaimResult = {
    available: true,
    result: await withStrictPermanentClient((redis) => redis.set(`apex:activejob:${type}`, jobId, "EX", JOB_LOCK_TTL_SECONDS, "NX")),
  };
  if (outcome.result !== "OK") return false;
  invalidateActiveJobCache(type);
  const timerKey = `${type}:${jobId}`; const prior = leaseTimers.get(timerKey); if (prior) clearInterval(prior);
  const timer = setInterval(() => { void renewCanonicalJob(type, jobId).then((renewed) => { if (!renewed) { const current = leaseTimers.get(timerKey); if (current) clearInterval(current); leaseTimers.delete(timerKey); void fenceLeaseLostCases(type, jobId).catch(() => undefined); } }).catch(() => { const current = leaseTimers.get(timerKey); if (current) clearInterval(current); leaseTimers.delete(timerKey); void fenceLeaseLostCases(type, jobId).catch(() => undefined); }); }, JOB_LOCK_RENEW_INTERVAL_MS);
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
export async function releaseCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const timerKey = `${type}:${jobId}`; const timer = leaseTimers.get(timerKey); if (timer) clearInterval(timer); leaseTimers.delete(timerKey);
  const outcome: ReleaseResult = {
    available: true,
    released: Number(await withStrictPermanentClient((redis) => redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", 1, `apex:activejob:${type}`, jobId))) === 1,
  };
  invalidateActiveJobCache(type);
  return outcome.released;
}
