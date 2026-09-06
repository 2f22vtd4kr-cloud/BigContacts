/**
 * Bounded discovery telemetry for forensic debugging.
 * Stores actions, tool outputs, observations and structured decisions only;
 * never stores hidden chain-of-thought / free-form model reasoning.
 */
import { permGet, permSet } from "./redis";

const TRACE_TTL_SECONDS = 60 * 60 * 24 * 3;
const MAX_SLOTS = 10;
const MAX_TRAJECTORY = 80;
const MAX_TEXT = 1800;
const MAX_URLS = 30;
const KEY_PREFIX = "investigator-trace:v1:";

export type DiscoveryTraceRecord = {
  slot: number;
  recordedAt: string;
  model?: string;
  status?: string;
  searches: number;
  visits: number;
  stopReason?: string;
  error?: string;
  modelFindings: unknown[];
  parsedCandidates: unknown[];
  admission?: unknown;
  trajectory: string[];
  resultUrls: string[];
};

export type DiscoveryTrace = {
  jobId: string;
  updatedAt: string;
  slots: DiscoveryTraceRecord[];
};

function clip(value: unknown, max = MAX_TEXT): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeUrls(values: unknown): string[] {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((v) => String(v ?? "").trim())
    .filter((v) => /^https?:\/\//i.test(v))))
    .slice(0, MAX_URLS);
}

function safeFinding(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const f = value as Record<string, unknown>;
  return {
    vectorType: clip(f.vectorType, 80),
    value: clip(f.value, 500),
    personName: clip(f.personName, 180) || null,
    role: clip(f.role, 180) || null,
    scope: clip(f.scope, 40) || "unknown",
    sourceUrls: safeUrls(f.sourceUrls),
    note: clip(f.note, 700),
    promotionDecision: clip(f.promotionDecision, 30) || undefined,
    promotionReason: clip(f.promotionReason, 700) || undefined,
  };
}

function safeCandidate(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const c = value as Record<string, unknown>;
  return {
    name: clip(c.name, 180),
    role: clip(c.role, 180) || undefined,
    company: clip(c.company, 180) || undefined,
    basis: clip(c.basis, 700),
    sourceUrls: safeUrls(c.sourceUrls),
    promotionDecision: clip(c.promotionDecision, 30),
    promotionReason: clip(c.promotionReason, 700) || undefined,
  };
}

function safeTrajectory(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => clip(v, MAX_TEXT)).filter(Boolean).slice(-MAX_TRAJECTORY);
}

export async function recordDiscoveryTrace(jobId: string, record: DiscoveryTraceRecord): Promise<void> {
  if (!jobId) return;
  try {
    const key = `${KEY_PREFIX}${jobId}`;
    const existing = await permGet<DiscoveryTrace>(key);
    const slots = Array.isArray(existing?.slots) ? existing.slots.filter((s) => s?.slot !== record.slot) : [];
    slots.push({
      ...record,
      modelFindings: Array.isArray(record.modelFindings) ? record.modelFindings.map(safeFinding) : [],
      parsedCandidates: Array.isArray(record.parsedCandidates) ? record.parsedCandidates.map(safeCandidate) : [],
      trajectory: safeTrajectory(record.trajectory),
      resultUrls: safeUrls(record.resultUrls),
      error: clip(record.error, 500) || undefined,
    });
    slots.sort((a, b) => a.slot - b.slot);
    await permSet(key, { jobId, updatedAt: new Date().toISOString(), slots: slots.slice(0, MAX_SLOTS) }, TRACE_TTL_SECONDS);
  } catch {
    // Observability must never change research behavior.
  }
}

export async function getDiscoveryTrace(jobId: string): Promise<DiscoveryTrace | null> {
  if (!jobId) return null;
  try { return await permGet<DiscoveryTrace>(`${KEY_PREFIX}${jobId}`); } catch { return null; }
}
