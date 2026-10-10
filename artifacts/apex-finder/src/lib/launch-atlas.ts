/**
 * Launch the canonical Apex Atlas pipeline through the API job boundary.
 */

import { readApiJson } from "@/lib/api-json";
import { isMockMode } from "@/lib/dev-mock-data";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type LaunchAtlasOptions = {
  targetCount?: number;
  researchDepth?: "fast" | "standard" | "deep";
  singleTargetId?: number;
};

export type LaunchAtlasResult = {
  ok: boolean;
  jobId?: string;
  message: string;
  alreadyRunning?: boolean;
  mock?: boolean;
};

export async function launchAtlasPipeline(opts: LaunchAtlasOptions = {}): Promise<LaunchAtlasResult> {
  if (isMockMode()) {
    return {
      ok: true,
      mock: true,
      jobId: "mock-atlas-run",
      message: "Mock mode — pipeline not started. Clear ?mock=1 and deploy api-server to run for real.",
    };
  }

  const isSingle = opts.singleTargetId != null;
  const body = {
    targetCount: opts.targetCount ?? (isSingle ? 1 : 3),
    researchDepth: opts.researchDepth ?? "standard",
    targetTimeoutMs: 420_000,
    ...(isSingle ? { singleTargetId: opts.singleTargetId } : {}),
  };

  try {
    const res = await fetch(`${BASE}/api/ingest/atlas-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readApiJson(res);

    // 409 is authoritative distributed-lock state. Never terminate, delete, or
    // retry another operator's active job from the client.
    if (res.status === 409) {
      return {
        ok: false,
        alreadyRunning: true,
        jobId: data?.jobId,
        message: data?.error ?? "Atlas already has an active run — wait for it to finish before launching again.",
      };
    }
    if (!res.ok) return { ok: false, message: data?.error ?? `Launch failed (HTTP ${res.status})` };
    const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
    if (!jobId) {
      return {
        ok: false,
        message: data?.error ?? "Launch response did not include a valid job ID.",
      };
    }
    return { ok: true, jobId, message: data?.message ?? "Apex Atlas pipeline started." };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not reach api-server. Deploy the research API and proxy /api to launch Atlas." };
  }
}

export async function recoverAtlasControl(caseId: number): Promise<LaunchAtlasResult> {
  if (isMockMode()) return { ok: true, mock: true, message: "Mock mode — no control recovery started." };
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return { ok: false, message: "A valid Apex Atlas case ID is required for control recovery." };
  }
  try {
    const res = await fetch(`${BASE}/api/research/bureau/cases/${caseId}/recover-control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await readApiJson(res);
    if (res.status === 409) {
      return { ok: false, alreadyRunning: true, jobId: data?.jobId, message: data?.error ?? "This case cannot be recovered at its current control boundary." };
    }
    if (!res.ok) return { ok: false, message: data?.error ?? `Control recovery failed (HTTP ${res.status})` };
    return { ok: true, jobId: data?.jobId, message: data?.message ?? "Apex Atlas control recovery started." };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not reach api-server for Apex Atlas control recovery." };
  }
}

export async function stopAtlasPipeline(jobId?: string): Promise<LaunchAtlasResult> {
  if (isMockMode()) return { ok: true, mock: true, message: "Mock mode — nothing to stop." };
  try {
    const res = await fetch(`${BASE}/api/ingest/atlas-stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { jobId } : {}),
    });
    const data = await readApiJson(res);
    if (res.ok) return { ok: true, jobId: data?.jobId, message: data?.message ?? "Atlas research stopped." };
    return { ok: false, message: data?.message ?? data?.error ?? `Stop failed (HTTP ${res.status})` };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not reach api-server to stop Atlas." };
  }
}
