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

  const body = {
    discoveryFirst: opts.discoveryFirst ?? true,
    targetCount: opts.targetCount ?? 50,
    researchLimit: opts.researchLimit ?? 10,
    runResearch: opts.runResearch !== false,
    hotLeadsOnly: opts.hotLeadsOnly ?? false,
    ...(opts.singleTargetId != null ? { singleTargetId: opts.singleTargetId } : {}),
  };

  try {
    const res = await fetch(`${BASE}/api/ingest/atlas-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readApiJson(res);

    if (res.status === 409) {
      return {
        ok: true,
        alreadyRunning: true,
        jobId: data?.jobId,
        message: data?.error ?? "Atlas pipeline already running.",
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
