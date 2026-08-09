/**
 * Shared creative OSINT guidance injected into Boss → investigator prompts.
 * Real public data only. No synthetic contacts.
 */

import type { InvestigationProgress } from "./investigation-progress";
import { formatProgressForPrompt } from "./investigation-progress";
import type { ResearchDepth } from "./research-depth";

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
  const depth = input.depth ?? "standard";

  return `CREATIVE PUBLIC-OSINT ANGLES (use only real public sources; never invent contacts):
1. Official team / about / leadership / contact pages on candidate domains: ${domains}
2. Press, interviews, conference bios, award lists, club/venue pages tied to "${input.targetName}"
3. Parent / operator / C/O groups: ${orgs} — then team pages and named officers on those entities
4. Local-language and jurisdiction-aware queries for ${country} (owner, founder, director, principal, contact)
5. Social and messenger presence by name and org: Instagram, Telegram, TikTok, LinkedIn, X/Twitter, WhatsApp business pages when public
6. Registry trails: Companies House, EDGAR, GLEIF, OpenOwnership, local commercial registers — named officers become new subjects
7. Username footprint when handles/emails appear: Sherlock / Maigret / Holehe on exact public values only

PENDING STANDARD VECTORS TO RING THIS PASS (if this action is contact/footprint related): ${pending}
NAMED PEOPLE ALREADY ON THE CASE (follow with person-scoped public search when relevant): ${people}
DEPTH TIER: ${depth} — be adaptive and evidence-led; do not run a rigid checklist in fixed order.
RETURN every public contact found (personal and organization). UI marks verified personal separately.
Exact source URLs required. Separate discovered / unverified / verified. Label uncertainty. Stop on identity conflict.`;
}

export function buildInvestigatorProgressBlock(progress?: InvestigationProgress | null): string {
  if (!progress) return "No investigation progress map yet — attempt standard contact vectors when the selected action allows.";
  return formatProgressForPrompt(progress);
}
