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
  cardSummary: string | null;
  roleHeadline: string | null;
  approvedRelatedValues: string[];
  relatedDescriptions: string[];
  reasons: string[];
  reviewerSource: string;
}

export type TargetResearchDisposition = "contact_route_found" | "needs_follow_up";

/** A narrative alone is never a successful research disposition. */
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

export function buildFinalTargetReviewPrompt(input: FinalTargetReviewInput): string {
  return `You are the final publication reviewer for one OSINT target in Apex Atlas.\n\nTARGET: ${input.targetName}\nTYPE: ${input.targetType}\nREACHABILITY STATUS: ${input.reachabilityStatus ?? "unknown"}\n\nYou control what appears on the target's research card and how it is described.\n\nReview ONLY this target. The JSON arrays below are the complete universe of\nclaims from this run. You must not invent emails, phones, URLs, or addresses\nthat are not present as exact strings in ELIGIBLE CANDIDATES or DURABLE EVIDENCE.\n\nYour job is NOT only "direct personal contact or nothing."\nEvaluate whether each claim is related to this target in any useful way:\n- direct personal email / phone / social\n- residential or business address tied to the person in filings\n- role / title / 10% owner / director relationship\n- related organizations (family office, holding company, foundation)\n- org switchboards clearly tied to their firm (label as organization, not personal)\n\nPROPOSED CONTACTS:\n${JSON.stringify(input.proposedContacts)}\n\nUNTRUSTED EVIDENCE START\nELIGIBLE CANDIDATES:\n${JSON.stringify(input.candidates)}\n\nDURABLE EVIDENCE:\n${JSON.stringify(input.evidence)}\n\nPROPOSED ASSETS:\n${JSON.stringify(input.proposedAssets)}\nUNTRUSTED EVIDENCE END\n\nReturn ONLY JSON:\n{\n  "decision": "publish" | "review" | "reject",\n  "approvedContactValues": ["exact email/phone/social values from ELIGIBLE CANDIDATES you judge fit the card"],\n  "approvedRelatedValues": ["exact address/role/org strings from CANDIDATES or EVIDENCE that belong on the card even if not a personal inbox"],\n  "relatedDescriptions": ["short label for each approvedRelatedValues item, same order"],\n  "cardSummary": "2-4 sentence operator summary of who this is and what public trail supports it, or null",\n  "roleHeadline": "short role/relationship line for the ledger, or null",\n  "approvedAssetIdentifiers": ["exact identifiers from PROPOSED ASSETS"],\n  "reasons": ["why you approved or held back"]\n}\n\nUse "publish" when you are promoting at least one contact or related finding to the card.\nUse "review" when evidence is too weak to put anything useful on the card.\nUse "reject" only when claims are clearly invalid or about a different person.\nNever approve a value merely because multiple providers repeated it.\nNever write a contact value in cardSummary unless that exact value is also in approvedContactValues.\nNever invent a value not present in the arrays above.`;
}

function exactMatch(value: string, allowed: readonly string[]): boolean {
  const v = value.trim();
  return allowed.some((candidate) => candidate === v || candidate.trim().toLowerCase() === v.toLowerCase());
}

function publicationConflictKey(vectorType: string, value: string): string {
  const vector = vectorType.trim().toLowerCase();
  const normalized = vector === "phone"
    ? value.replace(/\D/g, "")
    : value.trim().toLowerCase();
  return `${vector}|${normalized}`;
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
      return candidate.vectorType === "email"
        || candidate.vectorType === "phone"
        || candidate.vectorType === "social";
    })
    .filter((candidate) => {
      if (!candidate.scopes?.length) return true;
      if (organizationTarget) return candidate.scopes.includes("organization") || candidate.scopes.includes("target_person");
      return candidate.scopes.includes("target_person")
        || candidate.scopes.includes("organization")
        || candidate.scopes.includes("person_candidate");
    })
    .map((candidate) => candidate.value);
}

function collectEligibleRelatedValues(input: FinalTargetReviewInput): string[] {
  const conflictedContactKeys = new Set(
    input.candidates
      .filter((candidate) => candidate.conflictCount > 0)
      .filter((candidate) => ["email", "phone", "social"].includes(candidate.vectorType))
      .map((candidate) => publicationConflictKey(candidate.vectorType, candidate.value)),
  );
  const fromCandidates = input.candidates
    .filter((c) => c.state !== "rejected")
    .filter((c) => c.conflictCount === 0)
    // Related publication is still publication. A candidate must carry an
    // actual source URL and an observed claim anchor; provider repetition or
    // an ungrounded model value is not sufficient provenance.
    .filter((c) => c.sourceUrls.length > 0 && c.exactClaimObserved)
    .filter((c) => ["address", "domain", "name", "role", "organization"].includes(c.vectorType) || c.vectorType === "email" || c.vectorType === "phone")
    .map((c) => c.value);
  const fromEvidence = input.evidence
    .filter((e) => e.validationStatus !== "rejected")
    // Durable evidence is publishable only when it retains its source anchor.
    // Contact conflicts are additionally fenced against a conflicting candidate.
    .filter((e) => typeof e.sourceUrl === "string" && /^https?:\/\//i.test(e.sourceUrl))
    .filter((e) => !["email", "phone", "social"].includes(e.vectorType) || !conflictedContactKeys.has(publicationConflictKey(e.vectorType, e.value)))
    .map((e) => e.value);
  return Array.from(new Set([...fromCandidates, ...fromEvidence].filter(Boolean)));
}

function scrubUnsupportedContactClaims(summary: string | null, approvedContacts: readonly string[]): string | null {
  if (!summary) return null;
  const approved = approvedContacts.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const emails = summary.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const urls = summary.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const phoneLike = summary.match(/(?:\+?\d[\d().\s-]{7,}\d)/g) ?? [];
  const unsupported = [...emails, ...urls, ...phoneLike].some((token) => {
    const normalized = token.trim().toLowerCase().replace(/[),.;]+$/, "");
    return !approved.includes(normalized);
  });
  return unsupported ? null : summary;
}

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

  const cardSummaryRaw = typeof payload.cardSummary === "string" && payload.cardSummary.trim().length >= 12
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

  const cardSummary = scrubUnsupportedContactClaims(cardSummaryRaw, approvedContactValues);

  const hasCardMaterial =
    approvedContactValues.length > 0
    || approvedRelatedValues.length > 0
    || approvedAssetIdentifiers.length > 0;

  const decision: FinalReviewDecision =
    requestedDecision === "reject" && !hasCardMaterial
      ? "reject"
      : hasCardMaterial && requestedDecision === "publish"
        ? "publish"
        : "review";

  return {
    decision,
    approvedContactValues,
    approvedAssetIdentifiers,
    cardSummary,
    roleHeadline,
    approvedRelatedValues,
    relatedDescriptions,
    reasons: reasons.length > 0
      ? reasons
      : hasCardMaterial
        ? ["Published from exact values explicitly selected by the reviewer."]
        : ["No values were explicitly selected for publication. Run another target-scoped OSINT review."],
    reviewerSource,
  };
}
