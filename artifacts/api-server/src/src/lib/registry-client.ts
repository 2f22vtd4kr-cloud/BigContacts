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
      urls.add(url.toString());
    } catch {
      continue;
    }
  }
  return [...urls].slice(0, 3);
}

export function formatRegistryResultLead(result: RegistryResult): string {
  const notes = result.notes ? ` — ${String(result.notes).slice(0, 160)}` : "";
  const urls = registryResultLeadUrls(result);
  return `${result.name}${notes}${urls.length ? `; UNVISITED_RECORD_URLS (leads only): ${urls.join(" | ")}` : ""}`;
}
const REGISTRY_ALIASES: Record<string, RegistryId> = {
  "sec edgar": "sec-edgar",
  "sec_edgar": "sec-edgar",
  "sec": "sec-edgar",
  "companies house": "companies-house",
  "companies_house": "companies-house",
  "company house": "companies-house",
  "br reg": "brreg",
  "ares": "ares-czechia",
  "bodacc": "bodacc-france",
  "gleif": "gleif",
};

export function normalizeRegistryId(raw: string): RegistryId | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if ((REGISTRY_IDS as readonly string[]).includes(normalized)) return normalized as RegistryId;
  return REGISTRY_ALIASES[normalized] ?? null;
}

export const REGISTRY_IDS = [
  "sec-edgar", "companies-house", "brreg", "ares-czechia", "bodacc-france", "gleif",
  "cvr-denmark", "zefix-switzerland", "offeneregister-germany", "bolagsverket-sweden",
  "ytj-finland", "atoka-italy", "borme-spain", "kvk-netherlands", "kbo-belgium", "opencorporates",
] as const;
export type RegistryId = (typeof REGISTRY_IDS)[number];

export const RANDOM_DISCOVERY_REGISTRIES = [
  "sec-edgar", "companies-house", "brreg", "ares-czechia", "bodacc-france", "gleif",
  "cvr-denmark", "zefix-switzerland", "offeneregister-germany", "bolagsverket-sweden",
  "ytj-finland", "atoka-italy", "borme-spain", "kvk-netherlands", "kbo-belgium",
] as const satisfies readonly RegistryId[];

