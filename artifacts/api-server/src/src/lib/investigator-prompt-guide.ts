/**
 * Shared creative OSINT guidance injected into Boss → investigator prompts.
 * Real public data only. No synthetic contacts.
 * Depth fallback matches Replit default (fast) — bulk cost-safe.
 *
 * Canonical shape: docs/GOLDEN_STANDARD_CASE_REFERENCE.md
 * Boss and right-hand treat that document as the textbook execution target
 * for mid-market public-surface cases (mixed-randomised discovery → org lock →
 * force related-people → refuse-done → HNWI-path distinction).
 */

import type { InvestigationProgress } from "./investigation-progress";
import { formatProgressForPrompt } from "./investigation-progress";
import { DEFAULT_RESEARCH_DEPTH, type ResearchDepth } from "./research-depth";

/** Short pointer injected so Boss always sees the golden-standard reference. */
export const GOLDEN_STANDARD_REFERENCE =
  "GOLDEN STANDARD REFERENCE: docs/GOLDEN_STANDARD_CASE_REFERENCE.md — " +
  "textbook mixed-randomised discovery → org surface lock → force related-people SERP → " +
  "refuse-done until people attached → Personal vs Company·related vs org-mailbox distinction → " +
  "HNWI-path owners/partners flagged. Match that shape. Grok is the floor.";

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

CREATIVE PUBLIC-OSINT ANGLES (use only real public sources; never invent contacts):
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
OBJECTIVE: Recover public contact routes and related people with exact source URLs.
Research freely — invent queries, visit primary pages, pivot. Never invent contacts. Never mark org inboxes Personal.

WALLET-FIRST DISCOVERY (when objective or seed is a crypto wallet):
- Parse address; classify EOA vs contract; skip labeled exchange/mixer/protocol treasuries.
- Attribute holder only from public citable sources (ENS, news, filings, personal/company pages).
- No holder attribution → do not run contact hops; report unattributed.
- After person lock → maximize people-contacts via the normal surface stack; wallet value is wealth evidence only.
- Never invent holder, email, or phone from chain analysis alone.

SURFACE RECOVERY: When a page shows officers, ownership, emails, or phones, extract them with source URLs.
Never invent; never mark org inboxes Personal.

Exact source URLs required. Separate discovered / unverified / verified. Label uncertainty. Stop on identity conflict.`;
}

export function buildInvestigatorProgressBlock(progress?: InvestigationProgress | null): string {
  if (!progress) return "No investigation progress map yet — attempt standard contact vectors when the selected action allows.";
  return formatProgressForPrompt(progress);
}
