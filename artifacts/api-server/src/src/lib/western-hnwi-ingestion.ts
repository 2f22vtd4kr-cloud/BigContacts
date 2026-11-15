/**
 * Western HNWI Mass Ingestion Engine — LIVE PUBLIC REGISTRY DATA
 *
 * Discovers reviewable leads from public government registries:
 *   • SEC EDGAR SC 13D/G  — beneficial-ownership filing subjects; identity, current ownership, and wealth require verification
 *   • SEC EDGAR DEF 14A   — corporate proxy filers and named officers; role alone does not prove personal gatekeeper value
 *   • BRREG Norway        — Norwegian company/director records (Enhetsregisteret)
 *   • Companies House UK  — officer/PSC records (requires COMPANIES_HOUSE_API_KEY)
 *
 * No synthetic profiles are generated. A public record is provenance for a lead,
 * not proof of wealth, personal access, current activity, or every derived field.
 * Each record receives a conservative ranking prior, a neutral reachability score
 * until a direct public contact route is observed, and explicit source attribution.
 *
 * Redis Upstash dedup set prevents re-insertion across restarts.
 * Batch inserts (100 rows) keep DB pressure manageable.
 */

import { createHash } from "node:crypto";
import { db, entitiesTable, assetsTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import type { InsertEntity, InsertAsset } from "@workspace/db";
import { computeBayesianScore } from "./bayesian-scorer";
import { isDuplicate, batchMarkSeen, updateJob, appendJobLog } from "./job-queue";
import { deriveRegistryIngestionAssessment, filterRegistryIngestionBatchRows, registryPersonCandidateNames } from "./registry-ingestion-policy";
import { logger } from "./logger";
import { isStructurallyValidCandidateName } from "./llm-name-validator-policy";
import { validateRegistryCandidateNamesWithLLM } from "./llm-name-validator";
import {
  getRandomDiscoveryRegistries,
  normalizeUnverifiedRegistryType,
  searchRegistry,
  type RegistryId,
  type RegistryResult,
} from "./registry-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HarvestedPerson {
  name: string;
  entityType?: "PersonCandidate" | "Corporation" | "Trust" | "Other";
  nationality: string;
  location?: string;
  sourceRegistry: string;
  filingType?: string;
  role?: string;
  companyName?: string;
  rawMetadata: Record<string, unknown>;
  signals: {
    isLargeShareholder: boolean; // SC 13D/G filer — owns >5% of a public company
    isBoardDirector: boolean;
    isCompanyOfficer: boolean;
    hasRecentFiling: boolean;
    jurisdiction: string;        // ISO 2-letter
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name: string): string {
  return name.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** Reject only malformed/placeholders; preserve every usable Unicode candidate for model-led resolution. */
export function isPlaceholderRegistryName(name: string): boolean {
  return !isStructurallyValidCandidateName(name);
}

/**
 * EDGAR EFTS returns names in ALL-CAPS "LAST FIRST [MIDDLE]" format.
 * Detect and convert to "First [Middle] Last" title-case for display.
 * Non-ALL-CAPS names (already formatted) are title-cased in place.
 *
 * Examples:
 *   "THIEL PETER"         → "Peter Thiel"
 *   "KIM JAMES J"         → "James J Kim"
 *   "HO CHI SING"         → "Chi Sing Ho"
 *   "LEEDS RICHARD BRIAN" → "Richard Brian Leeds"
 *   "Warren Buffett"      → "Warren Buffett"  (unchanged)
 */
function normalizeEdgarName(raw: string): string {
  // Preserve registry order; name-part parsing and identity resolution belong
  // to the Investigator, not a first-token surname heuristic.
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toLocaleUpperCase());
}

/** @deprecated Legacy semantic classifier retained for rollback only; active harvesters must not call it. */
function looksLikePerson(name: string): boolean {
  // EDGAR display names use punctuation inconsistently: "L.P.", "Co.",
  // "S.A.", etc. Normalize separators before checking corporate suffixes so
  // investment vehicles are not harvested as people.
  // Also collapse "L P" (spaced LP — common EDGAR format) → "LP" so the regex catches it.
  const normalized = name
    .replace(/\bL\s+P\b/g, "LP")   // "Falls Investors L P" → "Falls Investors LP"
    .replace(/[.,/&()-]+/g, " ");
  const corporate = /\b(inc|llc|lp|ltd|limited|corp|corporate|co|fund|trust|capital|management|advisors|partners|holdings|group|associates|company|gmbh|ag|sa|sas|sarl|bv|nv|plc|llp|asa|ab|oy|as|enterprise|enterprises|electric|industries|systems|technologies|solutions|logistics|pharmaceuticals|healthcare|financial|bancorp|bancshares|motors|aerospace|energy|networks|communications|international|global|national|resources|properties|realty|infrastructure|united|workers|union|council|committee|coalition|alliance|federation|securitisation|secretarial|appoint|incorporated|services|ventures|consultancy|recruitment|employees|pension|retirement|municipal|government|authority|department|bureau|ministry|prefecture|prefecture|sheriff|police|fire|school|district|county|borough|township|parish|province|territory|state\s+of|city\s+of|town\s+of|port\s+of|university|college|institute|foundation|charity|nonprofit|non-profit|association|society|club|circle|resort|marina|marina|hotel|casino|restaurant|bistro|café|cafe|brasserie|winery|vineyard|gallery|museum|theatre|theater)\b/i;
  // Also reject if the name itself contains role or institutional words — these
  // appear in CH officer search results where the title field bleeds in
  // role metadata (e.g. "Victoria DIRECTOR", "Norfolk County Council NPLAW").
  const roleOrInstitutional = /\b(director|directors|secretary|council|nplaw|details|returned|services limited|two limited|the board)\b/i;
  // Reject abstract concept pairs that look like 2-word TitleCase names
  // (e.g. "Reducing Marginal", "Women Outpaces", "Increasing Returns")
  // Also reject imperative/modal verb starters ("Please Appoint", "Use Privacy")
  const abstractVerb = /^(reducing|increasing|improving|growing|developing|managing|providing|supporting|delivering|enabling|accelerating|leveraging|transforming|creating|building|driving|leading|connecting|advancing|promoting|protecting|expanding|ensuring|achieving|maximizing|minimizing|optimizing|streamlining|integrating|diversifying|please|appoint|use|visit|find|discover|explore|contact|subscribe|register|login|sign|click|read|view|get|learn|see|buy|hire|call|email)\b/i;
  // Reject names with ticker symbols (e.g. "Aramark (armk)")
  const hasTicker = /\([a-z]{2,6}\)$/i.test(name.trim());
  // Accept if no corporate/role keywords and has 2–5 words
  const wordCount = name.trim().split(/\s+/).length;
  return !corporate.test(normalized) && !roleOrInstitutional.test(name) && !abstractVerb.test(name) && !hasTicker && wordCount >= 2 && wordCount <= 6;
}

/**
 * Sanitise a CH officer name by stripping trailing role/title artefacts.
 * CH sometimes returns "John Smith DIRECTOR DETAILS RETURNED FOR" as the title.
 */
function sanitizeChName(raw: string): string {
  return raw
    .replace(/\s+(DIRECTOR|SECRETARY|OFFICER|DETAILS RETURNED FOR|DETAILS RETURNED).*$/i, "")
    .trim();
}

/** Person entity types that represent the same unresolved natural-person identity. */
const WESTERN_PERSON_ENTITY_TYPES = new Set(["PersonCandidate", "HNWI", "Gatekeeper"]);

/** Legacy HNWI/Gatekeeper rows and new PersonCandidate rows must dedupe across their review-state types. */
export function areCompatibleWesternRegistryEntityTypes(existingType: string, candidateType: string): boolean {
  const existingIsPerson = WESTERN_PERSON_ENTITY_TYPES.has(existingType);
  const candidateIsPerson = WESTERN_PERSON_ENTITY_TYPES.has(candidateType);
  return existingIsPerson && candidateIsPerson ? true : existingType === candidateType;
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableSerialize(record[key])).join(",") + "}";
}

