/**
 * Live Registry Client — fetches real entity data from public OSINT registries.
 *
 * Supported registries:
 *   - OpenCorporates  (optional API access; explicit-only)
 *   - Companies House UK (free API key required: COMPANIES_HOUSE_API_KEY)
 *   - SEC EDGAR (free, no key)
 *   - GLEIF LEI Register (free, no key)
 *   - BRREG Norway (free, no key)
 *   - ARES Czechia (free, no key)
 *   - BODACC France (free, no key)
 *
 * Returns normalised RegistryResult[] ready to be inserted as EntityInput.
 */

import { searchGleif } from "./gleif-client";
import { REGISTRY_COVERAGE_MATRIX } from "./registry-matrix";
import { logger } from "./logger";
import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { runProviderCall } from "./provider-gate";

async function registryFetch(registry: string, url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> { return runProviderCall({ provider: "registry", account: `${registry}:${new URL(url).hostname}`, signal }, () => safeOutboundFetch(url, { ...init, signal: init.signal ?? signal })); }

function createRegistryRequestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

export interface RegistryResult {
  name: string;
  type: "Corporation" | "HNWI" | "Gatekeeper" | "PersonCandidate";
  nationality?: string;
  knownResidences?: string;
  sourceRegistries: string;
  notes?: string;
  metadata?: string;
}

/**
 * Translate a registry's record kind into an Apex entity classification.
 * A corporate office, officer appointment, or regulatory filing is not itself
 * evidence that a person is wealthy or is a personal gatekeeper. Keep people
 * discovered only through those records as review candidates until the
 * model-led, source-backed adjudication path establishes more.
 */
export function classifyRegistryRecordType(source: string, formType?: string): RegistryResult["type"] {
  const normalizedSource = source.trim().toLowerCase();
  const normalizedForm = String(formType ?? "").replace(/[\s/]+/g, "").toUpperCase();

  if (normalizedSource === "companies-house-officers") return "PersonCandidate";
  if (normalizedSource === "sec-edgar") {
    if (normalizedForm.startsWith("DEF14A")) return "Corporation";
    if (normalizedForm.startsWith("SC13D") || normalizedForm.startsWith("SC13G")) return "PersonCandidate";
  }
  return "Corporation";
}

/** Trusted Apex person classes require adjudication beyond registry participation. */
export function normalizeUnverifiedRegistryType(type: RegistryResult["type"]): RegistryResult["type"] {
  return type === "HNWI" || type === "Gatekeeper" ? "PersonCandidate" : type;
}

export interface RegistrySearchParams {
  query: string;
  registry: RegistryId;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Public record links are leads, not retrieved evidence. They may be shown to
 * the Investigator so it can choose a later visit, but must never be copied
 * into trajectory.observedUrls by the registry-search action itself.
 */
export function registryResultLeadUrls(result: Pick<RegistryResult, "metadata">): string[] {
  let metadata: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(result.metadata ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    metadata = parsed as Record<string, unknown>;
  } catch {
    return [];
  }

  const urls = new Set<string>();
  for (const [key, value] of Object.entries(metadata)) {
    if (!/(?:url|website)$/i.test(key) || typeof value !== "string" || value.length > 2_048) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) continue;
      const host = url.hostname.toLowerCase();
      let path = url.pathname;
      while (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
      const lowerPath = path.toLowerCase();
      const isSearchEndpoint = ["/search", "/search-index", "/search-results", "/results"].includes(lowerPath);
      const isSearchEngine = host.startsWith("google.")
        || host === "bing.com" || host.endsWith(".bing.com")
        || host === "search.yahoo.com"
        || ((host === "duckduckgo.com" || host === "html.duckduckgo.com")
          && (lowerPath === "/" || lowerPath === "/html") && url.searchParams.has("q"));
      if (isSearchEndpoint || isSearchEngine) continue;
      url.hash = "";
      // The Investigator visit action accepts URLs up to 500 characters.
      // Never emit a lead that the execution boundary will reject on length.
      const normalizedUrl = url.toString();
      if (normalizedUrl.length > 500) continue;
      urls.add(normalizedUrl);
    } catch {
      continue;
    }
  }
  return [...urls].slice(0, 3);
}

export function formatRegistryResultLead(result: RegistryResult, maxUrls = 3): string {
  const notes = result.notes ? ` — ${String(result.notes).slice(0, 160)}` : "";
  const urlLimit = Number.isFinite(maxUrls) ? Math.max(0, Math.min(3, Math.floor(maxUrls))) : 3;
  const urls = registryResultLeadUrls(result).slice(0, urlLimit);
  return `${result.name}${notes}${urls.length ? `; UNVISITED_RECORD_URLS (leads only): ${urls.join(" | ")}` : ""}`;
}
const REGISTRY_ALIASES: Record<string, RegistryId> = {
  "sec edgar": "sec-edgar",
  "sec_edgar": "sec-edgar",
  "sec": "sec-edgar",
  "companies house": "companies-house",
  "uk companies house": "companies-house",
  "companieshouse": "companies-house",
  "ukcompanieshouse": "companies-house",
  "companies_house": "companies-house",
  "company house": "companies-house",
  "br reg": "brreg",
  "ares": "ares-czechia",
  "bodacc": "bodacc-france",
  "gleif": "gleif",
  "faa": "faa",
  "faa aircraft": "faa",
  "faa aircraft registry": "faa",
  "aircraft registry": "faa",
};

export function normalizeRegistryId(raw: string): RegistryId | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if ((REGISTRY_IDS as readonly string[]).includes(normalized)) return normalized as RegistryId;
  return REGISTRY_ALIASES[normalized] ?? null;
}

export const REGISTRY_IDS = [
  "sec-edgar", "companies-house", "brreg", "ares-czechia", "bodacc-france", "gleif",
  "cvr-denmark", "zefix-switzerland", "offeneregister-germany", "bolagsverket-sweden",
  "ytj-finland", "atoka-italy", "borme-spain", "kvk-netherlands", "kbo-belgium", "opencorporates", "faa",
] as const;
export type RegistryId = (typeof REGISTRY_IDS)[number];

function openCorporatesApiToken(): string {
  return process.env["OPENCORPORATES_API_TOKEN"]?.trim()
    || process.env["OPENCORPORATES_API_KEY"]?.trim()
    || "";
}

/** Advertise only registries that are callable with the current runtime configuration. */
export function isRegistryProviderAvailable(registry: string): boolean {
  const normalized = normalizeRegistryId(registry);
  if (!normalized) return false;
  // The Germany adapter stays hidden until its endpoint and live response schema are verified in the deployed runtime.
  // Set the explicit opt-in only after that smoke test; absence/false must not look like a successful empty search.
  if (normalized === "offeneregister-germany") {
    return process.env["APEX_ENABLE_OFFENEREGISTER_GERMANY"]?.trim().toLowerCase() === "true";
  }
  // The previous Sweden adapter called an undocumented Allabolag endpoint and mislabeled its output as Bolagsverket data.
  // Keep the ID in the action schema for compatibility, but do not advertise it as callable until a supported source exists.
  if (normalized === "bolagsverket-sweden" || normalized === "kvk-netherlands") return false;
  if (normalized === "opencorporates") return Boolean(openCorporatesApiToken());
  if (normalized === "companies-house") return Boolean(process.env["COMPANIES_HOUSE_API_KEY"]?.trim());
  return true;
}

