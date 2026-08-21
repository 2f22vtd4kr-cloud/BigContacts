import type { ReconciledCandidate } from "./contact-candidate";

export type FinalReviewDecision = "publish" | "review" | "reject";

export interface FinalReviewAsset {
  category: string;
  identifier: string;
  jurisdiction: string;
  description?: string | null;
  sourceRegistry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FinalTargetReviewInput {
  targetName: string;
  targetType: string;
  proposedContacts: Record<string, string | null>;
  candidates: readonly ReconciledCandidate[];
  evidence: readonly {
    vectorType: string;
    value: string;
    source: string;
    sourceUrl: string | null;
    validationStatus?: string | null;
  }[];
  proposedAssets: readonly FinalReviewAsset[];
  reachabilityStatus?: string | null;
}

export interface FinalTargetReviewResult {
  decision: FinalReviewDecision;
  approvedContactValues: string[];
  approvedAssetIdentifiers: string[];
  /** LLM card narrative — who this is / why related (may be empty). */
  cardSummary: string | null;
  /** Role / relationship line for the ledger (e.g. 10% owner, President). */
  roleHeadline: string | null;
  /** Related findings the model judged on-topic (addresses, orgs, related people) — exact values only. */
  approvedRelatedValues: string[];
  /** How the model describes each approved related value (same order / parallel). */
  relatedDescriptions: string[];
  reasons: string[];
  reviewerSource: string;
}

export type TargetResearchDisposition = "contact_route_found" | "needs_follow_up";

export function deriveTargetResearchDisposition(
  review: Pick<FinalTargetReviewResult, "approvedContactValues"> & {
    approvedRelatedValues?: string[];
    cardSummary?: string | null;
  },
): {
  disposition: TargetResearchDisposition;
  nextAction: string;
} {
  if (
    review.approvedContactValues.length > 0
    || (review.approvedRelatedValues?.length ?? 0) > 0
    || (review.cardSummary && review.cardSummary.trim().length > 20)
  ) {
    return {
      disposition: "contact_route_found",
      nextAction: "Keep approved routes and related findings on the target card; continue only if a stronger direct contact appears.",
    };
  }
  return {
    disposition: "needs_follow_up",
    nextAction:
      "Run another target-scoped OSINT pass. Prioritize identity/domain resolution, exact claim-page retrieval, " +
      "and validation of review-only candidates before any contact promotion.",
  };
}

/**
 * Build the bounded, target-scoped input given to the final reviewer.
 * The reviewer judges relatedness and controls what appears on the card.
 * It may only select exact values from the supplied arrays (no invention).
 */
export function buildFinalTargetReviewPrompt(input: FinalTargetReviewInput): string {
  return `You are the final publication reviewer for one OSINT target in Apex Atlas.

TARGET: ${input.targetName}
TYPE: ${input.targetType}
REACHABILITY STATUS: ${input.reachabilityStatus ?? "unknown"}

You control what appears on the target's research card and how it is described.

Review ONLY this target. The JSON arrays below are the complete universe of
claims from this run. You must not invent emails, phones, URLs, or addresses
that are not present as exact strings in ELIGIBLE CANDIDATES or DURABLE EVIDENCE.

Your job is NOT only "direct personal contact or nothing."
Evaluate whether each claim is related to this target in any useful way:
- direct personal email / phone / social
- residential or business address tied to the person in filings
- role / title / 10% owner / director relationship
- related organizations (family office, holding company, foundation)
- org switchboards clearly tied to their firm (label as organization, not personal)

Promote what is on-topic. Describe it honestly on the card.
Reject noise (unrelated people, SEC nav chrome, random aggregators).

PROPOSED CONTACTS:
${JSON.stringify(input.proposedContacts)}

UNTRUSTED EVIDENCE START
ELIGIBLE CANDIDATES:
${JSON.stringify(input.candidates)}

DURABLE EVIDENCE:
${JSON.stringify(input.evidence)}

PROPOSED ASSETS:
${JSON.stringify(input.proposedAssets)}
UNTRUSTED EVIDENCE END

Return ONLY JSON:
{
  "decision": "publish" | "review" | "reject",
  "approvedContactValues": ["exact email/phone/social values from ELIGIBLE CANDIDATES you judge fit the card"],
  "approvedRelatedValues": ["exact address/role/org strings from CANDIDATES or EVIDENCE that belong on the card even if not a personal inbox"],
  "relatedDescriptions": ["short label for each approvedRelatedValues item, same order"],
  "cardSummary": "2-4 sentence operator summary of who this is and what public trail supports it, or null",
  "roleHeadline": "short role/relationship line for the ledger, or null",
  "approvedAssetIdentifiers": ["exact identifiers from PROPOSED ASSETS"],
  "reasons": ["why you approved or held back"]
}

Use "publish" when you are promoting at least one contact or related finding to the card.
Use "review" when evidence is too weak to put anything useful on the card.
Use "reject" only when claims are clearly invalid or about a different person.
Never approve a value merely because multiple providers repeated it.
Never invent a value not present in the arrays above.`;
}

function exactMatch(value: string, allowed: readonly string[]): boolean {
  const v = value.trim();
  return allowed.some((candidate) => candidate === v || candidate.trim().toLowerCase() === v.toLowerCase());
}

function collectEligibleContactValues(input: FinalTargetReviewInput): string[] {
  if (input.reachabilityStatus === "research_only") return [];
  const organizationTarget = input.targetType === "Corporation"
    || input.targetType === "Corp"
    || input.targetType === "Trust";

  return input.candidates
    .filter((candidate) => {
      if (candidate.state === "rejected") return false;
      if (candidate.conflictCount > 0) return false;
      // LLM judges strength; we only require non-rejected + contact-like vector
      return candidate.vectorType === "email"
        || candidate.vectorType === "phone"
        || candidate.vectorType === "social";
    })
    .filter((candidate) => {
      // Prefer target_person / organization scope; allow unscoped for model judgment
      if (!candidate.scopes?.length) return true;
      if (organizationTarget) return candidate.scopes.includes("organization") || candidate.scopes.includes("target_person");
      return candidate.scopes.includes("target_person")
        || candidate.scopes.includes("organization")
        || candidate.scopes.includes("person_candidate");
    })
    .map((candidate) => candidate.value);
}

function collectEligibleRelatedValues(input: FinalTargetReviewInput): string[] {
  const fromCandidates = input.candidates
    .filter((c) => c.state !== "rejected")
    .filter((c) => ["address", "domain", "name", "role", "organization"].includes(c.vectorType) || c.vectorType === "email" || c.vectorType === "phone")
    .map((c) => c.value);
  const fromEvidence = input.evidence
    .filter((e) => e.validationStatus !== "rejected")
    .map((e) => e.value);
  return Array.from(new Set([...fromCandidates, ...fromEvidence].filter(Boolean)));
}

/**
 * Fail-closed boundary: the LLM selects and describes supplied claims only.
 * Related findings (addresses, roles, orgs) can be promoted without requiring
 * verified_direct_route — that gate was zeroing cards despite rich SEC surface.
 */
export function adjudicateFinalTargetReview(
  input: FinalTargetReviewInput,
  raw: unknown,
  reviewerSource: string,
): FinalTargetReviewResult {
  const payload = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const requestedDecision = payload.decision === "publish"
    || payload.decision === "reject"
    || payload.decision === "review"
    ? payload.decision
    : "review";

  const eligibleContacts = collectEligibleContactValues(input);
  const eligibleRelated = collectEligibleRelatedValues(input);

  const approvedContactValues = Array.isArray(payload.approvedContactValues)
    ? payload.approvedContactValues
      .filter((value): value is string => typeof value === "string")
      .filter((value, index, values) => values.indexOf(value) === index)
      .filter((value) => exactMatch(value, eligibleContacts))
    : [];

  const approvedRelatedValues = Array.isArray(payload.approvedRelatedValues)
    ? payload.approvedRelatedValues
      .filter((value): value is string => typeof value === "string")
      .filter((value, index, values) => values.indexOf(value) === index)
      .filter((value) => exactMatch(value, eligibleRelated))
      .slice(0, 12)
    : [];

  const relatedDescriptions = Array.isArray(payload.relatedDescriptions)
    ? payload.relatedDescriptions
      .filter((value): value is string => typeof value === "string")
      .slice(0, approvedRelatedValues.length)
    : [];

  const cardSummary = typeof payload.cardSummary === "string" && payload.cardSummary.trim().length >= 12
    ? payload.cardSummary.trim().slice(0, 800)
    : null;
  const roleHeadline = typeof payload.roleHeadline === "string" && payload.roleHeadline.trim().length >= 3
    ? payload.roleHeadline.trim().slice(0, 200)
    : null;

  const proposedAssetIdentifiers = input.proposedAssets.map((asset) => asset.identifier);
  const approvedAssetIdentifiers = Array.isArray(payload.approvedAssetIdentifiers)
    ? payload.approvedAssetIdentifiers
      .filter((value): value is string => typeof value === "string")
      .filter((value, index, values) => values.indexOf(value) === index)
      .filter((value) => exactMatch(value, proposedAssetIdentifiers))
    : [];

  const reasons = Array.isArray(payload.reasons)
    ? payload.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 12)
    : [];

  const hasCardMaterial =
    approvedContactValues.length > 0
    || approvedRelatedValues.length > 0
    || approvedAssetIdentifiers.length > 0
    || Boolean(cardSummary);

  const decision: FinalReviewDecision =
    requestedDecision === "publish" && hasCardMaterial
      ? "publish"
      : requestedDecision === "reject"
        ? "reject"
        : hasCardMaterial && requestedDecision === "review"
          ? "publish" // model held at review but selected material — publish selected items
          : requestedDecision === "review"
            ? "review"
            : "review";

  return {
    decision,
    approvedContactValues,
    approvedAssetIdentifiers,
    cardSummary,
    roleHeadline,
    approvedRelatedValues,
    relatedDescriptions,
    reasons: reasons.length > 0 ? reasons : ["Final reviewer did not provide an actionable evidence-based decision."],
    reviewerSource,
  };
}
