/**
 * contact-attribution.ts — J6 Multi-Dimensional Contact Attribution Scoring
 *
 * Evaluates a contact candidate on five independent dimensions and returns
 * an attribution score (0–1) alongside the per-dimension breakdown.
 *
 * The numeric score is advisory context only. A person route is attributed only when
 * the model explicitly classifies it as person-specific and exact fetched evidence binds identity and value.
 *
 * Dimensions:
 *   1. sourceAuthority   — how reliable is the most authoritative source?
 *   2. corroboration     — how many independent source families agree?
 *   3. validation        — is the contact syntactically valid?
 *   4. directness        — model-interpreted person route vs. organization/intermediary route?
 *   5. domainFit         — does the email domain match the resolved employer?
 *
 * Proximity evidence (shared club, event, asset, geography) may influence
 * research prioritisation but must NOT raise any attribution dimension.
 */

// ── Attribution threshold ──────────────────────────────────────────────────────

const ATTRIBUTION_THRESHOLD = 0.52;

// ── Source authority table ────────────────────────────────────────────────────

const SOURCE_AUTHORITY_MAP: Record<string, number> = {
  Wikidata:              0.92,
  EDGAR:                 0.90,
  CompaniesHouse:        0.90,
  BRREG:                 0.88,
  ProPublica:            0.87,
  GLEIF:                 0.85,
  ORCID:                 0.83,
  GitHub:                0.80,
  ContactPage:           0.79,
  "Website-Scrape":      0.72,
  "website-scrape":      0.72,
  GraphNeighbour:        0.65,
  Wikipedia:             0.60,
  Wayback:               0.58,
  DDG:                   0.52,
  "phase-j-in-house":    0.45,
};

// Contact semantics are model-authored. Local-part spelling (for example,
// "info@" or "support@") is not sufficient to classify a mailbox as shared.
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttributionDimensions {
  sourceAuthority: number;   // 0-1
  corroboration:   number;   // 0-1
  validation:      number;   // 0-1
  directness:      number;   // 0-1
  domainFit:       number;   // 0-1
}