export function getRandomDiscoveryRegistries(): RegistryId[] {
  return RANDOM_DISCOVERY_REGISTRIES.filter(
    (registry) => registry !== "companies-house" || Boolean(process.env["COMPANIES_HOUSE_API_KEY"]),
  );
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

async function searchOpenCorporates(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> {
  const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(query)}&per_page=${Math.min(limit, 20)}&order=score`;
  const resp = await registryFetch("registry", url, {
    headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Intelligence-Platform" },
    signal: createRegistryRequestSignal(signal, 10_000),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`OpenCorporates ${resp.status}: ${body.slice(0, 200) || resp.statusText}`);
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
async function searchOffeneregisterGermany(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const sql = `SELECT id, current_name, registered_address, company_type_code, jurisdiction_code, current_status FROM companies WHERE current_name LIKE '%${query.replace(/'/g, "''")}%' LIMIT ${Math.min(limit, 20)}`; const url = `https://db.offeneregister.de/handelsregister.json?sql=${encodeURIComponent(sql)}`; const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 15_000) }); if (!resp.ok) throw new Error(`Offeneregister Germany HTTP ${resp.status}`); const data = (await resp.json()) as any; const rows: any[] = data?.rows ?? []; const columns: string[] = data?.columns ?? []; const results: RegistryResult[] = []; for (const row of rows) { const get = (col: string) => { const i = columns.indexOf(col); return i >= 0 ? row[i] : null; }; const name: string = get("current_name") ?? ""; if (!name) continue; const address: string = get("registered_address") ?? ""; const companyType: string = get("company_type_code") ?? ""; const jurisdiction: string = get("jurisdiction_code") ?? ""; const status: string = get("current_status") ?? ""; const id: string = get("id") ?? ""; results.push({ name, type: "Corporation", nationality: "DE", knownResidences: address || undefined, sourceRegistries: JSON.stringify(["Handelsregister Germany (offeneregister.de)"]), notes: [companyType ? `Type: ${companyType}` : null, jurisdiction ? `Court: ${jurisdiction}` : null, status ? `Status: ${status}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "offeneregister-germany", id, companyType, jurisdiction, status, offeneregisterUrl: id ? `https://offeneregister.de/companies/${id}` : null }) }); } return results; }
async function searchBolagsverketSweden(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const url = `https://www.allabolag.se/api/search/company?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`; const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)", "X-Requested-With": "XMLHttpRequest" }, signal: createRegistryRequestSignal(signal, 12_000) }); if (!resp.ok) throw new Error(`Allabolag ${resp.status}`); const data = (await resp.json()) as any; const hits: any[] = data?.hits ?? data?.results ?? data?.companies ?? []; const results: RegistryResult[] = []; for (const hit of hits.slice(0, limit)) { const name: string = hit?.name ?? hit?.companyName ?? ""; if (!name) continue; const orgNumber: string = hit?.orgNumber ?? hit?.organizationNumber ?? hit?.org_number ?? ""; const city: string = hit?.city ?? hit?.municipality ?? ""; const status: string = hit?.status ?? ""; const legalForm: string = hit?.legalForm ?? hit?.legal_form ?? ""; const address = [hit?.address, city, "Sweden"].filter(Boolean).join(", "); results.push({ name, type: "Corporation", nationality: "SE", knownResidences: address || city ? address : undefined, sourceRegistries: JSON.stringify(["Bolagsverket Sweden"]), notes: [orgNumber ? `Org: ${orgNumber}` : null, legalForm ? `Form: ${legalForm}` : null, status ? `Status: ${status}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "bolagsverket-sweden", orgNumber, legalForm, status, city }) }); } return results; }
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
    const url = `https://startup.registroimprese.it/isin/api/v1/startup/search?text=${encodeURIComponent(query)}&lang=en&page=0&size=${Math.min(limit, 10)}`;
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
async function searchBormeSpain(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const results: RegistryResult[] = []; const seen = new Set<string>(); const url = `https://boe.es/buscar/api.php?collection=BORME&q=${encodeURIComponent(query)}&lang=es&hits=${Math.min(limit * 2, 20)}`; const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 5_000) }); if (!resp.ok) throw new Error(`BORME Spain HTTP ${resp.status}`); const data = (await resp.json()) as any; const items: any[] = data?.response?.results?.result ?? data?.items ?? []; for (const item of items) { const raw: string = item?.titulo ?? item?.title ?? item?.descripcion ?? ""; if (!raw) continue; const name = raw.replace(/^[A-ZÁÉÍÓÚ\s]+:\s+/u, "").split(/[,;]/)[0]?.trim() ?? raw; if (!name || seen.has(name.toLowerCase())) continue; seen.add(name.toLowerCase()); const pubDate: string = item?.fecha ?? item?.date ?? ""; const section: string = item?.seccion ?? ""; const idBoe: string = item?.identificador ?? item?.id ?? ""; results.push({ name, type: "Corporation", nationality: "ES", knownResidences: "Spain", sourceRegistries: JSON.stringify(["BORME Spain (BOE)"]), notes: [pubDate ? `Published: ${pubDate}` : null, section ? `Section: ${section}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "borme-spain", boeId: idBoe, pubDate, section, boeUrl: idBoe ? `https://www.boe.es/boe/dias/${pubDate?.replace(/-/g, "/")}/pdfs/${idBoe}.pdf` : null }) }); if (results.length >= limit) break; } return results; }
async function searchKvkNetherlands(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const url = `https://api.openkvk.nl/api/v2/companies?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`; const resp = await registryFetch("registry", url, { headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)", Origin: "https://www.openkvk.nl", Referer: "https://www.openkvk.nl/" }, signal: createRegistryRequestSignal(signal, 5_000) }); if (!resp.ok) throw new Error(`KvK Netherlands HTTP ${resp.status}`); const data = (await resp.json()) as any; const items: any[] = data?.data ?? data?.results ?? data?.companies ?? (Array.isArray(data) ? data : []); const results: RegistryResult[] = []; for (const item of items.slice(0, limit)) { const name: string = item?.naam ?? item?.name ?? item?.company_name ?? ""; if (!name) continue; const kvkNumber: string = item?.kvk ?? item?.kvk_nummer ?? item?.kvknummer ?? item?.id ?? ""; const city: string = item?.stad ?? item?.city ?? item?.vestigingsplaats ?? ""; const address = [item?.adres ?? item?.address, item?.postcode ?? item?.zip, city, "Netherlands"].filter(Boolean).join(", "); const legalForm: string = item?.rechtsvorm ?? item?.legal_form ?? ""; const sbi: string = item?.sbi_code ?? ""; results.push({ name, type: "Corporation", nationality: "NL", knownResidences: address || undefined, sourceRegistries: JSON.stringify(["KvK Netherlands (openkvk.nl)"]), notes: [kvkNumber ? `KvK: ${kvkNumber}` : null, legalForm ? `Form: ${legalForm}` : null, sbi ? `SBI: ${sbi}` : null].filter(Boolean).join(" | "), metadata: JSON.stringify({ source: "kvk-netherlands", kvkNumber, legalForm, city, sbi }) }); } return results; }
async function searchKboBelgium(query: string, limit: number, signal?: AbortSignal): Promise<RegistryResult[]> { const results: RegistryResult[] = []; const url = `https://kbopub.economie.fgov.be/kbopub/zoeknaamfonetischform.html?lang=nl&searchWord=${encodeURIComponent(query)}&pstcdeNummer=&postgemeente=&gemeente=&typeVennootschap=&status=&startdatum=&einddatum=&numberOfResults=${Math.min(limit, 10)}&resultaat=`; const resp = await registryFetch("registry", url, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only)" }, signal: createRegistryRequestSignal(signal, 5_000) }); if (!resp.ok) throw new Error(`KBO Belgium HTTP ${resp.status}`); const html = await resp.text(); const rowRe = /href="[^"]*ondernemingsnummer=(\d+)[^"]*"\s*>([^<]+)<\/a>/g; const cityRe = /class="resultaatValue"[^>]*>([^<]{3,40})<\/td>/g; let m: RegExpExecArray | null; const cities: string[] = []; let cityMatch; while ((cityMatch = cityRe.exec(html)) !== null) cities.push((cityMatch[1] ?? "").trim()); let idx = 0; while ((m = rowRe.exec(html)) !== null && results.length < limit) { const enterpriseNumber = m[1] ?? ""; const name = (m[2] ?? "").trim(); if (!name || name.length < 2) { idx++; continue; } const city = cities[idx * 2 + 1] ?? cities[idx] ?? ""; results.push({ name, type: "Corporation", nationality: "BE", knownResidences: city ? `${city}, Belgium` : "Belgium", sourceRegistries: JSON.stringify(["KBO Belgium"]), notes: enterpriseNumber ? `KBO: ${enterpriseNumber.replace(/(\d{4})(\d{3})(\d{3})/, "$1.$2.$3")}` : undefined, metadata: JSON.stringify({ source: "kbo-belgium", enterpriseNumber, city, kboUrl: enterpriseNumber ? `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${enterpriseNumber}` : null }) }); idx++; } return results; }

export async function searchRegistry(params: RegistrySearchParams): Promise<RegistryResult[]> {
  const { query, registry, limit = 10, signal } = params;
  if (signal?.aborted) throw new Error("cancelled");
  if (!query.trim()) throw new Error("Search query cannot be empty.");
  const normalizedRegistry = normalizeRegistryId(registry);
  if (!normalizedRegistry) throw new Error(`Unknown registry: "${registry}". Use one of: ${REGISTRY_IDS.join(", ")}.`);
  let results: RegistryResult[];
  if (normalizedRegistry === "opencorporates") results = await searchOpenCorporates(query.trim(), limit, signal);
  else if (normalizedRegistry === "companies-house") {
    const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
    if (!apiKey) throw new Error("COMPANIES_HOUSE_API_KEY is not configured. Register for a free key at https://developer.company-information.service.gov.uk/ and set it as an environment variable.");
    results = await searchCompaniesHouse(query.trim(), apiKey, limit, signal);
  } else if (normalizedRegistry === "sec-edgar") results = await searchSecEdgar(query.trim(), limit, signal);
  else if (normalizedRegistry === "gleif") { const gleifResults = await searchGleif(query.trim(), limit, signal); results = gleifResults.map((r) => ({ name: r.name, type: r.type, nationality: r.nationality, knownResidences: r.knownResidences, sourceRegistries: r.sourceRegistries, notes: r.notes, metadata: r.metadata })); }
  else if (normalizedRegistry === "brreg") results = await searchBrreg(query.trim(), limit, signal);
  else if (normalizedRegistry === "ares-czechia") results = await searchAres(query.trim(), limit, signal);
  else if (normalizedRegistry === "bodacc-france") results = await searchBodacc(query.trim(), limit, signal);
  else if (normalizedRegistry === "cvr-denmark") results = await searchCvrDenmark(query.trim(), limit, signal);
  else if (normalizedRegistry === "zefix-switzerland") results = await searchZefixSwitzerland(query.trim(), limit, signal);
  else if (normalizedRegistry === "offeneregister-germany") results = await searchOffeneregisterGermany(query.trim(), limit, signal);
  else if (normalizedRegistry === "bolagsverket-sweden") results = await searchBolagsverketSweden(query.trim(), limit, signal);
  else if (normalizedRegistry === "ytj-finland") results = await searchYtjFinland(query.trim(), limit, signal);
  else if (normalizedRegistry === "atoka-italy") results = await searchAtokaItaly(query.trim(), limit, signal);
  else if (normalizedRegistry === "borme-spain") results = await searchBormeSpain(query.trim(), limit, signal);
  else if (normalizedRegistry === "kvk-netherlands") results = await searchKvkNetherlands(query.trim(), limit, signal);
  else if (normalizedRegistry === "kbo-belgium") results = await searchKboBelgium(query.trim(), limit, signal);
  else throw new Error(`Unknown registry: "${registry}". Use one of: ${REGISTRY_IDS.join(", ")}.`);
  if (signal?.aborted) throw new Error("cancelled");
  return results;
}