/** Hash one source observation; equal names alone are never an identity or duplicate key. */
function sourceRecordFingerprint(name: string, jurisdiction: string, sourceRegistry: string, rawMetadata: Record<string, unknown>): string {
  const sourceRecord = {
    sourceRegistry: sourceRegistry.trim().toLocaleLowerCase(),
    jurisdiction: jurisdiction.trim().toUpperCase(),
    normalizedName: normalizeName(name),
    rawMetadata,
  };
  return createHash("sha256").update(stableSerialize(sourceRecord)).digest("hex");
}

/** Versioned source-record key: preserves same-name people and independent registry observations. */
function dedupKey(name: string, jurisdiction: string, sourceRegistry: string, rawMetadata: Record<string, unknown>, entityType: string = "PersonCandidate"): string {
  const canonicalType = WESTERN_PERSON_ENTITY_TYPES.has(entityType) ? "PersonCandidate" : entityType;
  return "western:v3:" + sourceRecordFingerprint(name, jurisdiction, sourceRegistry, rawMetadata) + ":" + canonicalType;
}

function westernRegistryEntitySourceKey(row: { name: string; metadata?: string | null; sourceRegistries?: string | null }): string | null {
  let metadata: Record<string, unknown> = {};
  try {
    const parsed = row.metadata ? JSON.parse(row.metadata) as unknown : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed as Record<string, unknown>;
  } catch { return null; }
  const storedFingerprint = metadata.sourceRecordFingerprint;
  if (typeof storedFingerprint === "string" && storedFingerprint.trim()) return "western:v3:" + storedFingerprint;

  let sourceRegistry = typeof metadata.sourceRegistry === "string" ? metadata.sourceRegistry : "";
  try {
    const parsedSources = row.sourceRegistries ? JSON.parse(row.sourceRegistries) as unknown : [];
    if (Array.isArray(parsedSources) && typeof parsedSources[0] === "string") sourceRegistry = parsedSources[0];
  } catch { /* use metadata source label when legacy JSON is malformed */ }
  const jurisdiction = typeof metadata.country === "string" ? metadata.country : "";
  if (!sourceRegistry || !jurisdiction) return null;

  const sourceMetadata = { ...metadata };
  for (const key of [
    "sourceRecordFingerprint", "lastVerified", "proximityScore", "country", "registryLocation",
    "nameValidationStatus", "hnwiQualificationStatus", "confidence", "lastObservedAt",
    "westernIngest", "liveSource", "needsEnrichment", "reviewOnly", "wealthStatus",
  ]) delete sourceMetadata[key];
  if (Object.keys(sourceMetadata).length === 0) return null;
  return "western:v3:" + sourceRecordFingerprint(row.name, jurisdiction, sourceRegistry, sourceMetadata);
}

// ── Harvester 1: SEC EDGAR SC 13D/G — US beneficial owners ──────────────────
//
// SC 13D/G filers are people or entities that own >5% of a public company.
// Individuals filing SC 13D are almost always billionaires or centimillionaires.
// EDGAR EFTS full-text search API — free, no key, up to 10 req/s.

const EDGAR_HEADERS = {
  Accept: "application/json",
  "User-Agent": "ApexFinder/1.0 OSINT-Research research@apexfinder.private",
};


/** Fisher–Yates shuffle — discovery must not always admit the same first SEC name. */
function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// Common phrases that appear in virtually all SC 13D/G filings — used as search
// anchors to enumerate filers without a specific person query.
const SC13_SEARCH_TERMS = [
  '"sole voting power"',
  '"aggregate beneficial ownership"',
  '"beneficial owner of"',
  '"shares of common stock beneficially"',
  '"right to acquire"',
];