export interface AttributionResult {
  attributed:  boolean;
  score:       number;                // geometric mean of all dimensions, 0-1
  dimensions:  AttributionDimensions;
  explanation: string;
  /** Which threshold was used (informational) */
  threshold:   number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authorityOf(source: string): number {
  for (const [key, score] of Object.entries(SOURCE_AUTHORITY_MAP)) {
    if (source.startsWith(key)) return score;
  }
  return 0.38;
}

function geometricMean(values: number[]): number {
  if (!values.length) return 0;
  const product = values.reduce((acc, v) => acc * Math.max(v, 0.01), 1);
  return Math.pow(product, 1 / values.length);
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function scoreAttribution(params: {
  email:           string | null;
  phone:           string | null;
  sources:         string[];
  entityType:      string;
  resolvedDomain:  string | null;
  isValidEmail:    boolean;
  isValidPhone:    boolean;
  exactClaimObserved?: boolean;
  targetPersonEvidence?: boolean;
  contactAttribution?: ContactAttributionKind;
  exactQuotePersonValueBound?: boolean;
}): AttributionResult {
  const {
    email, phone, sources, entityType, resolvedDomain, isValidEmail, isValidPhone,
    exactClaimObserved = false,
    targetPersonEvidence = false,
    contactAttribution = "unknown",
    exactQuotePersonValueBound = false,
  } = params;

  // 1. Source authority — best single source
  const authority = sources.length ? Math.max(...sources.map(authorityOf)) : 0.28;

  // 2. Corroboration — independent source families (split on first separator)
  const families = new Set(
    sources.map(s => s.split(/[-_\s]/)[0]?.toLowerCase() ?? s.toLowerCase()),
  );
  // 1 family = 0.33, 2 families = 0.67, 3+ = 1.0
  const corroboration = Math.min(families.size / 3, 1.0);

  // 3. Validation — structural email/phone validity only
  let validation = 0;
  // A generic-looking local part is a weak prior, not an attribution verdict.
  // When the model has explicitly attributed the route to this person and the
  // exact claim is present in the fetched source, preserve that interpretation.
  // The caller still has to enforce fetched-source provenance and quote integrity.
  const modelBackedPersonRoute = exactClaimObserved
    && targetPersonEvidence
    && isPersonSpecificAttribution(contactAttribution)
    && exactQuotePersonValueBound;
  const modelBackedOrganizationRoute = exactClaimObserved && isOrganizationAttribution(contactAttribution);
  if (email && isValidEmail) {
    validation = modelBackedPersonRoute ? 1.0 : modelBackedOrganizationRoute ? 0.72 : 0.90;
  } else if (phone && isValidPhone) {
    validation = modelBackedPersonRoute ? 1.0 : modelBackedOrganizationRoute ? 0.55 : 0.72;
  }

  // Directness is an Investigator interpretation, not a mailbox-spelling heuristic.
  const directness = modelBackedPersonRoute ? 1.0
    : modelBackedOrganizationRoute ? 0.28
    : (email || phone) ? 0.55 : 0.08;

  // 5. Domain fit — does email domain match resolved employer domain?
  let domainFit = 0.48;  // neutral when no domain context
  if (email && isValidEmail && resolvedDomain) {
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
    if (emailDomain === resolvedDomain) {
      domainFit = 1.0;  // exact match
    } else if (
      emailDomain.endsWith(`.${resolvedDomain}`) ||
      resolvedDomain.endsWith(`.${emailDomain}`)
    ) {
      domainFit = 0.85;  // subdomain / parent-domain match
    } else {
      domainFit = 0.18;  // mismatch is a meaningful red flag
    }
  } else if (phone && isValidPhone && resolvedDomain) {
    domainFit = 0.52;  // phones are domain-agnostic but domain knowledge helps
  } else if (email && isValidEmail) {
    domainFit = 0.44;  // no domain context — slightly below neutral
  }

  const dimensions: AttributionDimensions = {
    sourceAuthority: authority,
    corroboration,
    validation,
    directness,
    domainFit,
  };

  const score = geometricMean(Object.values(dimensions));
  // Semantic attribution is model-owned. The numeric score remains advisory
  // quality context; it cannot veto a person-specific route when the model's
  // exact quotation binds this person and value to the fetched source.
  // The code gate is limited to valid syntax, exact fetched claim provenance,
  // person evidence and the model's explicit person-specific classification.
  const attributed =
    modelBackedPersonRoute &&
    (isValidEmail || isValidPhone) &&
    exactClaimObserved &&
    targetPersonEvidence;

  // Build human-readable explanation
  const parts: string[] = [];
  if (authority >= 0.85) parts.push("high-authority source");
  if (families.size >= 2) parts.push(`${families.size} independent source families`);
  if (modelBackedPersonRoute) parts.push("model-attributed person-specific route with exact source claim");
  if (modelBackedOrganizationRoute) parts.push(`model-attributed ${contactAttribution} route`);
  if (domainFit >= 0.80 && resolvedDomain) parts.push(`domain match: ${resolvedDomain}`);
  if (score < ATTRIBUTION_THRESHOLD) parts.push("below attribution threshold");
  if (!exactClaimObserved) parts.push("no exact claim URL");
  if (!targetPersonEvidence) parts.push("target-person attribution not established");

  return {
    attributed,
    score,
    dimensions,
    explanation: parts.length ? parts.join("; ") : "insufficient evidence for attribution",
    threshold: ATTRIBUTION_THRESHOLD,
  };
}

/**
 * Combine attribution results across multiple contact candidates and return
 * whether any one of them clears the threshold.
 */
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
  }>,
): boolean {
  return candidates.some(c => scoreAttribution(c).attributed);
}
