import { normalizeCandidateIdentityName } from "./identity-text-match";

export type CandidateSourceFinding = {
  personName: string | null;
  promotionDecision?: "promote" | "reject";
  scope: "organization" | "candidate" | "unknown";
  sourceUrls?: readonly string[] | null;
};

/**
 * A candidate can be emitted more than once as its trajectory evolves. Keep
 * source claims from every equivalent promoted candidate finding; selecting
 * only the first finding can discard the one URL later observed in the run.
 */
export function candidateSourceUrlsForIdentity(input: {
  findings: readonly CandidateSourceFinding[];
  personName: string;
  isClaimGradeSourceUrl: (value: unknown) => value is string;
  normalizeSourceUrl: (raw: string) => string | null;
}): string[] {
  const identity = normalizeCandidateIdentityName(input.personName);
  const candidates = input.findings.filter((finding) =>
    normalizeCandidateIdentityName(finding.personName ?? "") === identity &&
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
 * Search-result endpoints are useful leads but are not candidate identity evidence.
 * This is intentionally a small endpoint policy, not a research sequence.
 */
export function isClaimGradeDiscoverySourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https?:\/\/\S+$/i.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (/(^|\.)google\.[a-z.]+$/.test(host) && /^\/search$/i.test(path)) return false;
    if ((host === "bing.com" || host.endsWith(".bing.com")) && /^\/search$/i.test(path)) return false;
    if (host === "search.yahoo.com" && /^\/search$/i.test(path)) return false;
    if ((host === "duckduckgo.com" || host === "html.duckduckgo.com") && (path === "/" || /^\/html$/i.test(path)) && url.searchParams.has("q")) return false;
    if (host === "efts.sec.gov" && /^\/LATEST\/search-index(?:\/|$)/i.test(url.pathname)) return false;
    if (/\/(?:search|search-index|search-results|results)$/i.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

export type AdmittedCandidateSourceSet = { name: string; sourceUrls: readonly string[] };

function normalizeAdmittedSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
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
      if (name.length < 3 || identity.length < 3) continue;
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
