/**
 * Launch the canonical Apex Atlas pipeline through the API job boundary.
 */

import { readApiJson } from "@/lib/api-json";
import { isMockMode } from "@/lib/dev-mock-data";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Default case objective used by the normal UI launch; operators can edit it before starting. */
export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "Find lesser-known or unknown wealthy people who are realistically contactable through legitimate public/professional routes and relevant to the founder’s objective; identify other objective-fit people, companies, assets and relationships. Ranking, top-N and famous-investor list pages are poor sources for this mission and should not be searched. Find people through primary evidence such as corporate filings, board seats, ownership records, company pages, documented exits and transaction announcements. Honor explicit human scope and exclusions. The Investigator owns meaning, relevance, hypotheses, target selection, research direction, source/tool choice, follow-ups, evidence-led pivots and stopping; Boss authorizes material scope changes. Where geography is open, the Investigator may develop evidence-led jurisdiction hypotheses and propose them to Boss. Do not infer wealth, ownership, role, identity or contactability from snippets or proximity. Search results and registry hits are leads; consequential claims require attributable fetched evidence and exact quotations. Keep organization routes distinct from personal routes. Preserve model-selected provisional leads and uncertainty; target research verifies identity, ownership, materiality, counter-evidence and routes before promotion. No keyword, regex, name, employer or domain gates; code verifies source reality, exact cited URLs and exact quotes, not meaning. Never invent people, relationships, wealth, contacts or URLs.";


export type LaunchAtlasOptions = {
  /** Operator spending cap; defaults to one target investigation. */
  targetCount?: number;
  researchDepth?: "fast" | "standard" | "deep";
  singleTargetId?: number;
  discoveryObjective?: string;
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
    // This is a resource ceiling, not a candidate admission or relevance decision.
    targetCount: opts.targetCount ?? 1,
    researchDepth: opts.researchDepth ?? "standard",
    targetTimeoutMs: 420_000,
    discoveryObjective: opts.discoveryObjective?.trim() || DEFAULT_ATLAS_DISCOVERY_OBJECTIVE,
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
