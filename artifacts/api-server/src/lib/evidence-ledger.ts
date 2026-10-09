export type SourceFamily = "official" | "registry" | "press" | "social" | "search" | "unknown";

export interface EvidenceItem {
  url: string;
  value: string;
  label?: string | null;
}

export interface CanonicalEvidenceItem extends EvidenceItem {
  canonicalUrl: string | null;
  canonicalDomain: string | null;
  normalizedValue: string;
  sourceFamily: SourceFamily;
}

export interface LedgerSummary {
  totalItems: number;
  uniqueItems: number;
  corroboratingFamilies: number;
  corroboratingDomains: number;
  conflictCount: number;
  score: number;
}

const TRACKING_PARAM_RE = /^(utm_(source|medium|campaign|term|content|id)|gclid|fbclid|mc_cid|mc_eid|ref|ref_src|igshid|cmpid|yclid|mkt_tok)$/i;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function canonicalizeUrl(raw: string | null | undefined): string | null {
  const input = raw?.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hostname = host;
  url.hash = "";
  const keptParams = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (!TRACKING_PARAM_RE.test(key)) keptParams.append(key, value);
  });
  const search = keptParams.toString();
  url.search = search ? `?${search}` : "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

const REGISTRY_SOURCE_DOMAINS = new Set(["register.com","companieshouse.gov.uk","handelsregister.de","brreg.no","opencorporates.com","fca.org.uk","lei.info","gleif.org","edgar.sec.gov","inpi.fr","infogreffe.fr","sbi.gov.br","kvk.nl","kbo-bce.be","zefix.ch","cvr.dk","ytj.fi","bodacc.fr","ares.cnr.it","landregistry.gov.uk","hmlr.gov.uk","faa.gov"]);
const PRESS_SOURCE_DOMAINS = new Set(["prnewswire.com","globenewswire.com","businesswire.com","reuters.com","apnews.com","bloomberg.com","forbes.com","wsj.com","ft.com","economist.com"]);
const SOCIAL_SOURCE_DOMAINS = new Set(["twitter.com","x.com","linkedin.com","instagram.com","facebook.com","t.me","telegram.me","youtube.com","github.com","reddit.com","medium.com","substack.com"]);
const SEARCH_SOURCE_DOMAINS = new Set(["google.com","bing.com","duckduckgo.com","yahoo.com","baidu.com","yandex.com","brave.com"]);

function hostIsOrWithin(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}

function matchesAnySourceDomain(host: string, roots: ReadonlySet<string>): boolean {
  return [...roots].some((root) => hostIsOrWithin(host, root));
}

export function getSourceFamily(hostname: string | null | undefined): SourceFamily {
  const host = hostname?.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "") ?? "";
  if (!host) return "unknown";

  // Domain suffixes are evaluated at label boundaries. A word appearing in an
  // unrelated hostname (e.g. reuters.attacker.com) is not publisher evidence.
  const officialSuffixes = [
    ".gov", ".gov.uk", ".gov.au", ".govt.nz", ".gc.ca", ".gouv.fr",
    ".go.jp", ".gob.mx", ".gov.in", ".gov.sg", ".gov.br", ".gov.za",
    ".edu", ".edu.au", ".ac.uk", ".ac.nz",
  ];
  // An explicit registry/publisher family is more specific than the TLD.
  // For example, Companies House and SEC EDGAR are official .gov sources but
  // need to remain identifiable as registry evidence for source diversity.
  if (matchesAnySourceDomain(host, REGISTRY_SOURCE_DOMAINS)) return "registry";
  if (officialSuffixes.some((suffix) => host.endsWith(suffix))) return "official";
  if (matchesAnySourceDomain(host, PRESS_SOURCE_DOMAINS)) return "press";
  if (matchesAnySourceDomain(host, SOCIAL_SOURCE_DOMAINS)) return "social";
  if (matchesAnySourceDomain(host, SEARCH_SOURCE_DOMAINS)) return "search";
  return "unknown";
}

export function normalizeEvidenceValue(value: string | null | undefined): string {
  return normalizeWhitespace((value ?? "").toLowerCase());
}

export function canonicalizeEvidenceItem(item: EvidenceItem): CanonicalEvidenceItem {
  const canonicalUrl = canonicalizeUrl(item.url);
  const canonicalDomain = canonicalUrl ? new URL(canonicalUrl).hostname : null;
  return {
    ...item,
    url: item.url.trim(),
    value: item.value,
    canonicalUrl,
    canonicalDomain,
    normalizedValue: normalizeEvidenceValue(item.value),
    sourceFamily: getSourceFamily(canonicalDomain),
  };
}

export function dedupeEvidence(items: readonly EvidenceItem[]): CanonicalEvidenceItem[] {
  const seen = new Set<string>();
  const result: CanonicalEvidenceItem[] = [];
  for (const item of items) {
    const canonical = canonicalizeEvidenceItem(item);
    const key = `${canonical.canonicalUrl ?? ""}|${canonical.canonicalDomain ?? ""}|${canonical.normalizedValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(canonical);
  }
  return result;
}

export function scoreCorroboration(items: readonly EvidenceItem[]): LedgerSummary {
  const unique = dedupeEvidence(items);
  const familySet = new Set(unique.map((item) => item.sourceFamily).filter((family) => family !== "unknown"));
  const domainSet = new Set(unique.map((item) => item.canonicalDomain).filter((domain): domain is string => Boolean(domain)));
  const normalizedToDomains = new Map<string, Set<string>>();
  for (const item of unique) {
    const domains = normalizedToDomains.get(item.normalizedValue) ?? new Set<string>();
    if (item.canonicalDomain) domains.add(item.canonicalDomain);
    normalizedToDomains.set(item.normalizedValue, domains);
  }
  let conflicts = 0;
  for (const domains of normalizedToDomains.values()) {
    if (domains.size > 1) conflicts += domains.size - 1;
  }
  const corroboratingFamilies = familySet.size;
  const corroboratingDomains = domainSet.size;
  const base = corroboratingFamilies * 20 + corroboratingDomains * 5 + unique.length * 3;
  const score = Math.max(0, Math.min(100, base - conflicts * 15));
  return {
    totalItems: items.length,
    uniqueItems: unique.length,
    corroboratingFamilies,
    corroboratingDomains,
    conflictCount: conflicts,
    score,
  };
}
