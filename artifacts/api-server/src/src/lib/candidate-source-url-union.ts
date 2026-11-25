import { normalizeCandidateIdentityName } from "./identity-text-match";
import { publisherDomain } from "./source-corroboration";

export type CandidateSourceFinding = {
  personName: string | null;
  role?: string | null;
  promotionDecision?: "promote" | "reject";
  scope: "organization" | "candidate" | "unknown";
  sourceUrls?: readonly string[] | null;
  exactQuote?: string | null;
};

/**
 * A candidate can be emitted more than once as its trajectory evolves. Keep
 * source claims from every equivalent promoted candidate finding; selecting
 * only the first finding can discard the one URL later observed in the run.
 */
export function candidateSourceUrlsForIdentity(input: {
  findings: readonly CandidateSourceFinding[];
  personName: string;
  role?: string | null;
  isClaimGradeSourceUrl: (value: unknown) => value is string;
  normalizeSourceUrl: (raw: string) => string | null;
}): string[] {
  const identity = normalizeCandidateIdentityName(input.personName);
  const roleIdentity = input.role ? normalizeCandidateIdentityName(input.role) : null;
  const candidates = input.findings.filter((finding) =>
    normalizeCandidateIdentityName(finding.personName ?? "") === identity &&
    (!roleIdentity || normalizeCandidateIdentityName(finding.role ?? "") === roleIdentity) &&
    finding.promotionDecision === "promote" &&
    finding.scope === "candidate" &&
    Array.isArray(finding.sourceUrls)
  );
  return [...new Set(candidates.flatMap((finding) =>
    (finding.sourceUrls ?? [])
      .map((raw) => input.isClaimGradeSourceUrl(raw) ? input.normalizeSourceUrl(raw) : null)
      .filter((url): url is string => Boolean(url))
  ))];
}

/**
 * Verify only that a cited source is a well-formed public HTTPS URL.
 * Source meaning, publisher quality, identity and targetability are model
 * judgments; successful fetch and exact-quote checks establish observation reality.
 */
export function isClaimGradeDiscoverySourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\/\S+$/i.test(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}


/**
 * A press story can corroborate a person or ownership claim, but it is not by
 * itself a practical public/professional route to that person. The route gate
 * is applied only after exact person+role evidence has been observed on the
 * cited page; it does not choose a candidate or a research itinerary.
 */
export function isRealisticPersonRouteSourceUrl(value: unknown): value is string {
  // Whether a page is a useful person-specific route is a contextual model
  // judgement, not a publisher/path allowlist. Keep only technical source
  // eligibility here: a valid claim-grade HTTPS source, excluding search
  // result endpoints via isClaimGradeDiscoverySourceUrl.
  return isClaimGradeDiscoverySourceUrl(value);
}

export function hasRealisticPersonRouteSource(sourceUrls: readonly unknown[]): boolean {
  return sourceUrls.some(isRealisticPersonRouteSourceUrl);
}

export type AdmittedCandidateSourceSet = { name: string; sourceUrls: readonly string[] };

export type CandidateRoleObservation = {
  action: string; execution: string; sourceUrl: string; observation: string; eventId: number;
};

/** Only Investigator-promoted, exact-quote-backed observations from successful page fetches count; search/registry result rows remain leads until fetched. */
export function candidateRoleCorroborationSources(input: {
  personName: string;
  role: string | null | undefined;
  findings: readonly CandidateSourceFinding[];
  observations: readonly CandidateRoleObservation[];
  isClaimGradeSourceUrl: (value: unknown) => value is string;
  normalizeSourceUrl: (raw: string) => string | null;
}): Array<{ sourceUrl: string; publisher: string; eventId: number }> {
  const role = input.role?.trim().replace(/\s+/g, " ") ?? "";
  const claimedUrls = new Set(candidateSourceUrlsForIdentity({
    findings: input.findings, personName: input.personName, role: role || null,
    isClaimGradeSourceUrl: input.isClaimGradeSourceUrl, normalizeSourceUrl: input.normalizeSourceUrl,
  }));
  if (!claimedUrls.size) return [];
  const supporting = new Map<string, { sourceUrl: string; publisher: string; eventId: number }>();
  const observedPassageFingerprints = new Set<string>();
  for (const observation of input.observations) {
    if ((observation.action !== "visit" && observation.action !== "browser_fetch") || observation.execution !== "success") continue;
    const sourceUrl = input.normalizeSourceUrl(observation.sourceUrl);
    if (!sourceUrl || !claimedUrls.has(sourceUrl) || !input.isClaimGradeSourceUrl(sourceUrl)) continue;
    // The Investigator selects the contextual passage; code verifies only
    // that the exact quotation is present in this successfully fetched source
    // and that the model-selected quotation exists verbatim. Do not impose a fixed character
    // window or require the model's semantic role interpretation to match a
    // hard-coded English/Latin role string.
    const modelQuotes = input.findings
      .filter((finding) => normalizeCandidateIdentityName(finding.personName ?? "") === normalizeCandidateIdentityName(input.personName)
        && normalizeCandidateIdentityName(finding.role ?? "") === normalizeCandidateIdentityName(role)
        && finding.promotionDecision === "promote" && finding.scope === "candidate"
        && (finding.sourceUrls ?? []).some((url) => input.normalizeSourceUrl(url) === sourceUrl))
      .map((finding) => typeof finding.exactQuote === "string" ? finding.exactQuote.trim() : "")
      .filter(Boolean);
    const exactQuote = modelQuotes.find((quote) => observation.observation.includes(quote));
    if (!exactQuote) continue;
    // The same exact quoted passage copied to a second domain is not independent
    // corroboration; use the model-selected, source-verified quotation as lineage.
    const passageFingerprint = exactQuote.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    if (observedPassageFingerprints.has(passageFingerprint)) continue;
    let host = "";
    try { host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); } catch { continue; }
    const publisher = publisherDomain(host);
    if (!publisher) continue;
    observedPassageFingerprints.add(passageFingerprint);
    if (supporting.has(publisher)) continue;
    supporting.set(publisher, { sourceUrl, publisher, eventId: observation.eventId });
  }
  return [...supporting.values()];
}


function normalizeAdmittedSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
  } catch {
    return null;
  }
}

/** Merge only page URLs that already passed the durable-observation boundary. */
export function mergeDurablyAdmittedCandidateSources(
  groups: readonly (readonly AdmittedCandidateSourceSet[])[],
): Array<{ name: string; sourceUrls: string[] }> {
  const merged = new Map<string, { name: string; sourceUrls: Set<string> }>();
  for (const group of groups) {
    for (const candidate of group) {
      const name = candidate.name.trim().replace(/\s+/g, " ");
      const identity = normalizeCandidateIdentityName(name);
      if (!name || !identity) continue;
      let entry = merged.get(identity);
      if (!entry) {
        entry = { name, sourceUrls: new Set<string>() };
        merged.set(identity, entry);
      }
      for (const rawUrl of candidate.sourceUrls) {
        const url = normalizeAdmittedSourceUrl(rawUrl);
        if (url && isClaimGradeDiscoverySourceUrl(url)) entry.sourceUrls.add(url);
      }
    }
  }
  return [...merged.values()].map(({ name, sourceUrls }) => ({ name, sourceUrls: [...sourceUrls] }));
}