export function getAvailableRegistryIds(): RegistryId[] {
  return REGISTRY_IDS.filter(isRegistryProviderAvailable);
}

/**
 * Registry IDs are presented to language models as neutral choices. Randomizing
 * prompt/schema order avoids a stable positional advantage for any one adapter;
 * runtime validation must continue to use getAvailableRegistryIds().
 */
export function getAvailableRegistryIdsForPrompt(rng: () => number = Math.random): RegistryId[] {
  const ids = getAvailableRegistryIds();
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const raw = rng();
    const j = Math.max(0, Math.min(i, Math.floor((Number.isFinite(raw) ? raw : 0) * (i + 1))));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids;
}


export const RANDOM_DISCOVERY_REGISTRIES = [
  "sec-edgar", "companies-house", "brreg", "ares-czechia", "bodacc-france", "gleif",
  "cvr-denmark", "zefix-switzerland", "offeneregister-germany", "bolagsverket-sweden",
  "ytj-finland", "atoka-italy", "borme-spain", "kvk-netherlands", "kbo-belgium", "faa",
] as const satisfies readonly RegistryId[];

export function getRandomDiscoveryRegistries(): RegistryId[] {
  return RANDOM_DISCOVERY_REGISTRIES.filter(isRegistryProviderAvailable);
}

function firstRegistryRecordName(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const name = candidate.trim();
    if (name) return name;
  }
  return null;
}

export function normalizeOpenCorporatesCompany(item: any): RegistryResult | null {
  const co = item?.company;
  const name = firstRegistryRecordName(co?.name);
  if (!name) return null;

  const jurisdictionCode: string = co?.jurisdiction_code ?? "";
  const jurisdiction = (jurisdictionCode.split("_")[0]?.toUpperCase() ?? jurisdictionCode.toUpperCase()) || "Unknown";
  const address = co?.registered_address;
  const addressText = address
    ? [address.street_address, address.locality, address.country].filter(Boolean).join(", ")
    : undefined;

  return {
    name,
    type: "Corporation",
    nationality: jurisdiction || undefined,
    knownResidences: addressText,
    sourceRegistries: JSON.stringify(["OpenCorporates", `${jurisdiction} Registry`]),
    notes: [
      `Reg #${co?.company_number ?? "—"}`,
      co?.company_type ? `Type: ${co.company_type}` : null,
      co?.current_status ? `Status: ${co.current_status}` : null,
      co?.incorporation_date ? `Inc: ${co.incorporation_date}` : null,
    ].filter(Boolean).join(" | "),
    metadata: JSON.stringify({
      source: "opencorporates",
      companyNumber: co?.company_number,
      jurisdictionCode: co?.jurisdiction_code,
      companyType: co?.company_type,
      currentStatus: co?.current_status,
      incorporationDate: co?.incorporation_date,
      openCorporatesUrl: co?.opencorporates_url,
    }),
  };
}

async function searchOpenCorporates(query: string, limit: number, apiToken: string, signal?: AbortSignal): Promise<RegistryResult[]> {
  const url = new URL("https://api.opencorporates.com/v0.4/companies/search");
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(Math.min(limit, 20)));
  url.searchParams.set("order", "score");
  // OpenCorporates' documented authentication contract requires api_token in query parameters.
  // Keep credentials out of exceptions, observations, and explicit application logs.
  url.searchParams.set("api_token", apiToken);
  const resp = await registryFetch("registry", url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "ApexFinder/1.0 OSINT-Intelligence-Platform",
    },
    signal: createRegistryRequestSignal(signal, 10_000),
  });
  if (!resp.ok) {
    // Preserve status for recovery but never store raw upstream response bodies.
    await resp.body?.cancel().catch(() => undefined);
    const error = new Error(`OpenCorporates HTTP ${resp.status}`);
    Object.assign(error, { code: `HTTP_${resp.status}`, status: resp.status });
    throw error;
  }
  const data = (await resp.json()) as any;
  const companies: any[] = data?.results?.companies ?? [];
  return companies
    .map(normalizeOpenCorporatesCompany)
    .filter((result): result is RegistryResult => result !== null);
}

export function normalizeCompaniesHouseCompany(item: any): RegistryResult | null {
  const name = firstRegistryRecordName(item?.title);
  if (!name) return null;

  const address = item?.registered_office_address;
  const addressText = address
    ? [address.premises, address.address_line_1, address.locality, address.postal_code, address.country]
        .filter(Boolean)
        .join(", ")
    : undefined;

  return {
    name,
    type: "Corporation",
    nationality: "GB",
    knownResidences: addressText,
    sourceRegistries: JSON.stringify(["Companies House UK"]),
    notes: [
      `Reg #${item?.company_number ?? "—"}`,
      item?.company_type ? `Type: ${item.company_type}` : null,
      item?.company_status ? `Status: ${item.company_status}` : null,
      item?.date_of_creation ? `Created: ${item.date_of_creation}` : null,
      item?.sic_codes?.length ? `SIC: ${item.sic_codes.join(", ")}` : null,
    ].filter(Boolean).join(" | "),
    metadata: JSON.stringify({
      source: "companies-house",
      companyNumber: item?.company_number,
      companyType: item?.company_type,
      companyStatus: item?.company_status,
      dateOfCreation: item?.date_of_creation,
      sicCodes: item?.sic_codes,
      companyUrl: typeof item?.company_number === "string" && /^[A-Za-z0-9]+$/.test(item.company_number.trim())
        ? `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(item.company_number.trim())}`
        : null,
    }),
  };
}

export function normalizeCompaniesHouseOfficer(item: any): RegistryResult | null {
  const name = firstRegistryRecordName(item?.title);
  if (!name) return null;

  const address = item?.address;
  const addressText = address
    ? [address.premises, address.address_line_1, address.locality, address.postal_code, address.country]
        .filter(Boolean)
        .join(", ")
    : undefined;
  const dob = item?.date_of_birth;
  const dobText = dob ? `${dob.month}/${dob.year}` : null;

  return {
    name,
    type: classifyRegistryRecordType("companies-house-officers"),
    nationality: item?.nationality ?? undefined,
    knownResidences: addressText,
    sourceRegistries: JSON.stringify(["Companies House UK (Officers)"]),
    notes: [
      item?.officer_role ? `Role: ${item.officer_role}` : null,
      dobText ? `DOB: ${dobText}` : null,
      item?.occupation ? `Occupation: ${item.occupation}` : null,
      item?.appointed_on ? `Appointed: ${item.appointed_on}` : null,
      "Officer record only; personal wealth not established.",
    ].filter(Boolean).join(" | "),
    metadata: JSON.stringify({
      source: "companies-house-officers",
      officerRole: item?.officer_role,
      dateOfBirth: item?.date_of_birth,
      nationality: item?.nationality,
      occupation: item?.occupation,
      appointedOn: item?.appointed_on,
      officerUrl: (() => {
        const self = typeof item?.links?.self === "string" ? item.links.self : "";
        const path = self.startsWith("/") ? self : (() => {
          try { return new URL(self).pathname; } catch { return ""; }
        })();
        const match = path.match(/^\/officers\/([A-Za-z0-9-]+)\/appointments\/?$/i);
        return match
          ? `https://find-and-update.company-information.service.gov.uk/officers/${encodeURIComponent(match[1])}/appointments`
          : null;
      })(),
      reviewOnly: true,
      wealthStatus: "unverified",
    }),
  };
}

