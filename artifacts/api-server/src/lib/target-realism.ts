/**
 * Target realism policy.
 *
 * Public prominence, wealth, assets, and social visibility are useful research
 * evidence, but none of them are access. This module is intentionally
 * deterministic so research scope cannot drift with model wording.
 */

export type ReachabilityClass = "direct" | "intermediary" | "bounded" | "research_only";

export interface RealismTarget {
  name: string;
  type: string;
  estimatedNetWorth?: number | null;
  email?: string | null;
  phone?: string | null;
  contactConfidence?: number | null;
  contactOutcome?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  telegramHandle?: string | null;
  notes?: string | null;
  metadata?: string | null;
  networkDegree?: number;
  hasCorroboratedIntermediary?: boolean;
}

export interface TargetRealismAssessment {
  classification: ReachabilityClass;
  reason: string;
  hasDirectVector: boolean;
  hasIntermediaryRoute: boolean;
  isProminentOrProtected: boolean;
  isSocialOnly: boolean;
  researchBudget: "full" | "bounded" | "review_only";
}

const DIRECT_OUTCOMES = new Set(["direct_contact_candidate", "direct_contact_verified"]);
const GENERIC_EMAIL_PREFIXES = new Set([
  "info", "contact", "hello", "office", "press", "media", "investor",
  "investors", "reception", "enquiries", "enquiry", "admin", "support",
]);
const PROMINENCE_TERMS = [
  "billionaire", "celebrity", "world-famous", "world famous", "public figure",
  "head of state", "royalty", "royal family", "president", "prime minister",
  "household name", "global icon", "known worldwide",
];

function present(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function metadataHasProminence(metadata: string | null | undefined): boolean {
  if (!present(metadata)) return false;
  let text = metadata!;
  try {
    const parsed = JSON.parse(metadata!);
    text = JSON.stringify(parsed);
  } catch {
    // Metadata is allowed to be plain text.
  }
  const lower = text.toLowerCase();
  return PROMINENCE_TERMS.some((term) => lower.includes(term));
}

export function hasValidatedDirectVector(target: RealismTarget): boolean {
  const emailPrefix = target.email?.trim().split("@", 1)[0]?.toLowerCase();
  const hasNamedEmail = present(target.email) &&
    !GENERIC_EMAIL_PREFIXES.has(emailPrefix ?? "");
  const vector = hasNamedEmail || present(target.phone);
  if (!vector) return false;
  return DIRECT_OUTCOMES.has(target.contactOutcome ?? "") || (target.contactConfidence ?? 0) >= 50;
}

export function assessTargetRealism(target: RealismTarget): TargetRealismAssessment {
  const hasDirectVector = hasValidatedDirectVector(target);
  const hasIntermediaryRoute = target.hasCorroboratedIntermediary === true;
  const hasSocial = [
    target.linkedinUrl,
    target.twitterHandle,
    target.instagramHandle,
    target.telegramHandle,
  ].some(present);
  const isSocialOnly = hasSocial && !hasDirectVector;
  const isProminentOrProtected =
    (target.estimatedNetWorth ?? 0) >= 500_000_000 ||
    metadataHasProminence(target.metadata) ||
    (target.type === "HNWI" && (target.networkDegree ?? 0) === 0 && isSocialOnly);

  if (hasDirectVector) {
    return {
      classification: "direct",
      reason: "Validated direct public contact evidence is present.",
      hasDirectVector,
      hasIntermediaryRoute,
      isProminentOrProtected,
      isSocialOnly,
      researchBudget: "full",
    };
  }
  if (hasIntermediaryRoute) {
    return {
      classification: "intermediary",
      reason: "A corroborated intermediary with an attributable public contact vector is present.",
      hasDirectVector,
      hasIntermediaryRoute,
      isProminentOrProtected,
      isSocialOnly,
      researchBudget: "full",
    };
  }
  if (isProminentOrProtected) {
    return {
      classification: "research_only",
      reason: "High prominence or protection signals exist without a validated direct or intermediary route; public profiles, wealth, assets, and switchboards do not create access.",
      hasDirectVector,
      hasIntermediaryRoute,
      isProminentOrProtected,
      isSocialOnly,
      researchBudget: "review_only",
    };
  }
  return {
    classification: "bounded",
    reason: "No validated route is currently corroborated; research is limited to evidence discovery and must not generate speculative outreach.",
    hasDirectVector,
    hasIntermediaryRoute,
    isProminentOrProtected,
    isSocialOnly,
    researchBudget: "bounded",
  };
}

export function buildRealismDirective(assessment: TargetRealismAssessment): string {
  if (assessment.classification === "direct") {
    return "REALISM POLICY: A validated direct public contact vector exists. Verify attribution and source quality; do not upgrade unrelated organizational or social evidence into a personal contact.";
  }
  if (assessment.classification === "intermediary") {
    return "REALISM POLICY: A corroborated intermediary route exists. Verify the intermediary's attributable public contact vector and relationship evidence; do not infer access from assets, fame, social visibility, switchboards, or hypothetical staff.";
  }
  if (assessment.classification === "research_only") {
    return "REALISM POLICY: RESEARCH-ONLY target. Seek identity, ownership, registry, and evidence-quality findings, but explicitly return no viable public access route unless direct or corroborated intermediary evidence is found. Fame, wealth, press visibility, social handles, assets, FBOs, marinas, clubs, property managers, switchboards, and hypothetical staff are not contact vectors. Do not construct or recommend outreach.";
  }
  return "REALISM POLICY: BOUNDED research. Prioritize evidence quality and realistic access routes. Social visibility, assets, switchboards, inferred staff, and public prominence are not contact evidence. Return an explicit no-viable-route finding rather than padding the result.";
}

export function assessmentFromResearchInput(target: {
  name: string;
  type: string;
  estimatedNetWorth?: number | null;
  email?: string | null;
  phone?: string | null;
  contactConfidence?: number | null;
  contactOutcome?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  telegramHandle?: string | null;
  notes?: string | null;
  metadata?: string | null;
  networkDegree?: number;
  hasCorroboratedIntermediary?: boolean;
}): TargetRealismAssessment {
  return assessTargetRealism(target);
}
