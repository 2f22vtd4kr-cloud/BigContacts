/**
 * Launch the full Apex Atlas pipeline (api-server job queue).
 * POST /api/ingest/atlas-run — not a navigation-only link.
 */

import { readApiJson } from "@/lib/api-json";
import { isMockMode } from "@/lib/dev-mock-data";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type LaunchAtlasOptions = {
  /** Prefer diversified discovery over bulk FAA-scale ingest */
  discoveryFirst?: boolean;
  targetCount?: number;
  researchLimit?: number;
  runResearch?: boolean;
  hotLeadsOnly?: boolean;
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

export async function launchAtlasPipeline(
  opts: LaunchAtlasOptions = {},
): Promise<LaunchAtlasResult> {
  if (isMockMode()) {
    return {
      ok: true,
      mock: true,
      jobId: "mock-atlas-run",
      message: "Mock mode — pipeline not started. Clear ?mock=1 and deploy api-server to run for real.",
    };
  }

  // Must match api-server CANONICAL_ATLAS_LAUNCH_BODY (docs/RUN_BUREAU.md).
  const body = {
    discoveryFirst: opts.discoveryFirst ?? true,
    targetCount: opts.targetCount ?? 50,
    researchLimit: opts.researchLimit ?? 10,
    runResearch: opts.runResearch !== false,
    hotLeadsOnly: opts.hotLeadsOnly ?? false,
    skipFaa: true,
    broadCategories: 3,
    batchSize: 50,
    phaseJBatchSize: 10,
    targetTimeoutMs: 420_000,
    researchDepth: opts.researchDepth ?? "standard",
    ...(opts.singleTargetId != null ? { singleTargetId: opts.singleTargetId } : {}),
  };

  const postLaunch = () =>
    fetch(`${BASE}/api/ingest/atlas-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  let integrityNote = "";
  try {
    const hr = await fetch(`${BASE}/api/healthz`, { cache: "no-store" });
    if (hr.ok) {
      const hj = await readApiJson(hr);
      const level = hj?.bureauIntegrity ?? hj?.lanesHonesty?.bureauIntegrity;
      if (level === "critical") {
        integrityNote = " (bureauIntegrity=critical — dig may underperform; check search/LLM secrets)";
      }
    }
  } catch { /* healthz optional */ }

  try {
    let res = await postLaunch();
    let data = await readApiJson(res);

    if (res.status === 409) {
      try {
        await fetch(`${BASE}/api/ingest/atlas-stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data?.jobId ? { jobId: data.jobId } : {}),
        });
        await fetch(`${BASE}/api/ingest/atlas-lock`, { method: "DELETE" });
      } catch { /* best-effort */ }
      res = await postLaunch();
      data = await readApiJson(res);
    }

    if (res.status === 409) {
      return {
        ok: false,
        alreadyRunning: true,
        jobId: data?.jobId,
        message: data?.error ?? "Atlas still locked — wait 2s and press Launch again.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message: data?.error ?? `Launch failed (HTTP ${res.status})`,
      };
    }

    return {
      ok: true,
      jobId: data?.jobId,
      message: data?.message ?? "Apex Atlas pipeline started.",
    };
  } catch (e: any) {
    return {
      ok: false,
      message:
        e?.message ??
        "Could not reach api-server. Deploy the research API and proxy /api to launch Atlas.",
    };
  }
}


export async function stopAtlasPipeline(jobId?: string): Promise<LaunchAtlasResult> {
  if (isMockMode()) {
    return { ok: true, mock: true, message: "Mock mode — nothing to stop." };
  }
  // Prefer dedicated stop endpoint (sets cancelled). Fall back to DELETE lock
  // which is also cancelled after the integrity fix — never mark operator stop as failed.
  try {
    const res = await fetch(`${BASE}/api/ingest/atlas-stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { jobId } : {}),
    });
    const data = await readApiJson(res);
    if (res.ok) {
      return {
        ok: true,
        jobId: data?.jobId,
        message: data?.message ?? "Atlas research stopped.",
      };
    }
    // Fallback only if stop route is missing on older deploys
    if (res.status === 404) {
      const q = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
      const lockRes = await fetch(`${BASE}/api/ingest/atlas-lock${q}`, { method: "DELETE" });
      const lockData = await readApiJson(lockRes);
      if (!lockRes.ok) {
        return { ok: false, message: lockData?.message ?? lockData?.error ?? `Stop failed (HTTP ${lockRes.status})` };
      }
      return {
        ok: true,
        jobId: lockData?.jobId,
        message: lockData?.message ?? "Atlas research stopped.",
      };
    }
    return { ok: false, message: data?.message ?? data?.error ?? `Stop failed (HTTP ${res.status})` };
  } catch (e: any) {
    return {
      ok: false,
      message: e?.message ?? "Could not reach api-server to stop Atlas.",
    };
  }
}

export async function pauseAtlasPipeline(jobId?: string): Promise<LaunchAtlasResult> {
  if (isMockMode()) {
    return { ok: true, mock: true, message: "Mock mode — nothing to pause." };
  }
  try {
    const res = await fetch(`${BASE}/api/ingest/atlas-pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { jobId } : {}),
    });
    const data = await readApiJson(res);
    if (!res.ok) {
      return { ok: false, message: data?.message ?? data?.error ?? `Pause failed (HTTP ${res.status})` };
    }
    return { ok: true, jobId: data?.jobId, message: data?.message ?? "Atlas paused." };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not reach api-server to pause Atlas." };
  }
}

export async function resumeAtlasPipeline(jobId?: string): Promise<LaunchAtlasResult> {
  if (isMockMode()) {
    return { ok: true, mock: true, message: "Mock mode — nothing to resume." };
  }
  try {
    const res = await fetch(`${BASE}/api/ingest/atlas-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { jobId } : {}),
    });
    const data = await readApiJson(res);
    if (!res.ok) {
      return { ok: false, message: data?.message ?? data?.error ?? `Resume failed (HTTP ${res.status})` };
    }
    return { ok: true, jobId: data?.jobId, message: data?.message ?? "Atlas resumed." };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not reach api-server to resume Atlas." };
  }
}
