import type { ReconciledCandidate } from "./contact-candidate";

export type FinalReviewDecision = "publish" | "review" | "reject";
export interface FinalReviewAsset { category: string; identifier: string; jurisdiction: string; description?: string | null; sourceRegistry?: string | null; latitude?: number | null; longitude?: number | null; }
export interface FinalTargetReviewInput {
  targetName: string;
  targetType: string;
  proposedContacts: Record<string, string | null>;
  candidates: readonly ReconciledCandidate[];
  evidence: readonly { vectorType: string; value: string; source: string; sourceUrl: string | null; validationStatus?: string | null }[];
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

export function deriveTargetResearchDisposition(review: Pick<FinalTargetReviewResult, "approvedContactValues"> & { approvedRelatedValues?: string[]; cardSummary?: string | null }): { disposition: TargetResearchDisposition; nextAction: string } {
  if (review.approvedContactValues.length > 0 || (review.approvedRelatedValues?.length ?? 0) > 0) return { disposition: "contact_route_found", nextAction: "Keep approved routes and related findings on the target card; continue only if a stronger direct contact appears." };
  return { disposition: "needs_follow_up", nextAction: "Run another target-scoped OSINT pass. Prioritize identity/domain resolution, exact claim-page retrieval, and validation of review-only candidates before any contact promotion." };
}

export function buildFinalTargetReviewPrompt(input: FinalTargetReviewInput): string {
  return `You are the final publication reviewer for one OSINT target in Apex Atlas.\n\nTARGET: ${input.targetName}\nTYPE: ${input.targetType}\nREACHABILITY STATUS: ${input.reachabilityStatus ?? "unknown"}\n\nYou control what appears on the target's research card. Review ONLY this target. The JSON arrays below are the complete universe of claims from this run. Never invent emails, phones, URLs, addresses, roles, organizations, or other factual values. Only approve exact strings present in ELIGIBLE CANDIDATES or DURABLE EVIDENCE.\n\nUNTRUSTED EVIDENCE START\nELIGIBLE CANDIDATES:\n${JSON.stringify(input.candidates)}\n\nDURABLE EVIDENCE:\n${JSON.stringify(input.evidence)}\n\nPROPOSED CONTACTS:\n${JSON.stringify(input.proposedContacts)}\n\nPROPOSED ASSETS:\n${JSON.stringify(input.proposedAssets)}\nUNTRUSTED EVIDENCE END\n\nReturn ONLY JSON:\n{\n  "decision": "publish" | "review" | "reject",\n  "approvedContactValues": ["exact values from ELIGIBLE CANDIDATES"],\n  "approvedRelatedValues": ["exact values from CANDIDATES or supported DURABLE EVIDENCE"],\n  "relatedDescriptions": ["brief labels only; deterministic code will normalize these"],\n  "cardSummary": "optional rationale; deterministic code will not publish model-written factual prose",\n  "roleHeadline": "exact role value from the evidence, or null",\n  "approvedAssetIdentifiers": ["exact identifiers from PROPOSED ASSETS"],\n  "reasons": ["why you approved or held back"]\n}`;
}

function exactMatch(value: string, allowed: readonly string[]): boolean {
  const v = value.trim();
  return allowed.some((candidate) => candidate === v || candidate.trim().toLowerCase() === v.toLowerCase());
}

function collectEligibleContactValues(input: FinalTargetReviewInput): string[] {
  if (input.reachabilityStatus === "research_only") return [];
  const organizationTarget = ["Corporation", "Corp", "Trust"].includes(input.targetType);
  return input.candidates
    .filter((candidate) => candidate.state !== "rejected" && candidate.conflictCount === 0)
    .filter((candidate) => ["email", "phone", "social"].includes(candidate.vectorType))
    .filter((candidate) => !candidate.scopes?.length || (organizationTarget
      ? candidate.scopes.includes("organization") || candidate.scopes.includes("target_person")
      : candidate.scopes.includes("target_person") || candidate.scopes.includes("organization") || candidate.scopes.includes("person_candidate")))
    .map((candidate) => candidate.value);
}

function collectEligibleRelatedValues(input: FinalTargetReviewInput): string[] {
  const fromCandidates = input.candidates
    .filter((candidate) => candidate.state !== "rejected" && candidate.conflictCount === 0)
    .filter((candidate) => ["address", "domain", "name", "role", "organization", "email", "phone"].includes(candidate.vectorType))
    .map((candidate) => candidate.value);
  const fromEvidence = input.evidence
    .filter((evidence) => evidence.validationStatus === "supported")
    .map((evidence) => evidence.value);
  return Array.from(new Set([...fromCandidates, ...fromEvidence].filter(Boolean)));
}

function collectEligibleRoleValues(input: FinalTargetReviewInput): string[] {
  const roles = input.candidates
    .filter((candidate) => candidate.state !== "rejected" && candidate.conflictCount === 0 && String(candidate.vectorType) === "role")
    .map((candidate) => candidate.value);
  roles.push(...input.evidence.filter((evidence) => evidence.vectorType === "role" && evidence.validationStatus === "supported").map((evidence) => evidence.value));
  return [...new Set(roles.filter(Boolean))];
}

function relatedLabel(value: string, input: FinalTargetReviewInput): string {
  const candidate = input.candidates.find((item) => item.value === value || item.value.trim().toLowerCase() === value.trim().toLowerCase());
  if (candidate) return candidate.vectorType;
  const evidence = input.evidence.find((item) => item.value === value || item.value.trim().toLowerCase() === value.trim().toLowerCase());
  return evidence?.vectorType ?? "related finding";
}

function deterministicCardSummary(targetName: string, approvedContacts: readonly string[], approvedRelated: readonly string[]): string | null {
  if (approvedContacts.length === 0 && approvedRelated.length === 0) return null;
  const count = approvedContacts.length + approvedRelated.length;
  return `${targetName}: ${count} public finding${count === 1 ? "" : "s"} explicitly approved from source-backed evidence.`;
}

export function adjudicateFinalTargetReview(input: FinalTargetReviewInput, raw: unknown, reviewerSource: string): FinalTargetReviewResult {
  const payload = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const requestedDecision = payload.decision === "publish" || payload.decision === "reject" || payload.decision === "review" ? payload.decision : "review";
  const eligibleContacts = collectEligibleContactValues(input);
  const eligibleRelated = collectEligibleRelatedValues(input);
  const eligibleRoles = collectEligibleRoleValues(input);
  const approvedContactValues = Array.isArray(payload.approvedContactValues)
    ? payload.approvedContactValues.filter((value): value is string => typeof value === "string").filter((value, index, values) => values.indexOf(value) === index).filter((value) => exactMatch(value, eligibleContacts))
    : [];
  const approvedRelatedValues = Array.isArray(payload.approvedRelatedValues)
    ? payload.approvedRelatedValues.filter((value): value is string => typeof value === "string").filter((value, index, values) => values.indexOf(value) === index).filter((value) => exactMatch(value, eligibleRelated)).slice(0, 12)
    : [];
  const proposedAssetIdentifiers = input.proposedAssets.map((asset) => asset.identifier);
  const approvedAssetIdentifiers = Array.isArray(payload.approvedAssetIdentifiers)
    ? payload.approvedAssetIdentifiers.filter((value): value is string => typeof value === "string").filter((value, index, values) => values.indexOf(value) === index).filter((value) => exactMatch(value, proposedAssetIdentifiers))
    : [];
  const roleRaw = typeof payload.roleHeadline === "string" ? payload.roleHeadline.trim() : "";
  const roleHeadline = roleRaw && exactMatch(roleRaw, eligibleRoles) ? eligibleRoles.find((value) => value.toLowerCase() === roleRaw.toLowerCase()) ?? roleRaw : null;
  const relatedDescriptions = approvedRelatedValues.map((value) => relatedLabel(value, input)).slice(0, approvedRelatedValues.length);
  const reasons = Array.isArray(payload.reasons) ? payload.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 12) : [];
  const hasCardMaterial = approvedContactValues.length > 0 || approvedRelatedValues.length > 0 || approvedAssetIdentifiers.length > 0;
  const decision: FinalReviewDecision = requestedDecision === "reject" && !hasCardMaterial ? "reject" : hasCardMaterial && requestedDecision === "publish" ? "publish" : "review";
  return {
    decision,
    approvedContactValues,
    approvedAssetIdentifiers,
    cardSummary: deterministicCardSummary(input.targetName, approvedContactValues, approvedRelatedValues),
    roleHeadline,
    approvedRelatedValues,
    relatedDescriptions,
    reasons: reasons.length > 0 ? reasons : hasCardMaterial ? ["Published from exact values explicitly selected by the reviewer."] : ["No values were explicitly selected for publication. Run another target-scoped OSINT review."],
    reviewerSource,
  };
}
