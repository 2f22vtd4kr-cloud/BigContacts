import { or, sql } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { withPermanentClient } from "../../lib/redis";

// A crashed process must not strand the canonical lane for seven days. Live
// owners renew the lease; recovery after a crash is therefore bounded by this
// window rather than by the historical job TTL.
const JOB_LOCK_TTL_SECONDS = 60 * 60;
const JOB_LOCK_RENEW_INTERVAL_MS = 20 * 60 * 1000;
const leaseTimers = new Map<string, ReturnType<typeof setInterval>>();

type ClaimResult = { available: true; result: string | null };

async function fenceLeaseLostCases(jobId: string): Promise<void> {
  // Redis leases cannot themselves fence a stale process after expiry. The
  // durable case state is the second half of the fence: once ownership is lost,
  // stop any target case bound to this job from reaching trusted promotion.
  await db.update(researchCasesTable)
    .set({ status: "review", currentAction: "canonical-lease-lost", updatedAt: new Date() })
    .where(or(
      sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`,
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`,
    ));
}

export async function claimCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const outcome = await withPermanentClient<ClaimResult | null>(
    async (redis) => ({
      available: true,
      result: await redis.set(`apex:activejob:${type}`, jobId, "EX", JOB_LOCK_TTL_SECONDS, "NX"),
    }),
    null,
  );
  if (!outcome?.available) throw new Error("Canonical Atlas launch requires an available permanent Redis lock service");
  if (outcome.result !== "OK") return false;

  const timerKey = `${type}:${jobId}`;
  const prior = leaseTimers.get(timerKey);
  if (prior) clearInterval(prior);
  const timer = setInterval(() => {
    void renewCanonicalJob(type, jobId).then((renewed) => {
      if (!renewed) {
        const current = leaseTimers.get(timerKey);
        if (current) clearInterval(current);
        leaseTimers.delete(timerKey);
        void fenceLeaseLostCases(jobId).catch(() => undefined);
      }
    }).catch(() => {
      const current = leaseTimers.get(timerKey);
      if (current) clearInterval(current);
      leaseTimers.delete(timerKey);
      void fenceLeaseLostCases(jobId).catch(() => undefined);
    });
  }, JOB_LOCK_RENEW_INTERVAL_MS);
  timer.unref?.();
  leaseTimers.set(timerKey, timer);
  return true;
}

type LeaseResult = { available: true; renewed: boolean };

export async function renewCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const outcome = await withPermanentClient<LeaseResult | null>(
    async (redis) => ({
      available: true,
      renewed: Number(await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end",
        1,
        `apex:activejob:${type}`,
        jobId,
        String(JOB_LOCK_TTL_SECONDS),
      )) === 1,
    }),
    null,
  );
  if (!outcome?.available) throw new Error("Canonical Atlas job lock renewal requires an available permanent Redis lock service");
  return outcome.renewed;
}

type ReleaseResult = { available: true; released: boolean };

export async function releaseCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const timerKey = `${type}:${jobId}`;
  const timer = leaseTimers.get(timerKey);
  if (timer) clearInterval(timer);
  leaseTimers.delete(timerKey);
  const outcome = await withPermanentClient<ReleaseResult | null>(
    async (redis) => ({
      available: true,
      released: Number(await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        `apex:activejob:${type}`,
        jobId,
      )) === 1,
    }),
    null,
  );
  if (!outcome?.available) throw new Error("Canonical Atlas job lock release requires an available permanent Redis lock service");
  return outcome.released;
}
