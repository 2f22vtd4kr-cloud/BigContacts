import { canonicalizeUrl } from "./evidence-ledger";

export type CandidateScope =
  | "organization"
  | "target_person"
  | "person_candidate"
  | "unknown";

export type CandidateState =
  | "discovered"
  | "source_linked"
  | "attribution_review"
  | "independently_corroborated"
  | "verified_direct_route"
  | "rejected";

export type CandidateVector = "email" | "phone" | "social" | "domain" | "website" | "address";

export interface ContactCandidateEvidence {
  vectorType: CandidateVector;
  value: string;
  source: string;
  sourceUrl?: string | null;
  confidence?: number;
  details?: Record<string, unknown>;
}

export interface ReconciledCandidate {
  key: string;
  vectorType: CandidateVector;
  value: string;
  providers: string[];
  sourceDomains: string[];
  sourceUrls: string[];
  scopes: CandidateScope[];
  personNames: string[];
  state: CandidateState;
  conflictCount: number;
}

export interface CandidateFunnel {
  totalCandidates: number;
  discovered: number;
  sourceLinked: number;
  attributionReview: number;
  independentlyCorroborated: number;
  verifiedDirectRoute: number;
  organizationOnly: number;
  conflicted: number;
  independentSourceDomains: number;
  candidates: ReconciledCandidate[];
}

export function candidateKey(vectorType: CandidateVector, value: string): string {
  const trimmed = value.trim().toLowerCase();
  const normalized = vectorType === "phone"
    ? trimmed.replace(/\D/g, "")
    : vectorType === "social" || vectorType === "domain" || vectorType === "website"
      ? trimmed.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "")
      : trimmed;
  return `${vectorType}|${normalized}`;
}

function normalizedValue(vectorType: CandidateVector, value: string): string {
  const key = candidateKey(vectorType, value);
  return key.slice(vectorType.length + 1);
}

function sourceUrlsFor(item: ContactCandidateEvidence): string[] {
  const urls = [
    item.sourceUrl,
    ...(Array.isArray(item.details?.sourceUrls)
      ? item.details.sourceUrls.filter((url): url is string => typeof url === "string")
      : []),
  ];
  return [...new Set(urls.map((url) => canonicalizeUrl(url)).filter((url): url is string => Boolean(url)))];
}

function scopeFor(item: ContactCandidateEvidence): CandidateScope {
  const scope = item.details?.scope;
  if (scope === "organization" || scope === "target_person" || scope === "person_candidate") return scope;
  return "unknown";
}

/**
 * Reconciles provider/parser output without treating provider agreement as proof.
 * A provider label is useful for audit, but independent canonical publisher domains
 * are the corroboration unit. Organization-only evidence can never become a
 * target-person route.
 */
export function reconcileContactCandidates(
  evidence: readonly ContactCandidateEvidence[],
): CandidateFunnel {
  const groups = new Map<string, ReconciledCandidate>();
  for (const item of evidence) {
    if (!item.value?.trim()) continue;
    const normalized = normalizedValue(item.vectorType, item.value);
    if (!normalized) continue;
    const key = `${item.vectorType}|${normalized}`;
    const urls = sourceUrlsFor(item);
    const domains = urls
      .map((url) => {
        try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
      })
      .filter((domain): domain is string => Boolean(domain));
    const scope = scopeFor(item);
    const personName = typeof item.details?.personName === "string"
      ? item.details.personName.trim()
      : "";
    const current = groups.get(key) ?? {
      key,
      vectorType: item.vectorType,
      value: item.value.trim(),
      providers: [],
      sourceDomains: [],
      sourceUrls: [],
      scopes: [],
      personNames: [],
      state: "discovered",
      conflictCount: 0,
    };
    if (!current.providers.includes(item.source)) current.providers.push(item.source);
    for (const url of urls) if (!current.sourceUrls.includes(url)) current.sourceUrls.push(url);
    for (const domain of domains) if (!current.sourceDomains.includes(domain)) current.sourceDomains.push(domain);
    if (!current.scopes.includes(scope)) current.scopes.push(scope);
    if (personName && !current.personNames.includes(personName)) current.personNames.push(personName);
    groups.set(key, current);
  }

  const candidates = [...groups.values()].map((candidate) => {
    const isDirectVector = candidate.vectorType === "email" || candidate.vectorType === "phone";
    const hasTargetAttribution = candidate.scopes.includes("target_person");
    const hasPersonAttribution = hasTargetAttribution || candidate.scopes.includes("person_candidate");
    const organizationOnly = candidate.scopes.length > 0
      && candidate.scopes.every((scope) => scope === "organization");
    const state: CandidateState =
      organizationOnly ? (candidate.sourceDomains.length ? "source_linked" : "discovered")
      : hasTargetAttribution && isDirectVector && candidate.sourceDomains.length >= 2
        ? "verified_direct_route"
        : candidate.sourceDomains.length >= 2
          ? "independently_corroborated"
        : hasPersonAttribution
          ? "attribution_review"
          : candidate.sourceDomains.length
            ? "source_linked"
            : "discovered";
    return { ...candidate, state, conflictCount: 0 };
  });

  const byVector = new Map<CandidateVector, ReconciledCandidate[]>();
  for (const candidate of candidates) {
    const list = byVector.get(candidate.vectorType) ?? [];
    list.push(candidate);
    byVector.set(candidate.vectorType, list);
  }
  // Different values for the same vector in one run are a conflict. Keep every
  // value visible; do not pick a winner merely because one provider repeated it.
  for (const list of byVector.values()) {
    if (list.length < 2) continue;
    for (const candidate of list) candidate.conflictCount = list.length - 1;
  }

  const count = (state: CandidateState) => candidates.filter((candidate) => candidate.state === state).length;
  return {
    totalCandidates: candidates.length,
    discovered: count("discovered"),
    sourceLinked: count("source_linked"),
    attributionReview: count("attribution_review"),
    independentlyCorroborated: count("independently_corroborated"),
    verifiedDirectRoute: count("verified_direct_route"),
    organizationOnly: candidates.filter((candidate) =>
      candidate.scopes.length > 0 && candidate.scopes.every((scope) => scope === "organization"),
    ).length,
    conflicted: candidates.filter((candidate) => candidate.conflictCount > 0).length,
    independentSourceDomains: new Set(candidates.flatMap((candidate) => candidate.sourceDomains)).size,
    candidates,
  };
}