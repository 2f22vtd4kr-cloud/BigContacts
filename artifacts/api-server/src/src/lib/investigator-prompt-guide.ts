/**
 * Shared creative OSINT guidance injected into Boss → investigator prompts.
 * Real public data only. No synthetic contacts.
 * Depth fallback matches Replit default (fast) — bulk cost-safe.
 *
 * Reference: docs/GOLDEN_STANDARD_CASE_REFERENCE.md (evidence quality bar).
 * Investigators invent queries — not a forced execution script.
 */

import type { InvestigationProgress } from "./investigation-progress";
import { formatProgressForPrompt } from "./investigation-progress";
import { DEFAULT_RESEARCH_DEPTH, type ResearchDepth } from "./research-depth";

/** Short pointer injected so Boss always sees the golden-standard reference. */
export const GOLDEN_STANDARD_REFERENCE =
  "GOLDEN STANDARD REFERENCE: docs/GOLDEN_STANDARD_CASE_REFERENCE.md — " +
  "evidence quality bar (primary sources, exact URLs, no invented contacts). " +
  "Research freely; invent your own queries and visits.";

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
  const pending = (input.pendingVectors ?? []).join(", ") || "none listed";
  const people = (input.discoveredPeople ?? []).slice(0, 6).join("; ") || "none yet";
  const domains = (input.candidateDomains ?? []).slice(0, 6).join("; ") || "none yet";
  const orgs = (input.relatedOrganizations ?? []).slice(0, 6).join("; ") || "none yet";
  const country = input.country?.trim() || "unknown jurisdiction";
  const depth = input.depth ?? DEFAULT_RESEARCH_DEPTH;

  return `${GOLDEN_STANDARD_REFERENCE}

Research freely for "${input.targetName}" (${country}). Depth tier: ${depth}.
Case already has — people: ${people}; domains: ${domains}; orgs: ${orgs}; open gaps: ${pending}.
Prefer primary sources. Never invent contacts. Never mark org inboxes Personal.
Return structured findings with exact source URLs.`;
}

export function buildInvestigatorProgressBlock(progress?: InvestigationProgress | null): string {
  if (!progress) return "No investigation progress map yet — attempt standard contact vectors when the selected action allows.";
  return formatProgressForPrompt(progress);
}
