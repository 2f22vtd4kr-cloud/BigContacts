import { withPermanentClient } from "../../lib/redis";

const JOB_LOCK_TTL_SECONDS = 60 * 60 * 24 * 7;

type ClaimResult = { available: true; result: string | null };

/**
 * Atomically claim a canonical job lock across API instances.
 *
 * getActiveJob()+setActiveJob() is not a distributed lock: two instances can
 * observe the same empty/stale state and both launch work. Canonical research
 * must fail closed if Redis cannot perform the atomic claim.
 */
export async function claimCanonicalJob(type: string, jobId: string): Promise<boolean> {
  const outcome = await withPermanentClient<ClaimResult | null>(
    async (redis) => ({
      available: true,
      result: await redis.set(
        `apex:activejob:${type}`,
        jobId,
        "EX",
        JOB_LOCK_TTL_SECONDS,
        "NX",
      ),
    }),
    null,
  );

  if (!outcome?.available) {
    throw new Error("Canonical Atlas launch requires an available permanent Redis lock service");
  }

  return outcome.result === "OK";
}
