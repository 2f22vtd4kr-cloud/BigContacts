/**
 * contact-attribution.ts
 *
 * Semantic contact attribution is owned by the Investigator model.
 * This module exposes the model's assessment and keeps only structural
 * verification dimensions. It does not rank publishers or apply a numeric
 * attribution threshold.
 */
export type ContactAttributionKind =
  | "person_specific" | "direct_personal" | "professional_person_specific"
  | "department" | "shared_inbox" | "assistant_intermediary"
  | "generic_contact_form" | "organization" | "unknown";

function isPersonSpecificAttribution(value: ContactAttributionKind): boolean {
  return ["person_specific", "direct_personal", "professional_person_specific"].includes(value);
}

function isOrganizationAttribution(value: ContactAttributionKind): boolean {
  return ["department", "shared_inbox", "assistant_intermediary", "generic_contact_form", "organization"].includes(value);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface AttributionDimensions {
  sourceEvidence: number;
  corroboration: number;
  validation: number;
  directness: number;
  domainFit: number;
}

export interface AttributionResult {
  attributed: boolean;
  /** Model-provided confidence only. Null means no semantic assessment was supplied. */
  score: number | null;
  dimensions: AttributionDimensions;
  explanation: string;
}

export function scoreAttribution(params: {
  email: string | null;
  phone: string | null;
  sources: string[];
  entityType: string;
  resolvedDomain: string | null;
  isValidEmail: boolean;
  isValidPhone: boolean;
  exactClaimObserved?: boolean;
  targetPersonEvidence?: boolean;
  contactAttribution?: ContactAttributionKind;
  exactQuotePersonValueBound?: boolean;
  modelConfidence?: number | null;
}): AttributionResult {
  const {
    email,
    phone,
    sources,
    resolvedDomain,
    isValidEmail,
    isValidPhone,
    exactClaimObserved = false,
    targetPersonEvidence = false,
    contactAttribution = "unknown",
    exactQuotePersonValueBound = false,
    modelConfidence = null,
  } = params;

  const modelBackedPersonRoute = exactClaimObserved
    && targetPersonEvidence
    && isPersonSpecificAttribution(contactAttribution)
    && exactQuotePersonValueBound;
  const modelBackedOrganizationRoute = exactClaimObserved && isOrganizationAttribution(contactAttribution);

  const families = new Set(sources.map((source) => source.split(/[-_\\s]/)[0]?.toLowerCase() ?? source.toLowerCase()));
  const validation = (email && isValidEmail) || (phone && isValidPhone) ? 1 : 0;
  const directness = modelBackedPersonRoute ? 1 : modelBackedOrganizationRoute ? 0 : 0;
  let domainFit = 0;
  if (email && isValidEmail && resolvedDomain) {
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
    if (emailDomain === resolvedDomain.toLowerCase()) domainFit = 1;
    else if (emailDomain.endsWith("." + resolvedDomain.toLowerCase()) || resolvedDomain.toLowerCase().endsWith("." + emailDomain)) domainFit = 0.85;
    else domainFit = 0.18;
  }

  const dimensions: AttributionDimensions = {
    sourceEvidence: sources.length > 0 ? 1 : 0,
    corroboration: Math.min(families.size / 3, 1),
    validation,
    directness,
    domainFit,
  };
  const score = typeof modelConfidence === "number" && Number.isFinite(modelConfidence) ? clamp(modelConfidence) : null;
  const attributed = modelBackedPersonRoute && Boolean((email && isValidEmail) || (phone && isValidPhone));

  const parts: string[] = [];
  if (sources.length) parts.push("fetched-source provenance supplied");
  if (families.size >= 2) parts.push(families.size + " source families observed");
  if (modelBackedPersonRoute) parts.push("model-attributed person-specific route with exact source claim");
  if (modelBackedOrganizationRoute) parts.push("model-attributed organization or intermediary route");
  if (domainFit >= 0.8 && resolvedDomain) parts.push("email domain matches resolved employer domain");
  if (score === null) parts.push("model confidence not supplied; numeric score unassessed");
  if (!exactClaimObserved) parts.push("exact fetched claim not verified");
  if (!targetPersonEvidence) parts.push("target-person evidence not established");

  return {
    attributed,
    score,
    dimensions,
    explanation: parts.length ? parts.join("; ") : "insufficient evidence for attribution",
  };
}

/** True only when a model assessment and exact fetched-source identity/value binding agree. */
export function anyAttributed(
  candidates: Array<{
    email: string | null;
    phone: string | null;
    sources: string[];
    entityType: string;
    resolvedDomain: string | null;
    isValidEmail: boolean;
    isValidPhone: boolean;
    exactClaimObserved?: boolean;
    targetPersonEvidence?: boolean;
    contactAttribution?: ContactAttributionKind;
    exactQuotePersonValueBound?: boolean;
    modelConfidence?: number | null;
  }>,
): boolean {
  return candidates.some((candidate) => scoreAttribution(candidate).attributed);
}