async function searchCompaniesHouse(query: string, apiKey: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> {
  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
  const headers = { Authorization: auth, Accept: "application/json" };
  const requestSignal = createRegistryRequestSignal(signal, 10_000);
  const n = Math.min(limit, 20);
  const [companiesResp, officersResp] = await Promise.all([
    registryFetch("registry", `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=${n}`, { headers, signal: requestSignal }),
    registryFetch("registry", `https://api.company-information.service.gov.uk/search/officers?q=${encodeURIComponent(query)}&items_per_page=${Math.min(limit, 10)}`, { headers, signal: requestSignal }),
  ]);
  const failedEndpoints = [
    companiesResp.ok ? null : `companies HTTP ${companiesResp.status}`,
    officersResp.ok ? null : `officers HTTP ${officersResp.status}`,
  ].filter((failure): failure is string => failure !== null);
  if (failedEndpoints.length) {
    throw new Error(`Companies House lookup incomplete: ${failedEndpoints.join(", ")}.`);
  }

  const results: RegistryResult[] = [];
  if (companiesResp.ok) {
    const data = (await companiesResp.json()) as any;
    for (const item of data?.items ?? []) {
      const result = normalizeCompaniesHouseCompany(item);
      if (result) results.push(result);
    }
  }
  if (officersResp.ok) {
    const data = (await officersResp.json()) as any;
    for (const item of data?.items ?? []) {
      const result = normalizeCompaniesHouseOfficer(item);
      if (result) results.push(result);
    }
  }
  return results;
}

export function normalizeSecEdgarHit(hit: any): RegistryResult | null {
  const src = hit?._source ?? {};
  const entityName = firstRegistryRecordName(src?.entity_name, src?.display_names?.[0]?.name);
  if (!entityName) return null;

  const formType: string = src?.form_type ?? "";
  const fileDate: string = src?.file_date ?? "";
  const businessLocation: string = src?.biz_location ?? src?.inc_states ?? "US";
  const type = classifyRegistryRecordType("sec-edgar", formType);

  return {
    name: entityName,
    type,
    nationality: "US",
    knownResidences: businessLocation || undefined,
    sourceRegistries: JSON.stringify(["SEC EDGAR", `Form ${formType}`]),
    notes: [
      formType ? `Filing: ${formType}` : null,
      fileDate ? `Date: ${fileDate}` : null,
      src?.period_of_report ? `Period: ${src.period_of_report}` : null,
      type === "PersonCandidate"
        ? "SEC filing lead; personal wealth and current beneficial ownership require verification."
        : type === "Corporation"
          ? "Proxy statement identifies a corporate filer, not a personal gatekeeper by itself."
          : null,
    ].filter(Boolean).join(" | "),
    metadata: JSON.stringify({
      source: "sec-edgar",
      formType,
      fileDate,
      entityName,
      bizLocation: src?.biz_location,
      incStates: src?.inc_states,
      cik: src?.entity_id,
      reviewOnly: type === "PersonCandidate",
      wealthStatus: type === "PersonCandidate" ? "unverified" : "not_assessed",
    }),
  };
}

async function searchSecEdgar(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> {
  const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${query}"`)}&forms=SC+13D,SC+13G,DEF+14A&dateRange=custom&startdt=2018-01-01`;
  const resp = await registryFetch("registry", searchUrl, {
    headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research research@apexfinder.private" },
    signal: createRegistryRequestSignal(signal, 12_000),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`SEC EDGAR ${resp.status}: ${body.slice(0, 200) || resp.statusText}`);
  }

  const data = (await resp.json()) as any;
  const hits: any[] = data?.hits?.hits ?? [];
  const seen = new Set<string>();
  const results: RegistryResult[] = [];
  for (const hit of hits) {
    if (results.length >= limit) break;
    const result = normalizeSecEdgarHit(hit);
    if (!result) continue;
    const key = result.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(result);
  }
  return results;
}

export function normalizeBrregEntity(item: any): RegistryResult | null { const orgnr = String(item?.organisasjonsnummer ?? "").trim(); const name = String(item?.navn ?? "").trim(); if (!orgnr || !name) return null; const address = item?.forretningsadresse ?? item?.postadresse; const addressText = address ? [...(Array.isArray(address.adresse) ? address.adresse : []), address.postnummer, address.poststed, address.land].filter(Boolean).join(", ") : undefined; const website = item?.hjemmeside ? (/^https?:\/\//i.test(String(item.hjemmeside)) ? String(item.hjemmeside) : `https://${item.hjemmeside}`) : undefined; return { name, type: "Corporation", nationality: "NO", knownResidences: addressText, sourceRegistries: JSON.stringify(["BRREG Norway — Enhetsregisteret"]), notes: [`Org #${orgnr}`, item?.organisasjonsform?.beskrivelse ? `Form: ${item.organisasjonsform.beskrivelse}` : null, item?.naeringskode1?.beskrivelse ? `Industry: ${item.naeringskode1.beskrivelse}` : null, item?.stiftelsesdato ? `Founded: ${item.stiftelsesdato}` : null, item?.telefon ? `Phone: ${item.telefon}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "brreg-norway", productionReviewStatus: "review_required", orgnr, organizationForm: item?.organisasjonsform, website, phone: item?.telefon, industry: item?.naeringskode1, municipality: address?.kommune, registeredDate: item?.registreringsdatoEnhetsregisteret, updatedDate: item?.oppdateringsdato, brregUrl: `https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}` }) }; }
async function searchBrreg(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const params = new URLSearchParams({ navn: query, size: String(Math.min(limit, 20)) }); const resp = await registryFetch("registry", `https://data.brreg.no/enhetsregisteret/api/enheter?${params.toString()}`, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research" }, signal: createRegistryRequestSignal(signal, 12_000) }); if (!resp.ok) { const body = await resp.text().catch(() => ""); throw new Error(`BRREG ${resp.status}: ${body.slice(0, 200) || resp.statusText}`); } const data = (await resp.json()) as any; return (data?._embedded?.enheter ?? []).map(normalizeBrregEntity).filter((result: RegistryResult | null): result is RegistryResult => Boolean(result)).slice(0, limit); }
export function normalizeAresEntity(item: any): RegistryResult | null { const ico = String(item?.ico ?? item?.icoId ?? "").trim(); const name = String(item?.obchodniJmeno ?? "").trim(); if (!ico || !name) return null; const address = item?.sidlo; const addressText = String(address?.textovaAdresa ?? "").trim() || [address?.nazevUlice, address?.cisloDomovni, address?.nazevObce, address?.psc, address?.nazevStatu].filter(Boolean).join(", ") || undefined; return { name, type: "Corporation", nationality: "CZ", knownResidences: addressText, sourceRegistries: JSON.stringify(["ARES Czech Republic"]), notes: [`IČO ${ico}`, item?.pravniForma ? `Legal form: ${item.pravniForma}` : null, item?.datumVzniku ? `Founded: ${item.datumVzniku}` : null, item?.datumAktualizace ? `Updated: ${item.datumAktualizace}` : null, item?.dic ? `VAT: ${item.dic}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "ares-czechia", productionReviewStatus: "review_required", ico, vatId: item?.dic, legalForm: item?.pravniForma, legalFormRos: item?.pravniFormaRos, foundedDate: item?.datumVzniku, updatedDate: item?.datumAktualizace, primarySource: item?.primarniZdroj, aresUrl: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}` }) }; }
async function searchAres(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const normalizedQuery = query.trim(); if (/^\d{8}$/.test(normalizedQuery)) { const exact = await registryFetch("registry", `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(normalizedQuery)}`, { headers: { Accept: "application/json" }, signal: createRegistryRequestSignal(signal, 12_000) }); if (exact.status === 404) return []; if (!exact.ok) { const body = await exact.text().catch(() => ""); throw new Error(`ARES ${exact.status}: ${body.slice(0, 200) || exact.statusText}`); } const result = normalizeAresEntity(await exact.json()); return result ? [result] : []; } const resp = await registryFetch("registry", "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ obchodniJmeno: query, strankovani: { pocet: Math.min(limit, 20), start: 0 } }), signal: createRegistryRequestSignal(signal, 12_000) }); if (!resp.ok) { const body = await resp.text().catch(() => ""); if (resp.status === 400 && /příliš mnoho výsledků|too many results/i.test(body)) throw new Error("ARES query is too broad. Search with a more specific Czech company name or an 8-digit IČO."); throw new Error(`ARES ${resp.status}: ${body.slice(0, 200) || resp.statusText}`); } const data = (await resp.json()) as any; return (data?.ekonomickeSubjekty ?? []).map(normalizeAresEntity).filter((result: RegistryResult | null): result is RegistryResult => Boolean(result)).slice(0, limit); }
function parseJsonObject(value: unknown): Record<string, any> { if (typeof value !== "string" || !value.trim()) return {}; try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
export function normalizeBodaccRecord(record: any): RegistryResult | null { const people = parseJsonObject(record?.listepersonnes); const person = people?.personne ?? people; const name = String(person?.denomination ?? record?.commercant ?? person?.nomCommercial ?? "").split(",")[0]?.trim(); const announcementId = String(record?.id ?? "").trim(); if (!name || !announcementId) return null; const address = person?.adresseSiegeSocial; const addressText = [address?.numeroVoie, address?.typeVoie, address?.nomVoie, address?.codePostal, address?.ville, address?.pays, record?.ville, record?.departement_nom_officiel].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || undefined; const registrationNumbers = Array.isArray(record?.registre) ? record.registre.filter(Boolean) : record?.registre ? [record.registre] : []; return { name, type: "Corporation", nationality: "FR", knownResidences: addressText, sourceRegistries: JSON.stringify(["BODACC France"]), notes: [`Announcement ${announcementId}`, record?.familleavis_lib ? `Family: ${record.familleavis_lib}` : null, record?.dateparution ? `Published: ${record.dateparution}` : null, registrationNumbers.length ? `RCS: ${registrationNumbers.join(", ")}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "bodacc-france", productionReviewStatus: "review_required", evidenceKind: "commercial_announcement", announcementId, announcementFamily: record?.familleavis, announcementFamilyLabel: record?.familleavis_lib, publishedDate: record?.dateparution, registrationNumbers, court: record?.tribunal, url: record?.url_complete, personEvidence: person?.administration ?? null }) }; }
async function searchBodacc(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const params = new URLSearchParams({ where: `search("${query.replace(/"/g, '\\"')}")`, limit: String(Math.min(limit * 3, 60)), order_by: "dateparution DESC" }); const resp = await registryFetch("registry", `https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?${params.toString()}`, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research" }, signal: createRegistryRequestSignal(signal, 12_000) }); if (!resp.ok) { const body = await resp.text().catch(() => ""); throw new Error(`BODACC ${resp.status}: ${body.slice(0, 200) || resp.statusText}`); } const data = (await resp.json()) as any; const seen = new Set<string>(); const results: RegistryResult[] = []; for (const record of data?.results ?? []) { const result = normalizeBodaccRecord(record); if (!result) continue; const key = `${result.name.toLowerCase()}|${result.metadata}`; if (seen.has(key)) continue; seen.add(key); results.push(result); if (results.length >= limit) break; } return results; }
async function searchCvrDenmark(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const results: RegistryResult[] = []; const queries = [query, ...query.split(/\s+/).filter(w => w.length > 3)].slice(0, 3); const seen = new Set<string>(); let hadRequestFailure = false; for (const q of queries) { try { const url = `https://cvrapi.dk/api?search=${encodeURIComponent(q)}&country=dk`; const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 10_000) }); if (resp.status === 404) continue; if (!resp.ok) { hadRequestFailure = true; continue; } const data = (await resp.json()) as any; const name: string = data?.name ?? ""; if (!name || seen.has(name.toLowerCase())) continue; seen.add(name.toLowerCase()); const vat: string = data?.vat ? String(data.vat) : ""; const city: string = data?.city ?? ""; const zipcode: string = data?.zipcode ?? ""; const address: string = [data?.address, zipcode, city, "Denmark"].filter(Boolean).join(", "); results.push({ name, type: "Corporation", nationality: "DK", knownResidences: address || undefined, sourceRegistries: JSON.stringify(["CVR Denmark"]), notes: [vat ? `CVR: ${vat}` : null, data?.phone ? `Phone: ${data.phone}` : null, data?.email ? `Email: ${data.email}` : null, data?.startdate ? `Founded: ${data.startdate}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "cvr-denmark", vat, phone: data?.phone ?? null, email: data?.email ?? null, address, city, startdate: data?.startdate ?? null, industrydesc: data?.industrydesc ?? null }) }); if (results.length >= limit) break; } catch (error) { if (signal?.aborted) throw new Error("cancelled"); hadRequestFailure = true; logger.debug({ provider: "cvr-denmark", error: error instanceof Error ? error.name : "unknown" }, "CVR query variant failed"); } } if (hadRequestFailure) throw new Error("CVR Denmark lookup incomplete: one or more query variants failed."); return results; }
async function searchZefixSwitzerland(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const resp = await registryFetch("registry", "https://www.zefix.ch/ZefixREST/api/v1/firm/search.json", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, body: JSON.stringify({ name: query, maxEntries: Math.min(limit, 20), searchType: "0" }), signal: createRegistryRequestSignal(signal, 12_000) }); if (!resp.ok) { const body = await resp.text().catch(() => ""); throw new Error(`Zefix ${resp.status}: ${body.slice(0, 200) || resp.statusText}`); } const data = (await resp.json()) as any; const firms: any[] = Array.isArray(data) ? data : (data?.list ?? []); const results: RegistryResult[] = []; for (const firm of firms.slice(0, limit)) { const name: string = firm?.name ?? ""; if (!name) continue; const uid: string = firm?.uid ?? firm?.ehraid ?? ""; const canton: string = firm?.cantonAbbreviation ?? firm?.legalSeat ?? ""; const municipality: string = firm?.legalSeat ?? ""; const address = [municipality, canton, "Switzerland"].filter(Boolean).join(", "); results.push({ name, type: "Corporation", nationality: "CH", knownResidences: address || undefined, sourceRegistries: JSON.stringify(["Zefix Switzerland"]), notes: [uid ? `UID: ${uid}` : null, firm?.status ? `Status: ${firm.status}` : null, canton ? `Canton: ${canton}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "zefix-switzerland", uid, ehraid: firm?.ehraid ?? null, canton, legalSeat: firm?.legalSeat ?? null, status: firm?.status ?? null, chid: firm?.chid ?? null }) }); } return results; }
/** Keep user/model query text intact; endpoint response language is not a query restriction. */
export function buildAtokaStartupSearchUrl(query: string, limit = 10): string {
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(10, Math.floor(limit))) : 10;
  const url = new URL("https://startup.registroimprese.it/isin/api/v1/startup/search");
  url.searchParams.set("text", query);
  url.searchParams.set("page", "0");
  url.searchParams.set("size", String(boundedLimit));
  return url.toString();
}

export function buildKboBelgiumSearchUrl(query: string, limit = 10): string {
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(10, Math.floor(limit))) : 10;
  const url = new URL("https://kbopub.economie.fgov.be/kbopub/zoeknaamfonetischform.html");
  // The search text is passed verbatim; do not force the Dutch UI locale as a
  // language restriction for a multilingual query.
  url.searchParams.set("searchWord", query);
  url.searchParams.set("pstcdeNummer", "");
  url.searchParams.set("postgemeente", "");
  url.searchParams.set("gemeente", "");
  url.searchParams.set("typeVennootschap", "");
  url.searchParams.set("status", "");
  url.searchParams.set("startdatum", "");
  url.searchParams.set("einddatum", "");
  url.searchParams.set("numberOfResults", String(boundedLimit));
  url.searchParams.set("resultaat", "");
  return url.toString();
}

export function buildBormeSearchUrl(query: string, limit = 10): string {
  const boundedHits = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.floor(limit) * 2)) : 20;
  const url = new URL("https://boe.es/buscar/api.php");
  url.searchParams.set("collection", "BORME");
  url.searchParams.set("q", query);
  url.searchParams.set("hits", String(boundedHits));
  return url.toString();
}

