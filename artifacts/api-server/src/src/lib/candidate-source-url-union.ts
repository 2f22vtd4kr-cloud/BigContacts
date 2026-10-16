import { normalizeCandidateIdentityName } from "./identity-text-match";
import { bindExactSourceSpan, sourceLineageId } from "./research-epistemic-vnext";
import { isAggregatorHost, publisherDomain } from "./source-corroboration";

export type CandidateSourceFinding = {
  personName: string | null;
  role?: string | null;
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
 * Search-result endpoints are useful leads but are not candidate identity evidence.
 * This is intentionally a small endpoint policy, not a research sequence.
 */
export function isClaimGradeDiscoverySourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\/\S+$/i.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.+$/, "");
    // Aggregator/profile directories can inform the Investigator, but are not
    // claim-grade identity evidence for durable candidate admission.
    if (isAggregatorHost(host)) return false;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (/(^|\.)google\.[a-z.]+$/.test(host) && /^\/search$/i.test(path)) return false;
    if ((host === "bing.com" || host.endsWith(".bing.com")) && /^\/search$/i.test(path)) return false;
    if (host === "search.yahoo.com" && /^\/search$/i.test(path)) return false;
    // The Instant Answer API aggregates information from external sources; findings should cite those source pages.
    if (host === "api.duckduckgo.com") return false;
    if ((host === "duckduckgo.com" || host === "html.duckduckgo.com") && (path === "/" || /^\/html$/i.test(path)) && url.searchParams.has("q")) return false;
    if (host === "efts.sec.gov" && /^\/LATEST\/search-index(?:\/|$)/i.test(url.pathname)) return false;
    if (/\/(?:search|search-index|search-results|results)$/i.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}


const DISCOVERY_PRESS_PUBLISHER_DOMAINS = [
  "cnbc.com", "reuters.com", "bloomberg.com", "forbes.com", "ft.com",
  "wsj.com", "nytimes.com", "theguardian.com", "bbc.com", "bbc.co.uk",
  "apnews.com", "fortune.com", "businessinsider.com", "marketwatch.com",
  "axios.com", "techcrunch.com", "sifted.eu", "theinformation.com",
] as const;

/**
 * A press story can corroborate a person or ownership claim, but it is not by
 * itself a practical public/professional route to that person. The route gate
 * is applied only after exact person+role evidence has been observed on the
 * cited page; it does not choose a candidate or a research itinerary.
 */
export function isRealisticPersonRouteSourceUrl(value: unknown): value is string {
  if (!isClaimGradeDiscoverySourceUrl(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.+$/, "");
    if (DISCOVERY_PRESS_PUBLISHER_DOMAINS.some((domain) => host === domain || host.endsWith("." + domain))) return false;

    let path: string;
    try {
      // Decode once before interpreting path semantics so percent-encoded
      // editorial segments cannot masquerade as an ordinary team/profile route.
      path = decodeURIComponent(url.pathname).toLowerCase().replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
    } catch {
      // Malformed percent-encoding is not a trustworthy access route.
      return false;
    }
    // A government filing can prove ownership but is not, alone, a contact route.
    if (/(?:^|\.)(?:gov|gov\.[a-z]{2})$/i.test(host) && /\/(?:archives\/edgar|company\/|companies\/|registry|registr)/i.test(path)) return false;

    // News/blog/article pages are evidence leads, not an access route, even when
    // a small publisher is not on the explicit press-domain list above.
    if (/(?:^|\/)(?:blog|news|press|story|stories|article|articles|insights|research|reports|report|opinion|analysis|markets|investing)(?:\/|$)/i.test(path)
      || /\/(?:19|20)\d{2}\/\d{1,2}\/\d{1,2}(?:\/|$)/i.test(path)) return false;

    return /(?:^|\/)(?:team|leadership|management|about|people|profile|person|founder|owner|director|officer|board|partner|portfolio|investor|contact|company|bio|our-team|executives?|ownership|governance|members|staff|professionals|principal|firm)(?:[-_a-z0-9]*)(?:\/|$)/i.test(path);
  } catch {
    return false;
  }
}

