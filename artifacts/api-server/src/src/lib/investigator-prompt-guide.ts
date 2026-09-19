/**
 * Shared investigator guidance for Apex Atlas.
 *
 * This module intentionally does not prescribe search strings, provider order,
 * hop order, or a contact-vector checklist. The configured Investigator LLM
 * owns those choices from its training plus the live case context.
 */

import type { InvestigationProgress } from "./investigation-progress";
import { formatProgressForPrompt } from "./investigation-progress";
import { DEFAULT_RESEARCH_DEPTH, type ResearchDepth } from "./research-depth";
import { apexOrientationFor } from "./apex-bureau-orientation";

/** Short evidence-quality pointer injected into the Investigator's assignment. */
export const GOLDEN_STANDARD_REFERENCE =
  "GOLDEN STANDARD REFERENCE: docs/GOLDEN_STANDARD_CASE_REFERENCE.md — " +
  "evidence quality bar (primary sources, exact observed URLs, no invented contacts).";

/**
 * Give the Investigator the minimum institutional guardrails while leaving
 * research strategy, query wording, provider choice and stopping judgment to
 * the trained model. This is deliberately contextual guidance, not a recipe.
 */
export function buildCreativeInvestigatorAngles(input: {
  targetName: string;
  targetType?: string | null;
  country?: string | null;
  pendingVectors?: string[];
  discoveredPeople?: string[];
  candidateDomains?: string[];
  relatedOrganizations?: string[];
  depth?: ResearchDepth;
}): string {
  const progress = input.pendingVectors?.length
    ? input.pendingVectors.join(", ")
    : "none explicitly recorded";
  const country = input.country?.trim() || "unknown jurisdiction";
  const depth = input.depth ?? DEFAULT_RESEARCH_DEPTH;

  return `${apexOrientationFor("investigator")}

---

${GOLDEN_STANDARD_REFERENCE}

CURRENT RESEARCH STATE (observational, not a checklist):
Target: ${input.targetName} (${input.targetType ?? "unknown type"})
Jurisdiction/context: ${country}
Research depth: ${depth}
Recorded open coverage hints: ${progress}
Previously observed people: ${(input.discoveredPeople ?? []).join("; ") || "none recorded"}
Previously observed domains: ${(input.candidateDomains ?? []).join("; ") || "none recorded"}
Previously observed organizations: ${(input.relatedOrganizations ?? []).join("; ") || "none recorded"}

RESEARCH AUTONOMY:
Use your trained web-research judgment to decide what the current evidence most strongly suggests doing next. Write the actual search request/query yourself for the specific target, current evidence gap, aliases, role, geography, source type, or lead you are pursuing. Query wording must emerge from the live case rather than from a fixed template.

You may change direction when new evidence changes the information landscape. You may choose a search provider, direct page visit, registry/domain lookup, footprint action, corroboration, pivot, or stop according to expected information gain and the capabilities actually exposed to you.

Do not treat the recorded coverage hints, previous queries, or this guidance as mandatory stages. Do not repeat a query merely because it is conventional. Preserve exact observed values and URLs, distinguish identity from association, and return all useful public evidence rather than suppressing organization or review-only routes.`;
}

export function buildInvestigatorProgressBlock(progress?: InvestigationProgress | null): string {
  if (!progress) return "No investigation progress map yet — choose the research trajectory from the live case evidence.";
  return `${formatProgressForPrompt(progress)}\n
IMPORTANT: this is observational coverage telemetry only. It is not a mandatory search checklist, priority order, or stopping rule. The Investigator may ignore or supersede any listed pending vector when the live evidence points elsewhere.`;
}