export function buildOffeneregisterSearchUrl(query: string, limit = 10): string {
  const normalizedQuery = query.trim().slice(0, 180);
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.floor(limit))) : 10;
  const sql = [
    "SELECT company.name AS name, company.company_number AS company_number, company.registered_address AS registered_address, company.native_company_number AS native_company_number",
    "FROM company",
    "WHERE company.name LIKE :p0",
    `LIMIT ${boundedLimit}`,
  ].join(" ");
  // Use Datasette's documented custom-SQL route and bound parameter; never interpolate model text.
  const url = new URL("https://db.offeneregister.de/openregister-ef9e802/-/query.json");
  url.searchParams.set("sql", sql);
  url.searchParams.set("p0", `%${normalizedQuery}%`);
  url.searchParams.set("_shape", "objects");
  // Columns are required even for zero rows, so an empty result can be distinguished
  // from an incompatible or malformed response envelope.
  url.searchParams.set("_extra", "columns");
  return url.toString();
}

async function searchOffeneregisterGermany(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> {
  const url = buildOffeneregisterSearchUrl(query, limit);
  const resp = await registryFetch("registry", url, {
    headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" },
    signal: createRegistryRequestSignal(signal, 15_000),
  });
  if (!resp.ok) throw new Error(`Offeneregister Germany HTTP ${resp.status}`);

  let payload: unknown;
  try {
    payload = await resp.json();
  } catch {
    throw new Error("Offeneregister Germany malformed response: invalid JSON");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Offeneregister Germany malformed response: expected a JSON object");
  }
  const data = payload as { ok?: unknown; error?: unknown; rows?: unknown; columns?: unknown };
  if (data.ok === false || data.error) {
    throw new Error("Offeneregister Germany SQL API returned an error response");
  }
  const rows = data.rows;
  const columns = data.columns;
  if (data.ok !== true || !Array.isArray(rows) || !Array.isArray(columns) ||
      !columns.every((column) => typeof column === "string")) {
    throw new Error("Offeneregister Germany malformed response: missing success, rows, or columns");
  }
  const requiredColumns = ["name", "company_number", "registered_address", "native_company_number"];
  if (!requiredColumns.every((column) => columns.includes(column))) {
    throw new Error("Offeneregister Germany malformed response: expected company columns are missing");
  }

  const results: RegistryResult[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Offeneregister Germany malformed response: expected object-shaped rows");
    }
    const record = row as Record<string, unknown>;
    if (typeof record.name !== "string" || !record.name.trim()) {
      throw new Error("Offeneregister Germany malformed response: a row has no valid company name");
    }
    const name = record.name.trim();
    const address = typeof record.registered_address === "string" ? record.registered_address.trim() : "";
    const nativeCompanyNumber = typeof record.native_company_number === "string" ? record.native_company_number.trim() : "";
    const companyNumber = typeof record.company_number === "string" ? record.company_number.trim() : "";
    results.push({
      name,
      type: "Corporation",
      nationality: "DE",
      knownResidences: address || undefined,
      sourceRegistries: JSON.stringify(["OffeneRegister.de German Commercial Register"]),
      notes: nativeCompanyNumber ? `Register reference: ${nativeCompanyNumber}` : undefined,
      metadata: JSON.stringify({ source: "offeneregister-germany", companyNumber: companyNumber || null, nativeCompanyNumber: nativeCompanyNumber || null }),
    });
    if (results.length >= Math.min(limit, 20)) break;
  }
  return results;
}
async function searchBolagsverketSweden(
  _query: string,
  _limit: number,
  signal?: AbortSignal,
): Promise<RegistryResult[]> {
  if (signal?.aborted) throw new Error("cancelled");
  const error = new Error("REGISTRY_ADAPTER_UNAVAILABLE: bolagsverket-sweden has no supported direct-search integration configured. The previous implementation used an undocumented third-party Allabolag endpoint and mislabeled results as Bolagsverket records. Use web_search/parallel_web_search for Swedish company discovery, fetch observed source pages, use Sweden's SNI classification rather than assuming UK SIC labels, and verify beneficial-owner disclosures separately; do not assume a Swedish Companies House-style PSC record.");
  Object.assign(error, { code: "REGISTRY_ADAPTER_UNAVAILABLE" });
  throw error;
}

