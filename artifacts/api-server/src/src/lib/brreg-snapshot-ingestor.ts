import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  entitiesTable,
  relationshipsTable,
  assetsTable,
  type InsertEntity,
  type InsertRelationship,
  type InsertAsset,
} from "@workspace/db";
import {
  buildWesternRegistryPersonCandidate,
  type HarvestedPerson,
} from "./western-hnwi-ingestion";
import { logger } from "./logger";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");
const DATA_DIR = resolve(ROOT, "data/registry-seeds");
const BRREG_SOURCE = "BRREG Norway — Enhetsregisteret";
const SNAPSHOT_ID = "brreg-sector-screen-2026-11-07";
const COMPANY_FILE = "brreg_company_seeds_2026-11-07.csv";
const PEOPLE_FILE = "brreg_managing_director_seeds_2026-11-07.csv";
const ASSET_FILE = "manual_asset_leads.csv";
const INTERMEDIARY_FILE = "proximal_intermediaries_2026-11-08.csv";
const INTERMEDIARY_SOURCE = "Apex public professional intermediary seed";
const INTERMEDIARY_SNAPSHOT_ID = "apex-proximal-intermediaries-2026-11-08";

export type CsvRecord = Record<string, string>;

export function parseRegistryCsv(input: string): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const source = input.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        value += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = (rows.shift() ?? []).map((header) => header.trim());
  if (!headers.length || headers.some((header) => !header)) {
    throw new Error("BRREG seed CSV is missing a valid header row.");
  }
  return rows
    .filter((cells) => cells.some((cell) => cell.trim().length > 0))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function parseObject(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function normalizedName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function numeric(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isEligibleBrregCompany(row: CsvRecord): boolean {
  const codes = clean(row.industry_codes).split(" | ").filter(Boolean);
  const prefixes = ["55.", "56.", "68.", "69.", "70.", "71.", "41.", "42.", "43.", "64.", "65.", "66.", "77.", "79.", "81.", "82."];
  const relevantSector = codes.some((code) => prefixes.some((prefix) => code.startsWith(prefix)));
  const active = row.registered_in_business_register === "True"
    && row.bankruptcy !== "True"
    && row.under_liquidation !== "True";
  const scale = (numeric(row.employees) >= 2 && numeric(row.employees) <= 250)
    || (numeric(row.employees) === 0
      && numeric(row.registered_share_capital_amount) >= 5_000_000
      && numeric(row.registered_share_capital_amount) <= 100_000_000);
  return Boolean(clean(row.organization) && /^\d{9}$/.test(clean(row.organization_number)))
    && row.legal_form === "AS"
    && active
    && relevantSector
    && scale;
}

export function buildBrregCompanyEntity(row: CsvRecord): InsertEntity {
  const email = clean(row.business_email) || null;
  const phone = clean(row.business_phone) || null;
  const website = clean(row.official_website) || null;
  const organizationNumber = clean(row.organization_number);
  const sourceUrl = clean(row.official_registry_url)
    || "https://data.brreg.no/enhetsregisteret/api/enheter/" + organizationNumber;
  const metadata = {
    source: "brreg-norway",
    sourceName: BRREG_SOURCE,
    sourceDomain: "data.brreg.no",
    sourceClass: "registry_adapter_source",
    sourceMechanism: "brreg_snapshot_import",
    verificationLevel: "registry_record",
    independentCorroborationStatus: "not_assessed",
    sourceRecordId: "brreg:" + organizationNumber,
    organizationNumber,
    registryId: "brreg",
    sourceUrl,
    sourceUrls: [sourceUrl],
    sourceSnapshotId: SNAPSHOT_ID,
    legalForm: clean(row.legal_form),
    jurisdiction: "NO",
    country: clean(row.country) || "Norway",
    businessCity: clean(row.business_city) || null,
    employees: numeric(row.employees),
    industryCodes: clean(row.industry_codes),
    industryDescriptions: clean(row.industry_descriptions),
    registeredShareCapitalAmount: numeric(row.registered_share_capital_amount),
    registeredShareCapitalCurrency: clean(row.registered_share_capital_currency) || "NOK",
    incorporationDate: clean(row.incorporation_date) || null,
    businessEmail: email,
    businessPhone: phone,
    officialWebsite: website,
    contactScope: "organization_only",
    contactabilityStatus: clean(row.contactability_status),
    lastObservedAt: "2026-11-07",
    reviewOnly: true,
    wealthStatus: "not_assessed",
    hnwiQualificationStatus: "not_assessed",
    personalWealthEvidence: false,
  };
  return {
    name: clean(row.organization),
    type: "Corporation",
    bayesianScore: 0.2,
    // Company jurisdiction is not a personal nationality attribute.
    nationality: null,
    estimatedNetWorth: null,
    knownResidences: null,
    email,
    phone,
    phoneSource: phone ? "BRREG — registered organization contact" : null,
    contactMethod: "Official BRREG organization contact; organization-scoped only",
    contactOutcome: email || phone ? "organization_contact" : "evidence_only",
    contactConfidence: email || phone ? 20 : 0,
    notes: "BRREG legal-entity record. Registered share capital is not enterprise value, beneficial ownership, or any person's wealth. Contacts are organization-level only.",
    sourceRegistries: JSON.stringify([BRREG_SOURCE]),
    metadata: JSON.stringify(metadata),
    isHot: false,
  };
}

export function buildBrregManagingDirectorCandidate(row: CsvRecord): InsertEntity {
  const organizationNumber = clean(row.organization_number);
  const personName = clean(row.person_name);
  const sourceUrl = clean(row.source_url)
    || "https://data.brreg.no/enhetsregisteret/api/enheter/" + organizationNumber + "/roller";
  const harvested: HarvestedPerson = {
    name: personName,
    // BRREG role data establishes a Norwegian business appointment, not citizenship.
    nationality: "",
    location: "",
    sourceRegistry: BRREG_SOURCE,
    role: "Managing Director (BRREG: Daglig leder)",
    companyName: clean(row.organization),
    rawMetadata: {
      source: "brreg-norway",
      sourceName: BRREG_SOURCE,
      sourceClass: "registry_adapter_source",
      sourceMechanism: "brreg_snapshot_import",
      sourceRecordId: "brreg:" + organizationNumber + ":person:" + normalizedName(personName),
      registryId: "brreg",
      sourceUrl,
      sourceUrls: [sourceUrl],
      sourceSnapshotId: SNAPSHOT_ID,
      organizationNumber,
      companyRegistryId: organizationNumber,
      companyName: clean(row.organization),
      role: "Managing Director",
      roleOriginal: clean(row.business_role),
      evidenceLevel: clean(row.evidence_level),
      contactabilityStatus: "no_person_level_contact_assessed",
      contactScope: "no_person_contact",
      lastObservedAt: "2026-11-07",
      personalWealthEvidence: false,
    },
    signals: {
      isLargeShareholder: false,
      isBoardDirector: false,
      isCompanyOfficer: true,
      hasRecentFiling: false,
      jurisdiction: "NO",
    },
  };
  const built = buildWesternRegistryPersonCandidate(harvested).entity;
  const metadata = {
    ...parseObject(built.metadata),
    sourceRecordId: "brreg:" + organizationNumber + ":person:" + normalizedName(personName),
    sourceUrl,
    sourceUrls: [sourceUrl],
    sourceSnapshotId: SNAPSHOT_ID,
    organizationNumber,
    companyRegistryId: organizationNumber,
    companyName: clean(row.organization),
    role: "Managing Director",
    roleOriginal: clean(row.business_role),
    contactabilityStatus: "no_person_level_contact_assessed",
    contactScope: "no_person_contact",
    reviewOnly: true,
    wealthStatus: "unverified",
    hnwiQualificationStatus: "unverified",
    personalWealthEvidence: false,
  };
  return {
    ...built,
    nationality: null,
    email: null,
    phone: null,
    phoneSource: null,
    contactOutcome: "evidence_only",
    contactConfidence: 0,
    knownResidences: null,
    estimatedNetWorth: null,
    metadata: JSON.stringify(metadata),
    notes: "Official BRREG managing-director role only. It does not establish ownership, beneficial ownership, wealth, client access, or a personal contact route.",
    isHot: false,
  };
}

export function buildVirtualGlobetrottingLead(row: CsvRecord): InsertAsset {
  return {
    category: "RealEstate",
    identifier: clean(row.source_record_id),
    jurisdiction: "Unresolved — visual reference only",
    estimatedValue: null,
    address: null,
    description: clean(row.description),
    sourceRegistry: clean(row.source_name),
    ownerEntityId: undefined,
    metadata: JSON.stringify({
      sourceRecordId: clean(row.source_record_id),
      sourceUrl: clean(row.source_url),
      sourceClass: "unverified_visual_lead",
      evidenceStatus: clean(row.evidence_status),
      ownerStatus: clean(row.owner_status),
      sourceSnapshotId: clean(row.source_snapshot_id),
      personalWealthEvidence: false,
      reviewOnly: true,
    }),
  };
}

export function buildApexIntermediaryEntity(row: CsvRecord): InsertEntity {
  const isOrganization = clean(row.record_type) === "organization";
  const entityType = clean(row.entity_type) || (isOrganization ? "Corporation" : "Gatekeeper");
  const name = clean(row.entity_name);
  const role = clean(row.role);
  const organization = clean(row.organization_name);
  const sourceUrl = clean(row.source_url);
  const sourceUrls = [sourceUrl, clean(row.source_url_2)].filter(Boolean);
  const sourceName = clean(row.source_name) || INTERMEDIARY_SOURCE;
  const email = clean(isOrganization ? row.organization_email : row.professional_email) || null;
  const phone = clean(isOrganization ? row.organization_phone : row.professional_phone) || null;
  const hasPublishedRoute = Boolean(email || phone);
  const recordId = clean(row.source_record_id);
  const organizationSourceRecordId = clean(row.organization_source_record_id) || null;
  const country = clean(row.country) || null;
  const city = clean(row.city) || null;
  const website = clean(row.official_website) || null;
  const sourceDomain = (() => {
    try { return new URL(sourceUrl).hostname.replace(/^www\\./, "").toLowerCase(); }
    catch { return null; }
  })();
  const metadata = {
    source: "apex-professional-intermediary-seed",
    sourceName,
    sourceDomain,
    sourceClass: "official_professional_page",
    sourceMechanism: "apex_intermediary_seed_import",
    verificationLevel: "official_page_listing",
    independentCorroborationStatus: "not_assessed",
    sourceRecordId: recordId,
    sourceSnapshotId: INTERMEDIARY_SNAPSHOT_ID,
    sourceUrl,
    sourceUrls,
    role,
    roleOriginal: role,
    companyName: organization,
    organizationSourceRecordId,
    country,
    businessCity: city,
    businessOfficeLocation: clean(row.business_office_location) || null,
    officialWebsite: website,
    entityNature: clean(row.entity_nature) || null,
    scope: isOrganization ? "organization" : "person_candidate",
    personName: isOrganization ? null : name,
    exactClaimObserved: true,
    contactScope: isOrganization ? "organization_only" : hasPublishedRoute ? "professional_person" : "no_person_contact",
    contactabilityStatus: isOrganization
      ? hasPublishedRoute ? "official_organization_route_published" : "no_organization_route_published_in_seed"
      : hasPublishedRoute ? "official_professional_route_published" : "no_person_specific_contact_published",
    principalRelationshipStatus: "not_established",
    clientRelationshipStatus: "not_observed",
    lastObservedAt: "2026-11-08",
    reviewOnly: true,
    wealthStatus: "not_assessed",
    hnwiQualificationStatus: "unverified",
    personalWealthEvidence: false,
  };
  const note = clean(row.evidence_note);
  return {
    name,
    type: entityType,
    bayesianScore: isOrganization ? 0.15 : 0.1,
    nationality: null,
    estimatedNetWorth: null,
    knownResidences: null,
    email,
    phone,
    phoneSource: phone ? sourceName + " — published " + (isOrganization ? "organization" : "professional") + " route" : null,
    contactMethod: hasPublishedRoute
      ? isOrganization
        ? "Public organization/service route; organization-scoped only"
        : "Public professional work route; not a private or residential contact"
      : "No person-specific or organization-specific route published in the seed",
    contactOutcome: hasPublishedRoute
      ? isOrganization ? "organization_contact" : "direct_contact_candidate"
      : "evidence_only",
    contactConfidence: hasPublishedRoute ? isOrganization ? 20 : 35 : 0,
    notes: note || (isOrganization
      ? "Official-source organization bridge; exact legal identity and any relationship to named clients remain unverified."
      : "Official-source professional intermediary candidate; no named principal or client relationship is established."),
    sourceRegistries: JSON.stringify([INTERMEDIARY_SOURCE]),
    metadata: JSON.stringify(metadata),
    isHot: false,
  };
}

async function readCsv(file: string): Promise<CsvRecord[]> {
  return parseRegistryCsv(await readFile(resolve(DATA_DIR, file), "utf8"));
}

function entitySourceId(entity: { name: string; metadata: string | null }): string | null {
  const metadata = parseObject(entity.metadata);
  if (typeof metadata.sourceRecordId === "string" && metadata.sourceRecordId) return metadata.sourceRecordId;
  const orgnr = typeof metadata.organizationNumber === "string"
    ? metadata.organizationNumber
    : typeof metadata.orgnr === "string" ? metadata.orgnr : null;
  if (!orgnr) return null;
  if (metadata.role || metadata.roleOriginal || metadata.roleCode || metadata.roleDesc || metadata.groupCode) {
    return "brreg:" + orgnr + ":person:" + normalizedName(entity.name);
  }
  return "brreg:" + orgnr;
}

export interface BrregSnapshotIngestionOptions {
  jobId?: string;
  maxCompanies?: number;
  includePeople?: boolean;
  includeVisualLead?: boolean;
  includeIntermediaries?: boolean;
  batchSize?: number;
}

export interface BrregSnapshotIngestionResult {
  companiesInserted: number;
  peopleInserted: number;
  relationshipsInserted: number;
  assetsInserted: number;
  intermediaryOrganizationsInserted: number;
  intermediaryPeopleInserted: number;
  intermediaryRelationshipsInserted: number;
  intermediaryEntitiesSkipped: number;
  companiesSkipped: number;
  peopleSkipped: number;
  errors: number;
}

export async function runBrregSnapshotIngestion(
  options: BrregSnapshotIngestionOptions = {},
): Promise<BrregSnapshotIngestionResult> {
  const batchSize = Math.min(250, Math.max(25, Math.trunc(options.batchSize ?? 100)));
  const maxCompanies = Math.min(10_000, Math.max(1, Math.trunc(options.maxCompanies ?? 10_000)));
  const companies = (await readCsv(COMPANY_FILE)).filter(isEligibleBrregCompany).slice(0, maxCompanies);
  const managers = options.includePeople === false
    ? []
    : (await readCsv(PEOPLE_FILE)).filter((row) => row.business_role === "Daglig leder");
  const visualLeads = options.includeVisualLead === false ? [] : await readCsv(ASSET_FILE);
  const intermediaryRows = options.includeIntermediaries === false ? [] : await readCsv(INTERMEDIARY_FILE);
  const result: BrregSnapshotIngestionResult = {
    companiesInserted: 0,
    peopleInserted: 0,
    relationshipsInserted: 0,
    assetsInserted: 0,
    intermediaryOrganizationsInserted: 0,
    intermediaryPeopleInserted: 0,
    intermediaryRelationshipsInserted: 0,
    intermediaryEntitiesSkipped: 0,
    companiesSkipped: 0,
    peopleSkipped: 0,
    errors: 0,
  };

  const existingBrreg = await db.select({
    id: entitiesTable.id,
    name: entitiesTable.name,
    metadata: entitiesTable.metadata,
  }).from(entitiesTable).where(eq(entitiesTable.sourceRegistries, JSON.stringify([BRREG_SOURCE])));
  const entityIdBySourceId = new Map<string, number>();
  for (const existing of existingBrreg) {
    const sourceId = entitySourceId(existing);
    if (sourceId) entityIdBySourceId.set(sourceId, existing.id);
  }

  for (let offset = 0; offset < companies.length; offset += batchSize) {
    const batch = companies.slice(offset, offset + batchSize);
    const fresh = batch.filter((row) => !entityIdBySourceId.has("brreg:" + clean(row.organization_number)));
    result.companiesSkipped += batch.length - fresh.length;
    if (!fresh.length) continue;
    const inserted = await db.transaction(async (tx) => tx.insert(entitiesTable)
      .values(fresh.map(buildBrregCompanyEntity))
      .returning({ id: entitiesTable.id, metadata: entitiesTable.metadata }));
    for (const item of inserted) {
      const sourceId = parseObject(item.metadata).sourceRecordId;
      if (typeof sourceId === "string") entityIdBySourceId.set(sourceId, item.id);
    }
    result.companiesInserted += inserted.length;
    if (options.jobId) logger.info({ jobId: options.jobId, progress: Math.min(75, Math.round(((offset + batch.length) / companies.length) * 75)), companiesInserted: result.companiesInserted }, "BRREG company seed batch committed");
  }

  for (let offset = 0; offset < managers.length; offset += batchSize) {
    const batch = managers.slice(offset, offset + batchSize);
    const prepared = batch.map((row) => ({
      row,
      sourceId: "brreg:" + clean(row.organization_number) + ":person:" + normalizedName(clean(row.person_name)),
      companyId: entityIdBySourceId.get("brreg:" + clean(row.organization_number)),
    })).filter((item) => item.companyId != null);
    const fresh = prepared.filter((item) => !entityIdBySourceId.has(item.sourceId));
    result.peopleSkipped += batch.length - fresh.length;
    const created = fresh.length ? await db.transaction(async (tx) => tx.insert(entitiesTable)
      .values(fresh.map((item) => buildBrregManagingDirectorCandidate(item.row)))
      .returning({ id: entitiesTable.id, metadata: entitiesTable.metadata })) : [];
    for (const item of created) {
      const sourceId = parseObject(item.metadata).sourceRecordId;
      if (typeof sourceId === "string") entityIdBySourceId.set(sourceId, item.id);
    }
    result.peopleInserted += created.length;

    const relationCandidates: InsertRelationship[] = prepared.flatMap((item) => {
      const personId = entityIdBySourceId.get(item.sourceId);
      if (!personId || !item.companyId) return [];
      return [{
        sourceEntityId: personId,
        targetId: item.companyId,
        targetType: "Entity",
        relationshipType: "MANAGES",
        strength: 0.75,
        notes: "BRREG lists this person as Daglig leder (managing director) of the organization; this role does not establish equity, beneficial ownership, wealth, or personal access.",
      }];
    });
    if (relationCandidates.length) {
      const personIds = [...new Set(relationCandidates.map((item) => item.sourceEntityId))];
      const companyIds = [...new Set(relationCandidates.map((item) => item.targetId))];
      const existing = await db.select({
        sourceEntityId: relationshipsTable.sourceEntityId,
        targetId: relationshipsTable.targetId,
      }).from(relationshipsTable).where(and(
        eq(relationshipsTable.targetType, "Entity"),
        eq(relationshipsTable.relationshipType, "MANAGES"),
        inArray(relationshipsTable.sourceEntityId, personIds),
        inArray(relationshipsTable.targetId, companyIds),
      ));
      const existingPairs = new Set(existing.map((item) => item.sourceEntityId + ":" + item.targetId));
      const missing = relationCandidates.filter((item) => !existingPairs.has(item.sourceEntityId + ":" + item.targetId));
      if (missing.length) {
        await db.insert(relationshipsTable).values(missing);
        result.relationshipsInserted += missing.length;
      }
    }
    if (options.jobId) logger.info({ jobId: options.jobId, peopleInserted: result.peopleInserted, relationshipsInserted: result.relationshipsInserted }, "BRREG managing-director batch committed");
  }

  const existingIntermediaries = await db.select({
    id: entitiesTable.id,
    metadata: entitiesTable.metadata,
  }).from(entitiesTable).where(eq(entitiesTable.sourceRegistries, JSON.stringify([INTERMEDIARY_SOURCE])));
  const intermediaryEntityIdBySourceId = new Map<string, number>();
  for (const existing of existingIntermediaries) {
    const sourceId = parseObject(existing.metadata).sourceRecordId;
    if (typeof sourceId === "string" && sourceId) intermediaryEntityIdBySourceId.set(sourceId, existing.id);
  }

  const intermediaryOrganizations = intermediaryRows.filter((row) => clean(row.record_type) === "organization");
  for (let offset = 0; offset < intermediaryOrganizations.length; offset += batchSize) {
    const batch = intermediaryOrganizations.slice(offset, offset + batchSize);
    const fresh = batch.filter((row) => !intermediaryEntityIdBySourceId.has(clean(row.source_record_id)));
    result.intermediaryEntitiesSkipped += batch.length - fresh.length;
    if (!fresh.length) continue;
    const inserted = await db.transaction(async (tx) => tx.insert(entitiesTable)
      .values(fresh.map(buildApexIntermediaryEntity))
      .returning({ id: entitiesTable.id, metadata: entitiesTable.metadata }));
    for (const item of inserted) {
      const sourceId = parseObject(item.metadata).sourceRecordId;
      if (typeof sourceId === "string" && sourceId) intermediaryEntityIdBySourceId.set(sourceId, item.id);
    }
    result.intermediaryOrganizationsInserted += inserted.length;
    if (options.jobId) logger.info({
      jobId: options.jobId,
      intermediaryOrganizationsInserted: result.intermediaryOrganizationsInserted,
    }, "Apex intermediary organization bridge batch committed");
  }

  const intermediaryPeople = intermediaryRows.filter((row) => clean(row.record_type) === "person");
  const intermediaryRelationshipCandidates: Array<{ personId: number; organizationId: number; notes: string }> = [];
  for (let offset = 0; offset < intermediaryPeople.length; offset += batchSize) {
    const batch = intermediaryPeople.slice(offset, offset + batchSize);
    const prepared = batch.map((row) => ({
      row,
      sourceId: clean(row.source_record_id),
      organizationId: intermediaryEntityIdBySourceId.get(clean(row.organization_source_record_id)),
    }));
    const linkable = prepared.filter((item) => item.organizationId != null);
    result.intermediaryEntitiesSkipped += prepared.length - linkable.length;
    const fresh = linkable.filter((item) => !intermediaryEntityIdBySourceId.has(item.sourceId));
    result.intermediaryEntitiesSkipped += linkable.length - fresh.length;
    const inserted = fresh.length ? await db.transaction(async (tx) => tx.insert(entitiesTable)
      .values(fresh.map((item) => buildApexIntermediaryEntity(item.row)))
      .returning({ id: entitiesTable.id, metadata: entitiesTable.metadata })) : [];
    for (const item of inserted) {
      const sourceId = parseObject(item.metadata).sourceRecordId;
      if (typeof sourceId === "string" && sourceId) intermediaryEntityIdBySourceId.set(sourceId, item.id);
    }
    result.intermediaryPeopleInserted += inserted.length;
    for (const item of linkable) {
      const personId = intermediaryEntityIdBySourceId.get(item.sourceId);
      const organizationId = item.organizationId;
      if (!personId || !organizationId) continue;
      const role = clean(item.row.role);
      const organization = clean(item.row.organization_name);
      intermediaryRelationshipCandidates.push({
        personId,
        organizationId,
        notes: "Official source lists this person as " + role + " at " + organization
          + "; membership does not establish a relationship with any named client or principal, beneficial ownership, or authority to act for a third party.",
      });
    }
    if (options.jobId) logger.info({
      jobId: options.jobId,
      intermediaryPeopleInserted: result.intermediaryPeopleInserted,
    }, "Apex professional intermediary batch committed");
  }

  if (intermediaryRelationshipCandidates.length) {
    const personIds = [...new Set(intermediaryRelationshipCandidates.map((item) => item.personId))];
    const organizationIds = [...new Set(intermediaryRelationshipCandidates.map((item) => item.organizationId))];
    const existing = await db.select({
      sourceEntityId: relationshipsTable.sourceEntityId,
      targetId: relationshipsTable.targetId,
    }).from(relationshipsTable).where(and(
      eq(relationshipsTable.targetType, "Entity"),
      eq(relationshipsTable.relationshipType, "MEMBER_OF"),
      inArray(relationshipsTable.sourceEntityId, personIds),
      inArray(relationshipsTable.targetId, organizationIds),
    ));
    const existingPairs = new Set(existing.map((item) => item.sourceEntityId + ":" + item.targetId));
    const missing = intermediaryRelationshipCandidates
      .filter((item) => !existingPairs.has(item.personId + ":" + item.organizationId))
      .map((item): InsertRelationship => ({
        sourceEntityId: item.personId,
        targetId: item.organizationId,
        targetType: "Entity",
        relationshipType: "MEMBER_OF",
        strength: 0.85,
        notes: item.notes,
      }));
    if (missing.length) {
      await db.insert(relationshipsTable).values(missing);
      result.intermediaryRelationshipsInserted += missing.length;
    }
  }

  for (const row of visualLeads) {
    const identifier = clean(row.source_record_id);
    const [existing] = await db.select({ id: assetsTable.id }).from(assetsTable).where(and(
      eq(assetsTable.category, "RealEstate"),
      eq(assetsTable.identifier, identifier),
    )).limit(1);
    if (existing) continue;
    await db.insert(assetsTable).values(buildVirtualGlobetrottingLead(row));
    result.assetsInserted++;
  }

  result.errors = 0;
  logger.info({ jobId: options.jobId ?? null, ...result }, "BRREG registry snapshot import completed");
  return result;
}
