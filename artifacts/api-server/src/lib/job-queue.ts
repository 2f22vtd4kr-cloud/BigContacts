/**
 * Redis-backed background job queue for long-running ingestion tasks.
 *
 * Jobs are stored as Redis hashes: apex:job:<jobId>
 * Progress lists: apex:job:<jobId>:log (LPUSH, capped at 200 entries)
 */

import { randomUUID } from "crypto";
import { getRedisClient } from "./redis";
import { logger } from "./logger";

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

const JOB_TTL = 60 * 60 * 24; // 24 h
const LOG_CAP = 200;

function jobKey(jobId: string) { return `apex:job:${jobId}`; }
function logKey(jobId: string) { return `apex:job:${jobId}:log`; }

export async function createJob(type: string): Promise<string> {
  const jobId = randomUUID();
  const state: JobState = {
    jobId, type, status: "queued",
    progress: 0, inserted: 0, skipped: 0, errors: 0, total: 0,
    startedAt: new Date().toISOString(),
    message: "Queued",
  };
  const rc = getRedisClient();
  if (rc) {
    await rc.hset(jobKey(jobId), state as any);
    await rc.expire(jobKey(jobId), JOB_TTL);
  }
  return jobId;
}

export async function updateJob(jobId: string, patch: Partial<JobState>): Promise<void> {
  const rc = getRedisClient();
  if (!rc) return;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) flat[k] = String(v);
  await rc.hset(jobKey(jobId), flat);
  await rc.expire(jobKey(jobId), JOB_TTL);
}

export async function appendJobLog(jobId: string, line: string): Promise<void> {
  const rc = getRedisClient();
  if (!rc) return;
  await rc.lpush(logKey(jobId), `${new Date().toISOString()} ${line}`);
  await rc.ltrim(logKey(jobId), 0, LOG_CAP - 1);
  await rc.expire(logKey(jobId), JOB_TTL);
}

export async function getJob(jobId: string): Promise<JobState | null> {
  const rc = getRedisClient();
  if (!rc) return null;
  const raw = await rc.hgetall(jobKey(jobId));
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    jobId: raw.jobId ?? jobId,
    type: raw.type ?? "unknown",
    status: (raw.status ?? "queued") as JobStatus,
    progress: Number(raw.progress ?? 0),
    inserted: Number(raw.inserted ?? 0),
    skipped: Number(raw.skipped ?? 0),
    errors: Number(raw.errors ?? 0),
    total: Number(raw.total ?? 0),
    startedAt: raw.startedAt ?? "",
    finishedAt: raw.finishedAt,
    message: raw.message ?? "",
  };
}

export async function getJobLog(jobId: string): Promise<string[]> {
  const rc = getRedisClient();
  if (!rc) return [];
  const lines = await rc.lrange(logKey(jobId), 0, LOG_CAP - 1);
  return lines.reverse();
}

/** Deduplication: SHA-like key stored in a Redis set */
const DEDUP_SET = "apex:dedup:hnwi";

export async function isDuplicate(key: string): Promise<boolean> {
  const rc = getRedisClient();
  if (!rc) return false;
  return (await rc.sismember(DEDUP_SET, key)) === 1;
}

export async function markSeen(key: string): Promise<void> {
  const rc = getRedisClient();
  if (!rc) return;
  await rc.sadd(DEDUP_SET, key);
}

export async function getDedupCount(): Promise<number> {
  const rc = getRedisClient();
  if (!rc) return 0;
  return rc.scard(DEDUP_SET);
}

export async function clearDedup(): Promise<void> {
  const rc = getRedisClient();
  if (!rc) return;
  await rc.del(DEDUP_SET);
  logger.info("Dedup set cleared");
}

/** Track active job ID for each type (only one at a time) */
export async function setActiveJob(type: string, jobId: string): Promise<void> {
  const rc = getRedisClient();
  if (!rc) return;
  await rc.set(`apex:activejob:${type}`, jobId, "EX", JOB_TTL);
}

export async function getActiveJob(type: string): Promise<string | null> {
  const rc = getRedisClient();
  if (!rc) return null;
  return rc.get(`apex:activejob:${type}`);
}