async function* harvestSecEdgar13DG(maxCount: number): AsyncGenerator<HarvestedPerson> {
  let yielded = 0;
  const seen = new Set<string>();
  // Rotate term order + page start so the first admitted person is not always
  // the same SEC EFTS hit (e.g. a fixed "Andrew F Johnson" from from=0 of term 0).
  const terms = shuffleArray(SC13_SEARCH_TERMS);
  const pageStart = Math.floor(Math.random() * 40) * 10; // 0..390

  for (const term of terms) {
    if (yielded >= maxCount) break;

    // Paginate through results — EDGAR returns 10 per page by default
    for (let from = pageStart; from < pageStart + 5000 && yielded < maxCount; from += 10) {
      const url =
        `https://efts.sec.gov/LATEST/search-index` +
        `?q=${encodeURIComponent(term)}` +
        `&forms=SC+13D,SC+13G` +
        `&dateRange=custom&startdt=2015-01-01` +
        `&from=${from}`;

      let data: any;
      try {
        const resp = await fetch(url, {
          headers: EDGAR_HEADERS,
          signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) break;
        data = await resp.json();
      } catch {
        break;
      }

      const hits: any[] = data?.hits?.hits ?? [];
      if (hits.length === 0) break;

      for (const hit of hits) {
        if (yielded >= maxCount) break;
        const src = hit?._source ?? {};

        // EDGAR EFTS API uses display_names array: ["COMPANY (CIK xxx)", "PERSON NAME (CIK xxx)"]
        // Extract all person-like names AND the issuer company name from the array
        const displayNames: string[] = src?.display_names ?? [];
        const allCleanNames = displayNames.map((d: string) => d.replace(/\s*\(CIK\s*\d+\)\s*$/i, "").trim());
        const personNames = allCleanNames.filter((name: string) => isStructurallyValidCandidateName(name));
        // The issuer is the non-person display_name — the company whose stock is being reported on
        // Preserve the complete registry display-name set; the Investigator resolves issuer/person roles from source context.
        const companyIssuer: string | null = null;

        if (personNames.length === 0) continue;

        const formType: string = (src?.root_forms?.[0] ?? src?.form ?? "SC 13D").trim();
        const fileDate: string = src?.file_date ?? "";
        const bizLocation: string =
          (src?.biz_locations?.[0] ?? src?.inc_states?.[0] ?? "US").trim() || "US";

        for (const rawName of personNames) {
          if (yielded >= maxCount) break;
          const sourceRegistry = `SEC EDGAR — ${formType}`;
          const accession = String(hit?._id ?? src?.accession_number ?? src?.accessionNumber ?? "unidentified");
          const rawMetadata: Record<string, unknown> = {
            source: "sec-edgar",
            sourceRecordId: `sec-edgar:${accession}:${normalizeName(rawName)}`,
            formType,
            fileDate,
            bizLocation,
            entityName: rawName,
            displayNames: allCleanNames,
            ...(companyIssuer ? { companyName: companyIssuer } : {}),
            edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(rawName)}&CIK=&type=${formType}&dateb=&owner=include&count=10&search_text=&action=getcompany`,
          };
          const sourceKey = dedupKey(rawName, "US", sourceRegistry, rawMetadata);
          if (seen.has(sourceKey)) continue;
          seen.add(sourceKey);

          yielded++;
          yield {
            name: normalizeEdgarName(rawName),
            nationality: "American",
            location: bizLocation,
            sourceRegistry,
            filingType: formType,
            rawMetadata,
            signals: {
              isLargeShareholder: true,
              isBoardDirector: false,
              isCompanyOfficer: false,
              hasRecentFiling: fileDate >= "2022-01-01",
              jurisdiction: "US",
            },
          };
        }
      }

      await sleep(120); // respect EDGAR's 10 req/s limit
    }
  }
}

// ── Harvester 2: SEC EDGAR DEF 14A — company registrants ─────────────────────
//
// DEF 14A (proxy statements) list real directors and named executive officers
// of public US companies. These are confirmed high-level executives.

async function* harvestSecEdgarDEF14A(maxCount: number): AsyncGenerator<HarvestedPerson> {
  let yielded = 0;
  const seen = new Set<string>();
  const pageStart = Math.floor(Math.random() * 25) * 10; // sample a different slice between runs

  // Search all DEF 14A filings. Do not require a fixed English phrase to discover a registrant.
  for (let from = pageStart; from < pageStart + 2000 && yielded < maxCount; from += 10) {
    const url =
      `https://efts.sec.gov/LATEST/search-index` +
      `?forms=DEF+14A` +
      `&dateRange=custom&startdt=2018-01-01` +
      `&from=${from}`;

    let data: any;
    try {
      const resp = await fetch(url, {
        headers: EDGAR_HEADERS,
        signal: AbortSignal.timeout(15_000),
      });
      if (!resp.ok) break;
      data = await resp.json();
    } catch {
      break;
    }

    const hits: any[] = data?.hits?.hits ?? [];
    if (hits.length === 0) break;

    for (const hit of hits) {
      if (yielded >= maxCount) break;
      const src = hit?._source ?? {};
      const displayNames: string[] = src?.display_names ?? [];
      const displayName = displayNames[0] ?? "";
      const cik = displayName.match(/\(CIK\s*(\d+)\)/i)?.[1] ?? "";
      const rawName: string = displayName.replace(/\s*\(CIK\s*\d+\)\s*$/i, "").trim();
      if (!isStructurallyValidCandidateName(rawName)) continue;

      const fileDate: string = src?.file_date ?? "";
      const bizLocation: string =
        (src?.biz_locations?.[0] ?? src?.inc_states?.[0] ?? "US").trim() || "US";
      const sourceRegistry = "SEC EDGAR — DEF 14A (Proxy)";
      const accession = String(hit?._id ?? src?.accession_number ?? src?.accessionNumber ?? "");
      const rawMetadata: Record<string, unknown> = {
        source: "sec-edgar-def14a",
        sourceRecordId: "sec-def14a:" + accession + ":" + (cik || "unknown"),
        cik: cik || undefined,
        accessionNumber: accession || undefined,
        fileDate,
        bizLocation,
        entityName: rawName,
        displayNames,
      };
      const key = dedupKey(rawName, "US", sourceRegistry, rawMetadata, "Corporation");
      if (seen.has(key)) continue;
      seen.add(key);

      yielded++;
      yield {
        entityType: "Corporation",
        name: normalizeEdgarName(rawName),
        nationality: "American",
        location: bizLocation || "United States",
        sourceRegistry,
        role: "Company registrant (DEF 14A)",
        filingType: "DEF 14A",
        rawMetadata,
        signals: {
          isLargeShareholder: false,
          isBoardDirector: false,
          isCompanyOfficer: false,
          hasRecentFiling: fileDate >= "2021-01-01",
          jurisdiction: "US",
        },
      };
    }

    await sleep(120);
  }
}

// ── Harvester 3: BRREG Norway — Company directors (Enhetsregisteret) ─────────
//
// The Norwegian Business Registry (Brønnøysundregistrene) provides a free REST API
// with no authentication. Default municipalities are configurable; scope is not an eligibility rule.
// https://data.brreg.no/enhetsregisteret/api/

const BRREG_MUNICIPALITIES = [
  "0301", // Oslo
  "1201", // Bergen
  "5001", // Trondheim
  "1103", // Stavanger
  "4601", // Kristiansand
  "1505", // Ålesund
  "1804", // Bodø
];

const BRREG_ROLE_TRANSLATIONS: Record<string, string> = {
  STYR: "Board member",
  LEDE: "Chairman",
  NEST: "Deputy Chairman",
  MEDL: "Board member",
  VARA: "Deputy board member",
  REPR: "Representative",
  DAGL: "Chief Executive",
  KOMP: "General partner",
};

export function parseBrregMunicipalityScope(value?: string): Array<string | null> {
  const configured = value?.trim();
  if (!configured) return [...BRREG_MUNICIPALITIES];
  if (configured.toLowerCase() === "all") return [null];
  const codes = [...new Set(configured.split(",").map((code) => code.trim()).filter((code) => /^\d{4}$/u.test(code)))];
  return codes.length > 0 ? codes : [...BRREG_MUNICIPALITIES];
}

async function* harvestBRREGDirectors(maxCount: number): AsyncGenerator<HarvestedPerson> {
  let yielded = 0;
  const seen = new Set<string>();
  // Scope is operator-selectable: comma-separated municipality codes or "all".
  const municipalities = parseBrregMunicipalityScope(process.env.APEX_BRREG_MUNICIPALITIES);

  for (const municipality of municipalities) {
    if (yielded >= maxCount) break;

    // Fetch companies in this municipality
    for (let page = 0; page < 20 && yielded < maxCount; page++) {
      let companies: any[];
      try {
        const resp = await fetch(
          `https://data.brreg.no/enhetsregisteret/api/enheter?${new URLSearchParams({
            ...(municipality ? { kommunenummer: municipality } : {}),
            size: "50",
            page: String(page),
          }).toString()}`,
          {
            headers: { Accept: "application/json", "User-Agent": "ApexFinder/1.0" },
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (!resp.ok) break;
        const data = (await resp.json()) as any;
        companies = data?._embedded?.enheter ?? [];
        if (companies.length === 0) break;
      } catch {
        break;
      }

      for (const company of companies) {
        if (yielded >= maxCount) break;
        const orgnr: string = company?.organisasjonsnummer;
        if (!orgnr) continue;

        // Preserve organization form and employee count as source context.
        // They are prioritization signals for the Investigator, never eligibility gates.
        const orgForm: string = company?.organisasjonsform?.kode ?? "";
        const employees: number = company?.antallAnsatte ?? 0;

        const companyName: string = company?.navn ?? "Unknown Company";
        const city: string =
          company?.forretningsadresse?.poststed ??
          company?.postadresse?.poststed ??
          "Norway";

        // Fetch this company's directors/board
        let rolesData: any;
        try {
          const rolesResp = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}/roller`,
            {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(8_000),
            },
          );
          if (!rolesResp.ok) continue;
          rolesData = await rolesResp.json();
        } catch {
          continue;
        }

        const rollegrupper: any[] = rolesData?.rollegrupper ?? [];

        for (const gruppe of rollegrupper) {
          const groupCode: string = gruppe?.type?.kode ?? "";
          const groupDesc: string =
            BRREG_ROLE_TRANSLATIONS[groupCode] ?? gruppe?.type?.beskrivelse ?? groupCode;

          const roller: any[] = gruppe?.roller ?? [];

          for (const rolle of roller) {
            if (yielded >= maxCount) break;

            const person = rolle?.person;
            if (!person) continue;

            const navn = person?.navn;
            if (!navn) continue;

            const fullName = [navn.fornavn, navn.mellomnavn, navn.etternavn]
              .filter(Boolean)
              .join(" ")
              .trim();

            if (!isStructurallyValidCandidateName(fullName)) continue;

            const roleCode: string = rolle?.type?.kode ?? "";
            const roleDesc: string =
              BRREG_ROLE_TRANSLATIONS[roleCode] ?? rolle?.type?.beskrivelse ?? roleCode;

            const sourceRegistry = "BRREG Norway — Enhetsregisteret";
            const rawMetadata: Record<string, unknown> = {
              source: "brreg-norway",
              sourceRecordId: "brreg:" + orgnr + ":" + roleCode + ":" + normalizeName(fullName),
              orgnr,
              companyName,
              municipality,
              city,
              organizationForm: orgForm,
              employeeCount: employees,
              roleCode,
              roleDesc,
              groupCode,
              groupDesc,
              brregUrl: "https://www.brreg.no/company/" + orgnr + "/",
            };
            const key = dedupKey(fullName, "NO", sourceRegistry, rawMetadata);
            if (seen.has(key)) continue;
            seen.add(key);

            yielded++;
            yield {
              name: fullName,
              nationality: "Norwegian",
              location: city,
              sourceRegistry,
              role: roleDesc,
              companyName,
              rawMetadata,
              signals: {
                isLargeShareholder: false,
                isBoardDirector: false, // role codes remain in rawMetadata for model interpretation
                isCompanyOfficer: true,
                hasRecentFiling: true, // BRREG is always current
                jurisdiction: "NO",
              },
            };
          }
        }

        await sleep(80); // be kind to BRREG
      }
    }
  }
}

// ── Harvester 4: Companies House UK — Officers (optional, key required) ───────
//
// Companies House UK provides a free REST API for searching officers (directors,
// secretaries, PSCs). Requires a free API key registered at:
// https://developer.company-information.service.gov.uk/
//
// If COMPANIES_HOUSE_API_KEY is not set, this harvester silently yields nothing.

const CH_OFFICER_QUERIES = [
  "director",
  "managing director",
  "chief executive",
  "chairman",
  "non-executive",
  "person with significant control",
];

async function* harvestCompaniesHouseOfficers(maxCount: number): AsyncGenerator<HarvestedPerson> {
  const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
  if (!apiKey) return;

  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
  let yielded = 0;
  const seen = new Set<string>();

  for (const query of CH_OFFICER_QUERIES) {
    if (yielded >= maxCount) break;

    for (let start = 0; start < 1000 && yielded < maxCount; start += 20) {
      let data: any;
      try {
        const resp = await fetch(
          `https://api.company-information.service.gov.uk/search/officers` +
            `?q=${encodeURIComponent(query)}&items_per_page=20&start_index=${start}`,
          {
            headers: { Authorization: auth, Accept: "application/json" },
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (!resp.ok) break;
        data = await resp.json();
      } catch {
        break;
      }

      const items: any[] = data?.items ?? [];
      if (items.length === 0) break;

      for (const item of items) {
        if (yielded >= maxCount) break;

        const rawName: string = sanitizeChName((item?.title ?? "").trim());
        if (!rawName) continue;

        // Keep structurally valid names for the batch LLM name-shape check; do not pre-judge personhood with English keywords.
        if (!isStructurallyValidCandidateName(rawName)) continue;

        const sourceRegistry = "Companies House UK — Officers Register";
        const chUrl = item?.links?.self
          ? "https://find-and-update.company-information.service.gov.uk" + item.links.self
          : undefined;
        const rawMetadata: Record<string, unknown> = {
          source: "companies-house-officers",
          sourceRecordId: chUrl,
          officerRole: item?.officer_role,
          nationality: item?.nationality,
          occupation: item?.occupation,
          appointedOn: item?.appointed_on,
          dateOfBirth: item?.date_of_birth
            ? `${item.date_of_birth.month}/${item.date_of_birth.year}`
            : undefined,
          chUrl,
        };
        const key = dedupKey(rawName, "GB", sourceRegistry, rawMetadata);
        if (seen.has(key)) continue;
        seen.add(key);

        const addr = item?.address;
        const location = addr
          ? [addr.locality, addr.region, addr.country].filter(Boolean).join(", ")
          : "United Kingdom";

        yielded++;
        yield {
          name: rawName,
          nationality: item?.nationality ?? "British",
          location,
          sourceRegistry,
          role: item?.officer_role,
          rawMetadata,
          signals: {
            isLargeShareholder: false,
            // Preserve the source role verbatim; the Investigator interprets whether it is a board role.
            isBoardDirector: false,
            isCompanyOfficer: true,
            hasRecentFiling: (item?.appointed_on ?? "") >= "2018-01-01",
            jurisdiction: "GB",
          },
        };
      }

      await sleep(250); // Companies House rate limit is conservative
    }
  }
}

// ── Record builder — HarvestedPerson → InsertEntity ──────────────────────────

/** @deprecated Legacy keyword classifier retained for rollback only; active discovery must use contextual model judgement. */
export function classifyEntityType(name: string): "HNWI" | "Corporation" | "Trust" {
  const n = name.trim();
  // Trusts and foundations first (highest specificity)
  if (/\b(Trust|Trustee|Foundation|Fiduciary|Settlement|Estate\s+of)\b/i.test(n)) return "Trust";
  // Search snippets and registry feeds can surface a person's role next to an
  // organization name. These are never valid HNWI identities; callers that
  // retain the record for review must quarantine it rather than promote it.
  if (/\b(advisor|associate|chairman|chairwoman|chief|director|deputy|executive|founder|general|manager|officer|operator|owner|partner|president|principal|trustee|vice|chair|secretary|controller)\s*$/i.test(n)) return "Corporation";
  // Explicit partnership / LP forms
  if (/\b(L\.?P\.?|LLP|Limited\s+Partnership|General\s+Partnership)\b/i.test(n)) return "Corporation";
  // Corporate-suffix identifiers (trailing \b removed for dot-ending suffixes like S.A., B.V.)
  if (/\b(Inc\.?|Corp\.?|Ltd\.?|LLC|L\.?L\.?C\.?|PLC|Oyj|S\.A\.|S\.p\.A\.|GmbH|B\.V\.|N\.V\.)(?:[^a-zA-Z0-9]|$)/i.test(n)) return "Corporation";
  if (/\bCo\b\.?(\s|$)/i.test(n) && !/^[A-Z][a-z]+ [A-Z][a-z]+ Co\b/.test(n)) return "Corporation"; // "Callon Petroleum Co" not "Smith Brown Co"
  // Industry / fund / financial keywords — never an individual
  if (/\b(Fund|Capital\s+(?:Partners|Management|Advisors|Group)|Venture\s+Capital|Ventures|Holdings|Management|Advisors|Consulting|Partners|Acquisition|Petroleum|Energy|Pharmaceutical|Biotechnology|Technologies|Solutions|Sciences|Industries|Properties|Realty|Entertainment|Media|Analytics|Logistics|Transportation|Shipping|Shipyard|Maritime|Freight|Marine|Enterprises|Associates|Financial\s+(?:Group|Partners|Services)|Investments|Aeronautica|Aeronautics|Crossover|Participacoes|Participations|Beteiligungen|Inversiones|Rentas)\b/i.test(n)) return "Corporation";
  // Banks and financial institutions
  if (/\b(Banc(?:orp|shares?|o)?|Bancshares|Bank(?:ers?|corp|shares)?)\b/i.test(n)) return "Corporation";
  // Committee / political / governance entities
  if (/\b(Committee|Commission|Shareholders?|Congressional|Pension\s+(?:Fund|Plan|Board))\b/i.test(n)) return "Corporation";
  // SEC state-of-incorporation suffixes: "/DE/", "/NV/", "/MD/" etc.
  if (/\/[A-Z]{2}\/$/.test(n)) return "Corporation";
  // Ticker symbol pattern: name ends with "(ABC)", "(ABC, DEF)", "(MS, MS-PA, MS-PE)" — SEC company names
  if (/\s+\([A-Z]{1,5}(?:-[A-Z]{1,3})?(?:,\s*[A-Z]{1,5}(?:-[A-Z]{1,3})?)*\)\s*$/.test(n)) return "Corporation";
  // Government, regulatory, public agency
  if (/\b(Federal|Municipal|County\s+of|City\s+of|State\s+of|Department\s+of|Dept\.?\s+of|Authority|Administration|Agency)\b/i.test(n)) return "Corporation";
  // University / academic / non-profit markers
  if (/\b(University|College|Institute|Hospital|Medical\s+Center|Health\s+System|Church|Diocese|Synagogue|Mosque)\b/i.test(n)) return "Corporation";
  return "HNWI";
}

export function buildWesternRegistryPersonCandidate(person: HarvestedPerson): { entity: InsertEntity; key: string } {
  const sourceMetadata = { ...person.rawMetadata, ...(person.companyName ? { companyName: person.companyName } : {}) };
  const fingerprint = sourceRecordFingerprint(person.name, person.signals.jurisdiction, person.sourceRegistry, sourceMetadata);
  const entityType = person.entityType ?? "PersonCandidate";
  const canonicalType = WESTERN_PERSON_ENTITY_TYPES.has(entityType) ? "PersonCandidate" : entityType;
  const key = "western:v3:" + fingerprint + ":" + canonicalType;

  // Registry participation, officer roles and filings are discovery leads, not
  // adjudicated personal wealth or a verified contact route.
  // The source parser has already identified this as a person-role/registrant row.
  // Preserve it as a provisional candidate; neither a name heuristic nor a registry
  // filing is enough to assert HNWI qualification.
  const registryAssessment = deriveRegistryIngestionAssessment(entityType);
  const prior = registryAssessment.prior;
  const bayesianScore = computeBayesianScore(prior, {
    entityType,
    assetCount: 0,
    assetCategories: [],
    totalAssetValue: 0,
    hasRecentActivity: registryAssessment.hasRecentActivity,
    recentActivityDays: registryAssessment.recentActivityDays,
    networkDegree: 0,
    hasGatekeeperConnection: false,
    hasKnownInvestorConnection: false,
    hasShellCompany: false,
    hasAviationAsset: false,
    hasMarineAsset: false,
    hasClubMembership: false,
    hasLuxuryRealEstate: false,
    jurisdictionCount: 1,
  });

  // A role/filing does not establish direct reachability. A fetched registry
  // record gets a neutral route score until public contact evidence is observed.

  // This is a discovery lead, not an observed direct route. Keep any suggested
  // contact path in the Investigator's research context until a public route is
  // actually observed and attributed.
  let contactMethod: string;
  if (entityType === "Corporation") {
    contactMethod = "Public company registry lead — research officers, ownership and public contact channels";
  } else if (entityType === "Trust") {
    contactMethod = "Public trust registry lead — research trustees, control and public contact channels";
  } else if (person.signals.isLargeShareholder) {
    contactMethod = "Beneficial-ownership filing lead — individual identity and contact path not verified";
  } else if (person.signals.isBoardDirector) {
    contactMethod = "Board-role registry lead — direct contact path not observed";
  } else if (person.companyName) {
    contactMethod = "Company-officer registry lead — direct contact path not observed";
  } else {
    contactMethod = "Registry person candidate — no direct contact route observed";
  }

  const noteFragments: string[] = [
    `Source: ${person.sourceRegistry}.`,
    person.filingType ? `Filing type: ${person.filingType}.` : null,
    person.role ? `Role: ${person.role}.` : null,
    person.companyName ? `Company: ${person.companyName}.` : null,
  ].filter(Boolean) as string[];

  const entity: InsertEntity = {
    name: person.name,
    type: entityType,
    bayesianScore,
    nationality: person.nationality,
    estimatedNetWorth: null, // unknown until enriched via MCTS research
    knownResidences: null,
    linkedinUrl: null,
    phone: null,
    email: null,
    contactMethod,
    notes: noteFragments.join(" "),
    sourceRegistries: JSON.stringify([person.sourceRegistry]),
    metadata: JSON.stringify({
      ...sourceMetadata,
      sourceRecordFingerprint: fingerprint,
      lastVerified: undefined,
      proximityScore: registryAssessment.proximityScore,
      country: person.signals.jurisdiction,
      registryLocation: person.location ?? null,
      nameValidationStatus: "pending_investigator_resolution",
      hnwiQualificationStatus: "unverified",
      confidence: registryAssessment.confidence,
      lastObservedAt: registryAssessment.lastObservedAt,
      westernIngest: true,
      liveSource: true,   // source is real; it does not establish the claims by itself
      needsEnrichment: true, // flag for model-directed research
      ...(person.companyName ? { companyName: person.companyName } : {}),
      reviewOnly: registryAssessment.reviewOnly,
      wealthStatus: registryAssessment.wealthStatus,
    }),
    // Filing/shareholder evidence contributes to Signal, not personal access.
    isHot: false,
  };

  return { entity, key };
}

const RANDOM_REGISTRY_QUERIES = [
  "holdings",
  "capital",
  "investments",
  "management",
  "group",
  "properties",
  "technology",
  "energy",
  "partners",
  "consulting",
  "international",
  "real estate",
] as const;

function pickRandom<T>(values: readonly T[]): T | undefined {
  return values[Math.floor(Math.random() * values.length)];
}

function buildRegistryEntity(
  result: RegistryResult,
  registry: RegistryId,
): { entity: InsertEntity; key: string } {
  const jurisdiction = (result.nationality ?? "XX").slice(0, 2).toUpperCase();
  // Defend the persistence boundary even if a caller supplies a legacy class.
  const persistedType = normalizeUnverifiedRegistryType(result.type);
  const isPerson = persistedType === "PersonCandidate";
  const registryAssessment = deriveRegistryIngestionAssessment(persistedType);
  const prior = registryAssessment.prior;
  const bayesianScore = computeBayesianScore(prior, {
    entityType: persistedType,
    assetCount: 0,
    assetCategories: [],
    totalAssetValue: 0,
    hasRecentActivity: registryAssessment.hasRecentActivity,
    recentActivityDays: registryAssessment.recentActivityDays,
    networkDegree: 0,
    hasGatekeeperConnection: registryAssessment.hasGatekeeperConnection,
    hasKnownInvestorConnection: false,
    hasShellCompany: false,
    hasAviationAsset: false,
    hasMarineAsset: false,
    hasClubMembership: false,
    hasLuxuryRealEstate: false,
    jurisdictionCount: 1,
  });
  const sourceLabel = (() => {
    try {
      const parsed = JSON.parse(result.sourceRegistries || "[]");
      return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : registry;
    } catch {
      return registry;
    }
  })();
  const rawMetadata = (() => {
    try {
      const parsed = JSON.parse(result.metadata ?? "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  })();
  const fingerprint = sourceRecordFingerprint(result.name, jurisdiction, sourceLabel, rawMetadata);
  const canonicalType = WESTERN_PERSON_ENTITY_TYPES.has(persistedType) ? "PersonCandidate" : persistedType;

  return {
    key: "western:v3:" + fingerprint + ":" + canonicalType,
    entity: {
      name: result.name,
      type: persistedType,
      bayesianScore,
      nationality: result.nationality ?? null,
      estimatedNetWorth: null,
      knownResidences: result.knownResidences ?? null,
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: isPerson
        ? "Public registry record — research for a validated person-level contact path"
        : "Public registry company record — research officers, ownership, and public contact channels",
      notes: [
        `Random discovery source: ${sourceLabel}.`,
        result.notes ?? null,
        "Registry evidence is a lead, not proof of wealth or beneficial ownership.",
      ].filter(Boolean).join(" "),
      sourceRegistries: result.sourceRegistries,
      metadata: JSON.stringify({
        ...rawMetadata,
        sourceRecordFingerprint: fingerprint,
        lastVerified: undefined,
        source: rawMetadata.source ?? registry,
        registryId: registry,
        randomDiscovery: true,
        liveSource: true,
        westernIngest: true,
        needsEnrichment: true,
        proximityScore: registryAssessment.proximityScore,
        confidence: registryAssessment.confidence,
        lastObservedAt: registryAssessment.lastObservedAt,
        reviewOnly: registryAssessment.reviewOnly,
        wealthStatus: registryAssessment.wealthStatus,
      }),
      isHot: false,
    },
  };
}

// ── Main ingestion function ───────────────────────────────────────────────────

export interface IngestionOptions {
  targetCount: number;
  batchSize?: number;
  jobId?: string;
  /**
   * When true (Atlas single-target / small discovery admission), skip the
   * random live-registry company mix and only insert person-typed records
   * from officer/director/shareholder harvesters. Prevents corporate shells
   * (e.g. BODACC "Partners" / Danish ApS) from consuming a 1-target budget
   * before any individual is admitted.
   */
  preferPersons?: boolean;
}

export interface IngestionResult {
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

export async function runWesternHnwiIngestion(opts: IngestionOptions): Promise<IngestionResult> {
  const { targetCount, batchSize = 100, jobId } = opts;
  // Small Atlas admission budgets must not be burned on random company shells.
  const preferPersons = Boolean(opts.preferPersons);
  const t0 = Date.now();
  let inserted = 0, skipped = 0, errors = 0;


  const log = async (msg: string) => {
    logger.info(msg);
    if (jobId) await appendJobLog(jobId, msg);
  };

  const hasCompaniesHouseKey = !!process.env["COMPANIES_HOUSE_API_KEY"];
  const randomDiscoveryRegistries = getRandomDiscoveryRegistries();
  const sources = [
    `Random registry mix (${randomDiscoveryRegistries.length} live adapters)`,
    "SEC EDGAR SC 13D/G (US beneficial owners)",
    "SEC EDGAR DEF 14A (US board directors)",
    "BRREG Norway (company directors)",
    ...(hasCompaniesHouseKey ? ["Companies House UK (officers)"] : []),
  ];

  await log(`Starting LIVE Western HNWI ingestion — target: ${targetCount.toLocaleString()} real records`);
  await log(`Sources: ${sources.join(" | ")}`);
  if (!hasCompaniesHouseKey) {
    await log(`Note: COMPANIES_HOUSE_API_KEY not set — UK Companies House harvester skipped`);
  }

  // ── Budget allocation ────────────────────────────────────────────────────────
  // SC 13D/G is the highest-quality source (real wealthy people) — give it the most budget.
  // Keep every source budget viable for a single-target Atlas round. Without
  // this floor, targetCount=1 rounded all budgets to zero and the supposedly
  // single-target round could admit nothing.
  const edgarBudget13D = targetCount > 0 ? Math.max(1, Math.floor(targetCount * 0.55)) : 0;
  const edgarBudgetDEF = Math.floor(targetCount * 0.25);
  const brregBudget = Math.floor(targetCount * 0.12);
  const chBudget = hasCompaniesHouseKey ? targetCount - edgarBudget13D - edgarBudgetDEF - brregBudget : 0;
  const edgarExtraBudget = !hasCompaniesHouseKey && targetCount > 1
    ? targetCount - edgarBudget13D - edgarBudgetDEF - brregBudget
    : 0;

  const harvesters: [AsyncGenerator<HarvestedPerson>, string][] = shuffleArray([
    [harvestSecEdgar13DG(edgarBudget13D + edgarExtraBudget), "SEC EDGAR SC 13D/G"],
    [harvestSecEdgarDEF14A(edgarBudgetDEF), "SEC EDGAR DEF 14A"],
    [harvestBRREGDirectors(brregBudget), "BRREG Norway"],
    ...(hasCompaniesHouseKey
      ? [[harvestCompaniesHouseOfficers(chBudget), "Companies House UK"] as [AsyncGenerator<HarvestedPerson>, string]]
      : []),
  ]);

  // ── Batch state ──────────────────────────────────────────────────────────────
  let entityBatch: InsertEntity[] = [];
  let entityBatchKeys: string[] = [];
  const seenBatchKeys = new Set<string>();

  const flushBatch = async () => {
    if (entityBatch.length === 0) return;
    try {
      // Registry source schemas identify person-role records before this point.
      // Mass seeding preserves provisional candidates; canonical Investigator
      // later resolves identity, role, relationships and HNWI qualification.
      const paired = entityBatch.map((entity, index) => ({ entity, key: entityBatchKeys[index] ?? "" }));
      const personNames = registryPersonCandidateNames(entityBatch);
      const structuralNames = new Set(personNames.filter(isStructurallyValidCandidateName));
      const nameValidation = await validateRegistryCandidateNamesWithLLM(personNames);
      // Provider failure is not a negative judgment: retain only structurally
      // usable source-designated people as review-only candidates, and record
      // that the model check was unavailable. A successful empty response is
      // a real model rejection and does not persist those person rows.
      const validNames = nameValidation.status === "validated"
        ? new Set(nameValidation.validNames)
        : structuralNames;
      const retainedEntities = new Set(filterRegistryIngestionBatchRows(entityBatch, validNames, preferPersons));
      const usable = paired.filter(({ entity }) =>
        retainedEntities.has(entity) && isStructurallyValidCandidateName(entity.name),
      );
      const usableKeys = usable.map(({ key }) => key).filter(Boolean);
      const seenSourceRecords = new Set<string>();
      const deduped = usable.filter(({ key }) => {
        if (seenSourceRecords.has(key)) return false;
        seenSourceRecords.add(key);
        return true;
      }).map(({ entity }) => entity);

      const rowsToInsert = deduped.map((row) => {
        if (row.type !== "PersonCandidate") return row;
        let metadata: Record<string, unknown> = {};
        try { metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}; } catch { /* retain source row; replace malformed metadata safely */ }
        return {
          ...row,
          metadata: JSON.stringify({
            ...metadata,
            nameValidationStatus: nameValidation.status === "validated"
              ? "model_name_shape_checked_pending_identity_resolution"
              : "provider_unavailable_structural_only_pending_identity_resolution",
            hnwiQualificationStatus: "unverified",
            reviewOnly: true,
          }),
        };
      });

      const result = await db.transaction(async (tx) => {
        if (rowsToInsert.length === 0) return { insertedCount: 0, existingCount: 0 };
        const names = [...new Set(rowsToInsert.map((row) => row.name))];
        const existing = await tx.select({
          name: entitiesTable.name,
          type: entitiesTable.type,
          metadata: entitiesTable.metadata,
          sourceRegistries: entitiesTable.sourceRegistries,
        }).from(entitiesTable).where(inArray(entitiesTable.name, names));
        const batchKeys = new Set<string>();
        const fresh = rowsToInsert.filter((row) => {
          const sourceKey = westernRegistryEntitySourceKey(row);
          if (!sourceKey) return true; // no exact source identity: preserve rather than merge by name
          const alreadyPersisted = existing.some((prior) =>
            westernRegistryEntitySourceKey(prior) === sourceKey
            && areCompatibleWesternRegistryEntityTypes(prior.type, row.type),
          );
          const canonicalType = WESTERN_PERSON_ENTITY_TYPES.has(row.type) ? "PersonCandidate" : row.type;
          const batchKey = sourceKey + ":" + canonicalType;
          if (alreadyPersisted || batchKeys.has(batchKey)) return false;
          batchKeys.add(batchKey);
          return true;
        });
        const insertedRows = fresh.length > 0
          ? await tx.insert(entitiesTable).values(fresh).returning({ id: entitiesTable.id })
          : [];
        return { insertedCount: insertedRows.length, existingCount: rowsToInsert.length - fresh.length };
      });

      // Dedup state is committed only after the DB transaction succeeded.
      // If this write fails, the next run still has DB-level name dedup as a guard.
      if (usableKeys.length > 0) await batchMarkSeen(usableKeys);
      inserted += result.insertedCount;
      skipped += result.existingCount + (paired.length - usable.length) + (usable.length - deduped.length);
      entityBatch = [];
      entityBatchKeys = [];
    } catch (err: any) {
      errors += entityBatch.length;
      logger.error({ err: err.message, batchSize: entityBatch.length }, "Registry batch persistence failed; dedup keys were not committed");
      throw new Error(`Western registry batch persistence failed: ${err.message}`);
    }
  };

  // ── Random live-registry discovery pass ─────────────────────────────────────
  // The source itself is shuffled on every run. Query terms are deliberately
  // broad but bounded, so this creates a changing company/lead mix without
  // pretending that a registry hit proves wealth or ownership.
  //
  // CRITICAL: when preferPersons / small targetCount, budget is 0. Otherwise a
  // single BODACC/BRREG company shell fills targetCount=1 and person harvesters
  // never run — producing empty personal-contact OSINT.
  const randomDiscoveryBudget = preferPersons
    ? 0
    : Math.min(
        Math.max(12, Math.floor(targetCount * 0.15)),
        Math.max(0, targetCount),
        250,
      );
  const shuffledRegistries = [...randomDiscoveryRegistries].sort(() => Math.random() - 0.5);
  const randomQueryOrder = [...RANDOM_REGISTRY_QUERIES].sort(() => Math.random() - 0.5);
  let randomDiscoveryInserted = 0;

  for (const registry of shuffledRegistries) {
    if (randomDiscoveryInserted >= randomDiscoveryBudget || inserted >= targetCount) break;
    const query = pickRandom(randomQueryOrder) ?? "holdings";
    try {
      const results = await searchRegistry({
        registry,
        query,
        limit: Math.min(12, randomDiscoveryBudget - randomDiscoveryInserted),
      });
      await log(`[Random registry mix] ${registry} · "${query}" → ${results.length} result(s)`);
      for (const result of results) {
        if (
          randomDiscoveryInserted >= randomDiscoveryBudget ||
          inserted + entityBatch.length >= targetCount
        ) break;
        if (!result.name?.trim()) continue;
        if (isPlaceholderRegistryName(result.name)) {
          skipped++;
          continue;
        }
        const { entity, key } = buildRegistryEntity(result, registry);
        if (seenBatchKeys.has(key) || await isDuplicate(key)) {
          skipped++;
          continue;
        }
        seenBatchKeys.add(key);
        entityBatch.push(entity);
        entityBatchKeys.push(key);
        randomDiscoveryInserted++;
        if (entityBatch.length >= batchSize) await flushBatch();
      }
    } catch (err: any) {
      errors++;
      await log(`[Random registry mix] ${registry} unavailable: ${err?.message ?? "unknown error"}`);
    }
  }
  await flushBatch();
  await log(`[Random registry mix] Added ${randomDiscoveryInserted} candidate record(s) from shuffled live sources`);
  if (preferPersons) {
    await log(`[Admission] preferPersons=true — skipping corporate shells; officer/director/shareholder harvesters only`);
  }

  // ── Run harvesters sequentially ──────────────────────────────────────────────
  for (const [harvester, sourceName] of harvesters) {
    if (inserted + skipped >= targetCount * 3) break; // safety valve

    await log(`[${sourceName}] Harvesting…`);
    let sourceInserted = 0;

    for await (const person of harvester) {
      if (inserted >= targetCount) break;
      if (isPlaceholderRegistryName(person.name)) {
        skipped++;
        continue;
      }

      const { entity, key } = buildWesternRegistryPersonCandidate(person);

      if (seenBatchKeys.has(key) || await isDuplicate(key)) {
        skipped++;
        continue;
      }
      seenBatchKeys.add(key);

      entityBatch.push(entity);
      entityBatchKeys.push(key);
      sourceInserted++;

      if (entityBatch.length >= batchSize) {
        await flushBatch();

        const progress = Math.round((inserted / targetCount) * 100);
        if (jobId) {
          await updateJob(jobId, {
            inserted,
            skipped,
            errors,
            progress,
            message: `Inserted ${inserted.toLocaleString()} / ${targetCount.toLocaleString()} — source: ${sourceName}`,
          });
        }
        if (inserted % 500 === 0) {
          await log(`Progress: ${inserted.toLocaleString()} inserted, ${skipped} deduped | source: ${sourceName}`);
        }
      }
    }

    await flushBatch();
    await log(`[${sourceName}] Done — contributed ${sourceInserted} candidates`);
    if (inserted >= targetCount) break;
  }

  // Final flush
  await flushBatch();

  const durationMs = Date.now() - t0;
  await log(
    `Ingestion complete. Inserted: ${inserted.toLocaleString()}, Deduped: ${skipped}, Errors: ${errors}, Time: ${(durationMs / 1000).toFixed(1)}s`,
  );

  return { inserted, skipped, errors, durationMs };
}

/** Returns source breakdown for Field Manual stats */
export function getIngestionStats(): {
  sources: { name: string; description: string; jurisdiction: string; requiresKey: boolean }[];
} {
  return {
    sources: [
      {
        name: "Random live registry mix",
        description: "Bounded shuffled discovery across queryable registries; each hit remains a lead pending identity and ownership verification",
        jurisdiction: "Multi-jurisdiction",
        requiresKey: false,
      },
      {
        name: "SEC EDGAR SC 13D/G",
        description: "US beneficial owners filing >5% stake in public companies",
        jurisdiction: "US",
        requiresKey: false,
      },
      {
        name: "SEC EDGAR DEF 14A",
        description: "US public company board directors and named executives (proxy statements)",
        jurisdiction: "US",
        requiresKey: false,
      },
      {
        name: "BRREG Norway (Enhetsregisteret)",
        description: "Norwegian company directors and board members from the national business registry",
        jurisdiction: "NO",
        requiresKey: false,
      },
      {
        name: "Companies House UK",
        description: "UK company officers and persons with significant control",
        jurisdiction: "GB",
        requiresKey: true,
      },
    ],
  };
}
