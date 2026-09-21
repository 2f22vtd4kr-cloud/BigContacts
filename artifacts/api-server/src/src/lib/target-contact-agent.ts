/** Target contact Investigator — model owns findings; deterministic code validates evidence. */
import { eq } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable } from "@workspace/db";
import { logger } from "./logger";
import { getJob } from "./job-queue";
import { runAgenticWebResearch, type AgenticFinding, type AgenticTrajectoryRecord } from "./agentic-web-research";
import { persistSourceBackedBureauContactsForEntity, type BureauContactLike, type InvestigatorPromotionProvenance } from "./bureau-contact-persist-strict";
import { resolveResearchDepth } from "./research-depth";
import { publishBureauEvent } from "./bureau-live-log";
import { computeContactOutcome } from "./contact-confidence";
import { isValidPublicEmail } from "./contact-validation";
import { publishDigSpan, spanFromLiveStep } from "./dig-span";
import { buildClaimSupportGraph, graphHasIndependentCorroboration, observationsFromSourceUrls, validateClaimSupportGraph, type EvidenceGraph } from "./source-corroboration";
export type TargetContactAgentResult = { status: "completed" | "timeout" | "unavailable" | "error" | "cancelled" | "skipped"; model: string; findings: number; searches: number; visits: number; trajectory: string[]; trajectoryRecords: AgenticTrajectoryRecord[]; evidenceGraphs: EvidenceGraph[]; phone: string | null; email: string | null; phoneSource: string | null; contactOutcome: string | null; executionId?: string };
type InvestigationAct = { action: string; provider?: string; query?: string; url?: string; summary?: string };
function observedUrlsFromTrajectory(trajectory: string[], records: AgenticTrajectoryRecord[] = []): Set<string> {
  const observed = new Set<string>();
  for (const record of records) {
    if (record.execution !== "success") continue;
    for (const raw of record.observedUrls ?? []) {
      try { observed.add(new URL(raw).href); } catch {}
    }
  }
  // Legacy trajectory lines are retained as a compatibility fallback for callers
  // that do not have structured records. Canonical callers always provide records.
  if (observed.size === 0) {
    for (const line of trajectory) {
      const match = String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+https?:\/\/\S+\s+execution=success(?:\s+observed=(https?:\/\/\S+))?/i);
      if (match?.[1]) { try { observed.add(new URL(match[1]).href); } catch {} }
    }
  }
  return observed;
}