async function searchYtjFinland(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<RegistryResult[]> {
  try {
    const url = `https://avoindata.prh.fi/opendata-ytj-api/v3/companies?name=${encodeURIComponent(query)}&maxResults=${Math.min(limit, 5)}`;
    const response = await registryFetch("registry", url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)",
      },
      signal: createRegistryRequestSignal(signal, 14_000),
    });
    if (!response.ok) throw new Error(`YTJ Finland HTTP ${response.status}`);

    const data = (await response.json()) as any;
    const companies: any[] = data?.companies ?? [];
    const results: RegistryResult[] = [];

    for (const company of companies.slice(0, limit)) {
      const businessId: string = company?.businessId?.value ?? "";
      if (!businessId) continue;

      const names: any[] = company?.names ?? [];
      const currentName = names.find((name: any) => name?.type === "1" && !name?.endDate) ?? names[0];
      const name: string = currentName?.name ?? "";
      if (!name) continue;

      const forms: any[] = company?.companyForms ?? [];
      const formDescription =
        forms[0]?.descriptions?.find((description: any) => description?.languageCode === "3")?.description ??
        forms[0]?.descriptions?.[0]?.description ??
        "";
      const registrationDate: string = company?.businessId?.registrationDate ?? "";
      let address = "Finland";
      let phone: string | null = null;
      let email: string | null = null;
      let website: string | null = null;

      // Detail records enrich the primary search result but do not replace it.
      // A detail outage may leave this company with less metadata; cancellation
      // must still propagate so the caller cannot report a cancelled run as success.
      try {
        const detailResponse = await registryFetch(
          "registry",
          `https://avoindata.prh.fi/opendata-ytj-api/v3/companies/${encodeURIComponent(businessId)}`,
          {
            headers: { Accept: "application/json" },
            signal: createRegistryRequestSignal(signal, 8_000),
          },
        );
        if (detailResponse.ok) {
          const detail = (await detailResponse.json()) as any;
          const detailCompany = detail?.companies?.[0] ?? detail;
          const addresses: any[] = detailCompany?.addresses ?? [];
          const mainAddress =
            addresses.find((item: any) => item?.type === "1" && !item?.endDate) ?? addresses[0];
          if (mainAddress) {
            address = [mainAddress.street, mainAddress.postCode, mainAddress.city, "Finland"]
              .filter(Boolean)
              .join(", ");
          }

          const contactDetails: any[] = detailCompany?.contactDetails ?? [];
          for (const contact of contactDetails) {
            const value: string = contact?.value ?? "";
            if (!value) continue;
            if (
              (contact?.type === "3" || value.startsWith("+") || /^\d[\d\s\-()]{6,}/.test(value)) &&
              !phone
            ) {
              phone = value;
            } else if ((contact?.type === "4" || value.includes("@")) && !email) {
              email = value;
            } else if ((contact?.type === "5" || /^https?:/i.test(value)) && !website) {
              website = value;
            }
          }
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        logger.debug(
          { businessId, error: error instanceof Error ? error.message : "unknown detail lookup error" },
          "YTJ Finland detail enrichment unavailable; retaining primary registry result",
        );
      }

      const noteParts = [
        `Y-tunnus: ${businessId}`,
        formDescription ? `Form: ${formDescription}` : null,
        registrationDate ? `Registered: ${registrationDate}` : null,
        phone ? `Phone: ${phone}` : null,
        email ? `Email: ${email}` : null,
        website ? `Website: ${website}` : null,
      ].filter(Boolean);

      results.push({
        name,
        type: "Corporation",
        nationality: "FI",
        knownResidences: address,
        sourceRegistries: JSON.stringify(["YTJ Finland"]),
        notes: noteParts.join(". "),
        metadata: JSON.stringify({
          source: "ytj-finland",
          businessId,
          companyForm: formDescription || null,
          registrationDate: registrationDate || null,
          phone,
          email,
          website,
        }),
      });
    }

    return results;
  } catch (error) {
    logger.debug(
      { error: error instanceof Error ? error.message : "unknown lookup error" },
      "YTJ Finland search failed",
    );
    throw error;
  }
}
async function searchAtokaItaly(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> {
  const results: RegistryResult[] = [];
  const seen = new Set<string>();
  let startupLookupSucceeded = false;
  let companyIndexSucceeded = false;

  try {
    const url = buildAtokaStartupSearchUrl(query, limit);
    const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 5_000) });
    if (!resp.ok) throw new Error(`Italian startup registry HTTP ${resp.status}`);
    const data = (await resp.json()) as any;
    startupLookupSucceeded = true;
    const items: any[] = data?.content ?? data?.result ?? data?.data ?? [];
    for (const item of items.slice(0, limit)) {
      const name: string = item?.denominazione ?? item?.ragioneSociale ?? item?.name ?? "";
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const cf: string = item?.codiceFiscale ?? item?.cf ?? "";
      const city: string = item?.comune ?? item?.city ?? item?.localita ?? "";
      const province: string = item?.provincia ?? item?.prov ?? "";
      const address = [item?.indirizzo, city, province, "Italy"].filter(Boolean).join(", ");
      results.push({
        name, type: "Corporation", nationality: "IT", knownResidences: address || undefined,
        sourceRegistries: JSON.stringify(["Registro Imprese Italy (startup)"]),
        notes: [cf ? `CF/PIVA: ${cf}` : null, item?.ateco ? `ATECO: ${item.ateco}` : null, item?.dataIscrizione ? `Registered: ${item.dataIscrizione}` : null].filter(Boolean).join(" | "),
        metadata: JSON.stringify({ source: "atoka-italy", cf, city, province, ateco: item?.ateco ?? null, category: item?.categoria ?? null }),
      });
      if (results.length >= limit) break;
    }
  } catch (error) {
    if (signal?.aborted) throw new Error("cancelled");
    logger.debug({ provider: "italian-startup-registry", error: error instanceof Error ? error.name : "unknown" }, "Startup registry tier unavailable; trying company index");
  }

  if (results.length === 0) {
    try {
      const url = `https://www.atoka.io/api/v1/companies?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 5)}`;
      const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 5_000) });
      if (!resp.ok) throw new Error(`Atoka company index HTTP ${resp.status}`);
      const data = (await resp.json()) as any;
      companyIndexSucceeded = true;
      const items: any[] = data?.data ?? data?.items ?? data?.results ?? [];
      for (const item of items.slice(0, limit)) {
        const name: string = item?.name ?? item?.denominazione ?? "";
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const vatNumber: string = item?.vatNumber ?? item?.cf ?? item?.id ?? "";
        const city: string = item?.registered_address?.city ?? item?.city ?? "";
        const address = [item?.registered_address?.street, city, "Italy"].filter(Boolean).join(", ");
        results.push({
          name, type: "Corporation", nationality: "IT", knownResidences: address || undefined,
          sourceRegistries: JSON.stringify(["Registro Imprese Italy"]),
          notes: vatNumber ? `PIVA: ${vatNumber}` : undefined,
          metadata: JSON.stringify({ source: "atoka-italy", vatNumber, city }),
        });
        if (results.length >= limit) break;
      }
    } catch (error) {
      if (signal?.aborted) throw new Error("cancelled");
      logger.debug({ provider: "atoka-company-index", error: error instanceof Error ? error.name : "unknown" }, "Atoka company index unavailable");
    }
  }

  if (results.length === 0 && (!startupLookupSucceeded || !companyIndexSucceeded)) {
    throw new Error(`Atoka Italy lookup incomplete: startup directory ${startupLookupSucceeded ? "responded" : "failed"}, company index ${companyIndexSucceeded ? "responded" : "failed"}.`);
  }
  return results;
}
async function searchBormeSpain(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const results: RegistryResult[] = []; const seen = new Set<string>(); const url = buildBormeSearchUrl(query, limit); const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 5_000) }); if (!resp.ok) throw new Error(`BORME Spain HTTP ${resp.status}`); const data = (await resp.json()) as any; const items: any[] = data?.response?.results?.result ?? data?.items ?? []; for (const item of items) { const raw: string = item?.titulo ?? item?.title ?? item?.descripcion ?? ""; if (!raw) continue; const name = raw.replace(/^[A-ZÁÉÍÓÚ\s]+:\s+/u, "").split(/[,;]/)[0]?.trim() ?? raw; if (!name || seen.has(name.toLowerCase())) continue; seen.add(name.toLowerCase()); const pubDate: string = item?.fecha ?? item?.date ?? ""; const section: string = item?.seccion ?? ""; const idBoe: string = item?.identificador ?? item?.id ?? ""; results.push({ name, type: "Corporation", nationality: "ES", knownResidences: "Spain", sourceRegistries: JSON.stringify(["BORME Spain (BOE)"]), notes: [pubDate ? `Published: ${pubDate}` : null, section ? `Section: ${section}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "borme-spain", boeId: idBoe, pubDate, section, boeUrl: idBoe ? `https://www.boe.es/boe/dias/${pubDate?.replace(/-/g, "/")}/pdfs/${idBoe}.pdf` : null }) }); if (results.length >= limit) break; } return results; }
async function searchKboBelgium(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const results: RegistryResult[] = []; const url = buildKboBelgiumSearchUrl(query, limit); const resp = await registryFetch("registry", url, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 5_000) }); if (!resp.ok) throw new Error(`KBO Belgium HTTP ${resp.status}`); const html = await resp.text(); const rowRe = /href="[^"]*ondernemingsnummer=(\d+)[^"]*"\s*>([^<]+)<\/a>/g; const cityRe = /class="resultaatValue"[^>]*>([^<]{3,40})<\/td>/g; let m: RegExpExecArray | null; const cities: string[] = []; let cityMatch; while ((cityMatch = cityRe.exec(html)) !== null) cities.push((cityMatch[1] ?? "").trim()); let idx = 0; while ((m = rowRe.exec(html)) !== null && results.length < limit) { const enterpriseNumber = m[1] ?? ""; const name = (m[2] ?? "").trim(); if (!name || name.length < 2) { idx++; continue; } const city = cities[idx * 2 + 1] ?? cities[idx] ?? ""; results.push({ name, type: "Corporation", nationality: "BE", knownResidences: city ? `${city}, Belgium` : "Belgium", sourceRegistries: JSON.stringify(["KBO Belgium"]), notes: enterpriseNumber ? `KBO: ${enterpriseNumber.replace(/(\d{4})(\d{3})(\d{3})/, "$1.$2.$3")}` : undefined, metadata: JSON.stringify({ source: "kbo-belgium", enterpriseNumber, city, kboUrl: enterpriseNumber ? `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${enterpriseNumber}` : null }) }); idx++; } return results; }

/** Build an official FAA Aircraft Inquiry URL from a grounded registrant name or N-number. */
export function buildFaaAircraftSearchUrl(query: string): string {
  const value = query.trim().slice(0, 180);
  if (!value) throw new Error("FAA aircraft query cannot be empty.");
  const base = "https://registry.faa.gov/AircraftInquiry/Search/";
  if (/^N?[1-9][0-9]{0,4}[A-Z]{0,2}$/i.test(value)) return base + "NNumberResult?NNumbertxt=" + encodeURIComponent(value.toUpperCase());
  return base + "NameResult?nametxt=" + encodeURIComponent(value) + "&sort_option=4";
}
function decodeFaaText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_m: string, n: string) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_m: string, n: string) => String.fromCharCode(Number.parseInt(n, 16))).replace(/\s+/g, " ").trim().slice(0, 500);
}
function faaRowFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...(rowMatch[1] ?? "").matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decodeFaaText(cell[1] ?? ""));
    for (let i = 0; i + 1 < cells.length; i += 2) { const label = cells[i]?.replace(/:$/, "").trim().toLowerCase(), value = cells[i + 1]?.trim(); if (label && value && !fields[label]) fields[label] = value; }
  }
  return fields;
}
/** Normalize one FAA aircraft observation; registrant is not assumed to be beneficial owner. */
export function normalizeFaaAircraftDetail(html: string, sourceUrl: string): RegistryResult | null {
  let url: URL;
  try { url = new URL(sourceUrl); if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "registry.faa.gov" || !url.pathname.toLowerCase().includes("/aircraftinquiry/search/")) return null; } catch { return null; }
  if (html.length > 5_000_000) return null;
  const fields = faaRowFields(html);
  const nNumberFromUrl = url.searchParams.get("NNumbertxt") ?? url.searchParams.get("NNumberTxt") ?? "";
  const nNumber = (nNumberFromUrl || decodeFaaText(html.match(/N-Number Entered\s*:?([A-Z0-9-]+)/i)?.[1] ?? "")).trim().toUpperCase();
  const registrant = (fields["name"] ?? fields["registrant name"] ?? fields["registered owner"])?.trim();
  if (!registrant || registrant.length > 180 || !nNumber) return null;
  const registrationType = fields["type registration"] ?? fields["type of registration"] ?? "";
  const isOrganization = /\b(?:corporation|llc|limited liability|partnership|government|non citizen corporation)\b/i.test(registrationType) || /\b(?:LLC|L\.L\.C\.?|INC\.?|INCORPORATED|CORP\.?|CORPORATION|LTD\.?|LIMITED|LP|LLP|PLC|HOLDINGS|TRUST)\b/i.test(registrant);
  const isIndividual = /\bindividual\b/i.test(registrationType) && !/co-owned/i.test(registrationType);
  // Never turn an ambiguous/co-owned registrant row into a single-person card.
  if (!isOrganization && !isIndividual) return null;
  const manufacturer = fields["manufacturer name"] ?? fields["manufacturer"] ?? fields["make"] ?? "", model = fields["model"] ?? "", status = fields["status"] ?? "", serial = fields["serial number"] ?? "";
  return { name: registrant, type: isOrganization ? "Corporation" : "PersonCandidate", nationality: "US", sourceRegistries: JSON.stringify(["FAA Aircraft Registry"]),
    notes: ["FAA aircraft registration " + nNumber, manufacturer ? "Manufacturer: " + manufacturer : null, model ? "Model: " + model : null, status ? "Registration status: " + status : null, registrationType ? "Registrant type: " + registrationType : null, "Registrant record only; does not establish beneficial ownership, aircraft market value, or personal wealth."].filter(Boolean).join(" | "),
    metadata: JSON.stringify({ source: "faa-aircraft-registry", sourceUrl: sourceUrl, nNumber, serialNumber: serial || undefined, manufacturer: manufacturer || undefined, model: model || undefined, registrationStatus: status || undefined, registrationType: registrationType || undefined, ownershipLimitation: "FAA registrant is not necessarily the beneficial owner; some records may be withheld from public display." }) };
}
async function searchFaaAircraft(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> {
  const searchUrl = buildFaaAircraftSearchUrl(query);
  const resp = await registryFetch("faa-aircraft-registry", searchUrl, { headers: { Accept: "text/html", "User-Agent": "ApexAtlas/1.0 public-registry-research" }, signal: createRegistryRequestSignal(signal, 15_000) });
  if (!resp.ok) throw new Error("FAA Aircraft Registry " + resp.status + ": " + resp.statusText);
  const html = await resp.text();
  if (html.length > 5_000_000) throw new Error("FAA Aircraft Registry response exceeded the 5 MB parse limit.");
  if (/captcha|access denied|bot manager/i.test(html.slice(0, 50_000))) { const error = new Error("FAA Aircraft Registry returned an access/challenge page; this is a provider failure, not a no-hit."); Object.assign(error, { code: "REGISTRY_PROVIDER_BLOCKED" }); throw error; }
  const directNNumber = /NNumberResult/i.test(searchUrl), urls = new Set<string>();
  if (directNNumber) urls.add(searchUrl);
  else {
    for (const match of html.matchAll(/href=["\']([^"\']*NNumberResult\?[^"\']*)["\']/gi)) {
      try { const url = new URL(match[1]!.replace(/&amp;/gi, "&"), "https://registry.faa.gov"); if (url.protocol === "https:" && url.hostname.toLowerCase() === "registry.faa.gov" && /\/AircraftInquiry\/Search\/NNumberResult$/i.test(url.pathname) && (url.searchParams.has("NNumbertxt") || url.searchParams.has("NNumberTxt"))) urls.add(url.toString()); } catch { /* malformed source link is not a lead */ }
      if (urls.size >= Math.min(5, Math.max(1, limit))) break;
    }
    if (!urls.size) { const text = decodeFaaText(html); if (/no records found|no matching aircraft|0 records/i.test(text)) return []; throw new Error("FAA Aircraft Registry response did not match the expected results schema; not treated as a no-hit."); }
  }
  const results: RegistryResult[] = [];
  for (const url of [...urls].slice(0, Math.min(5, Math.max(1, limit)))) {
    if (signal?.aborted) throw new Error("cancelled");
    const detail = url === searchUrl ? resp : await registryFetch("faa-aircraft-registry", url, { headers: { Accept: "text/html", "User-Agent": "ApexAtlas/1.0 public-registry-research" }, signal: createRegistryRequestSignal(signal, 15_000) });
    if (!detail.ok) throw new Error("FAA Aircraft Registry detail " + detail.status + ": " + detail.statusText);
    const detailHtml = detail === resp ? html : await detail.text(), normalized = normalizeFaaAircraftDetail(detailHtml, url);
    if (normalized) { results.push(normalized); continue; }
    const detailText = decodeFaaText(detailHtml);
    if (/no records found|no matching aircraft|invalid n-number/i.test(detailText)) continue;
    if (/aircraft description|registered owner|n-number inquiry results/i.test(detailText)) {
      const error = new Error("FAA aircraft record was observed, but registrant identity is not publicly available or could not be parsed; this is partial evidence, not a no-hit.");
      Object.assign(error, { code: "REGISTRY_PARTIAL" }); throw error;
    }
    throw new Error("FAA Aircraft Registry detail response did not match the expected schema; not treated as a no-hit.");
  }
  return results;
}

export async function searchRegistry(params: RegistrySearchParams): Promise<RegistryResult[]> {
  const { query, registry, limit = 10, signal } = params;
  if (signal?.aborted) throw new Error("cancelled");
  if (!query.trim()) throw new Error("Search query cannot be empty.");
  const normalizedRegistry = normalizeRegistryId(registry);
  if (!normalizedRegistry) throw new Error(`Unknown registry: "${registry}". Use one of: ${REGISTRY_IDS.join(", ")}.`);
  if (normalizedRegistry === "faa") return searchFaaAircraft(query.trim(), limit, signal);
  if (normalizedRegistry === "bolagsverket-sweden") {
    return searchBolagsverketSweden(query.trim(), limit, signal);
  }
  if (normalizedRegistry === "kvk-netherlands") {
    const error = new Error("REGISTRY_ADAPTER_UNAVAILABLE: kvk-netherlands has no verified public endpoint configured. The former openkvk.nl mirror did not resolve during the latest check; the official KVK APIs require a subscription. Use web_search/parallel_web_search for Dutch-company discovery and fetch observed source pages. Do not interpret registry unavailability as a no-hit.");
    Object.assign(error, { code: "REGISTRY_ADAPTER_UNAVAILABLE" });
    throw error;
  }
  if (normalizedRegistry === "offeneregister-germany" && !isRegistryProviderAvailable(normalizedRegistry)) {
    const error = new Error("REGISTRY_ADAPTER_UNAVAILABLE: offeneregister-germany is disabled until its endpoint and response schema are verified by a live runtime smoke test. Do not interpret this state as a no-hit.");
    Object.assign(error, { code: "REGISTRY_ADAPTER_UNAVAILABLE" });
    throw error;
  }
  let results: RegistryResult[];
  if (normalizedRegistry === "opencorporates") {
    const apiToken = openCorporatesApiToken();
    if (!apiToken) {
      const error = new Error("OpenCorporates unavailable: API token is not configured.");
      Object.assign(error, { code: "REGISTRY_AUTH_REQUIRED" });
      throw error;
    }
    results = await searchOpenCorporates(query.trim(), limit, apiToken, signal);
  }
  else if (normalizedRegistry === "companies-house") {
    const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
    if (!apiKey) { const error = new Error("COMPANIES_HOUSE_API_KEY is not configured. Register for a free key at https://developer.company-information.service.gov.uk/ and set it as an environment variable."); Object.assign(error, { code: "REGISTRY_AUTH_REQUIRED" }); throw error; }
    results = await searchCompaniesHouse(query.trim(), apiKey, limit, signal);
  } else if (normalizedRegistry === "sec-edgar") results = await searchSecEdgar(query.trim(), limit, signal);
  else if (normalizedRegistry === "gleif") { const gleifResults = await searchGleif(query.trim(), limit, signal); results = gleifResults.map((r) => ({ name: r.name, type: r.type, nationality: r.nationality, knownResidences: r.knownResidences, sourceRegistries: r.sourceRegistries, notes: r.notes, metadata: r.metadata })); }
  else if (normalizedRegistry === "brreg") results = await searchBrreg(query.trim(), limit, signal);
  else if (normalizedRegistry === "ares-czechia") results = await searchAres(query.trim(), limit, signal);
  else if (normalizedRegistry === "bodacc-france") results = await searchBodacc(query.trim(), limit, signal);
  else if (normalizedRegistry === "cvr-denmark") results = await searchCvrDenmark(query.trim(), limit, signal);
  else if (normalizedRegistry === "zefix-switzerland") results = await searchZefixSwitzerland(query.trim(), limit, signal);
  else if (normalizedRegistry === "offeneregister-germany") results = await searchOffeneregisterGermany(query.trim(), limit, signal);
  else if (normalizedRegistry === "ytj-finland") results = await searchYtjFinland(query.trim(), limit, signal);
  else if (normalizedRegistry === "atoka-italy") results = await searchAtokaItaly(query.trim(), limit, signal);
  else if (normalizedRegistry === "borme-spain") results = await searchBormeSpain(query.trim(), limit, signal);

  else if (normalizedRegistry === "kbo-belgium") results = await searchKboBelgium(query.trim(), limit, signal);
  else throw new Error(`Unknown registry: "${registry}". Use one of: ${REGISTRY_IDS.join(", ")}.`);
  if (signal?.aborted) throw new Error("cancelled");
  return results;
}