export function hasRealisticPersonRouteSource(sourceUrls: readonly unknown[]): boolean {
  return sourceUrls.some(isRealisticPersonRouteSourceUrl);
}

export type AdmittedCandidateSourceSet = { name: string; sourceUrls: readonly string[] };

export type CandidateRoleObservation = {
  action: string; execution: string; sourceUrl: string; observation: string; eventId: number;
};

/** Only promoted, observed, role-bound pages on independent publishers count. */
export function candidateRoleCorroborationSources(input: {
  personName: string;
  role: string | null | undefined;
  findings: readonly CandidateSourceFinding[];
  observations: readonly CandidateRoleObservation[];
  isClaimGradeSourceUrl: (value: unknown) => value is string;
  normalizeSourceUrl: (raw: string) => string | null;
}): Array<{ sourceUrl: string; publisher: string; eventId: number }> {
  const role = input.role?.trim().replace(/\s+/g, " ") ?? "";
  if (!role) return [];
  const claimedUrls = new Set(candidateSourceUrlsForIdentity({
    findings: input.findings, personName: input.personName, role,
    isClaimGradeSourceUrl: input.isClaimGradeSourceUrl, normalizeSourceUrl: input.normalizeSourceUrl,
  }));
  if (!claimedUrls.size) return [];
  const supporting = new Map<string, { sourceUrl: string; publisher: string; eventId: number }>();
  const observedLineages = new Set<string>();
  for (const observation of input.observations) {
    if ((observation.action !== "visit" && observation.action !== "browser_fetch") || observation.execution !== "success") continue;
    const sourceUrl = input.normalizeSourceUrl(observation.sourceUrl);
    if (!sourceUrl || !claimedUrls.has(sourceUrl) || !input.isClaimGradeSourceUrl(sourceUrl)) continue;
    const span = bindExactSourceSpan(observation.observation, role, input.personName, 320);
    if (!span?.exact) continue;
    // The same co-binding passage copied to a second domain is not independent
    // corroboration; use the exact bounded passage as a content-lineage key.
    const passageFingerprint = span.text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    const lineageId = sourceLineageId(sourceUrl, passageFingerprint);
    if (observedLineages.has(lineageId)) continue;
    let host = "";
    try { host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); } catch { continue; }
    if (isAggregatorHost(host)) continue;
    const publisher = publisherDomain(host);
    if (!publisher || isAggregatorHost(publisher)) continue;
    observedLineages.add(lineageId);
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


export type DiscoveryTargetabilityObservation = {
  action: string;
  execution: string;
  sourceUrl: string;
  observation: string;
};

function normalizeTargetabilityText(value: string): string {
  return value.normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Ownership/control terms are enough for a review lead, not proof of material wealth. */
const DISCOVERY_OWNERSHIP_SIGNALS = [
  "owner", "owns", "owned", "ownership", "proprietor", "founder", "founded",
  "co founder", "shareholder", "shareholding", "equity stake", "controlling stake",
  "beneficial owner", "majority owner", "majority shareholder", "investor in",
  "invested in", "investment partner", "investor", "general partner", "managing partner",
  "private equity partner", "venture capital partner", "family office principal",
  "concession holder", "concessionaire", "franchise owner", "franchisee",
  "license holder", "licensed operator", "lastnik", "lastnica", "solastnik",
  "solastnica", "ustanovitelj", "soustanovitelj", "delnicar", "druzbenik",
  "investitor", "koncesionar", "imetnik licence", "vlasnik", "suvlasnik",
  "osnivac", "dionicar", "proprietario", "fondatore", "azionista",
  "concessionario", "eigentumer", "gesellschafter", "grunder", "betreiber",
] as const;


/**
 * Minimum discovery handoff evidence: the same successfully fetched claim-grade
 * source must mention the exact person alongside an ownership/control/investment
 * signal. Company scale, material assets, independent corroboration and contact
 * routes are deliberately left to target-scoped research. This is a review lead,
 * never an HNWI or contact conclusion.
 */
export function hasDiscoveryOwnershipLeadSignal(input: {
  personName: string;
  role: string;
  observations: readonly DiscoveryTargetabilityObservation[];
}): boolean {
  const person = normalizeTargetabilityText(input.personName);
  const role = normalizeTargetabilityText(input.role);
  if (person.length < 3 || !role) return false;
  return input.observations.some((observation) => {
    if (observation.execution !== "success" || !["visit", "browser_fetch"].includes(observation.action)) return false;
    if (!isClaimGradeDiscoverySourceUrl(observation.sourceUrl)) return false;
    const passages = observation.observation.split(/(?:\r?\n)+|[.!?;]\s+/u);
    return passages.some((passage) => {
      const nearby = normalizeTargetabilityText(passage);
      if (!nearby.includes(person)) return false;
      return DISCOVERY_OWNERSHIP_SIGNALS.some((term) => {
        const normalizedTerm = normalizeTargetabilityText(term);
        return normalizedTerm.length > 0 && nearby.includes(normalizedTerm);
      });
    });
  });
}

/**
 * Discovery is about plausible high-value people, not any person with a public title.
 * For a wealth-potential conclusion, require source-observed ownership/control
 * plus materiality in the exact person's nearby text; never infer wealth from
 * seniority, prominence, or merely appearing in a registry.
 */
export function hasCredibleDiscoveryWealthPotentialSignal(input: {
  personName: string;
  role: string;
  observations: readonly DiscoveryTargetabilityObservation[];
}): boolean {
  const person = normalizeTargetabilityText(input.personName);
  const role = normalizeTargetabilityText(input.role);
  if (person.length < 3 || !role) return false;

  // A role proves professional identity/control, not wealth. Admission also
  // requires the observed public source to bind this exact person to a
  // material business, asset, investment, or transaction. This deliberately
  // avoids requiring a public net-worth number while rejecting ordinary
  // founders/owners based on title alone.
  const ownershipSignals = DISCOVERY_OWNERSHIP_SIGNALS;
  const materialitySignals = [
    "casino", "gaming resort", "hotel group", "hotel resort", "resort operator",
    "marina operator", "port concession", "airport concession", "real estate portfolio",
    "property portfolio", "commercial property", "real estate developer", "property developer",
    "residential development", "land portfolio", "hotel operator", "hospitality group",
    "energy infrastructure", "mining operation", "shipping fleet", "industrial group",
    "holding group", "holdings group", "investment fund", "private equity", "venture capital",
    "family office", "private capital", "assets under management", "portfolio company",
    "multiple subsidiaries", "operates multiple", "chain of", "franchise network",
    "acquisition", "acquired for", "sold for", "exit", "valuation", "valued at",
    "revenue", "turnover", "ebitda", "net assets", "annual profit", "investment round",
    "funding round", "million", "billion", "eur", "usd", "gbp", "€", "$", "£",
    "nepremicnine", "premozenje", "prihodki", "promet", "dobicek", "vrednost",
    "letovisce", "koncesija", "imovina", "prihodi", "nekretnine", "akvizicija",
    "fatturato", "patrimonio", "immobili", "acquisizione", "umsatz", "vermogen",
    "immobilien", "beteiligung", "ubernahme",
  ];
  return input.observations.some((observation) => {
    if (observation.execution !== "success" || !["visit", "browser_fetch"].includes(observation.action)) return false;
    if (!/^https:\/\/\S+$/i.test(observation.sourceUrl)) return false;
    const passages = observation.observation.split(/(?:\r?\n)+|[.!?;]\s+/u);
    return passages.some((passage) => {
      const nearby = normalizeTargetabilityText(passage);
      if (!nearby.includes(person)) return false;
      const hasOwnership = ownershipSignals.some((term) => {
        const normalizedTerm = normalizeTargetabilityText(term);
        return normalizedTerm.length > 0 && nearby.includes(normalizedTerm);
      });
      const hasTextMateriality = materialitySignals.some((term) => {
        const normalizedTerm = normalizeTargetabilityText(term);
        return normalizedTerm.length > 0 && nearby.includes(normalizedTerm);
      });
      const hasCurrencyMateriality = /[€$£]/u.test(passage);
      return hasOwnership && (hasTextMateriality || hasCurrencyMateriality);
    });
  });
}
