/**
 * FAA Releasable Aircraft Database Ingestor — REAL PUBLIC REGISTRY DATA
 *
 * Source: https://registry.faa.gov/database/ReleasableAircraft.zip
 * Updated: daily by the FAA. Free download, no API key required.
 *
 * Downloads the official ZIP, extracts MASTER.txt (pipe-delimited), and
 * ingests aircraft owners who are individuals/LLCs/partnerships operating
 * turbine-powered or multi-engine aircraft. These are the highest-confidence
 * HNWI proxies in the US — private jet and helicopter owners.
 *
 * NO synthetic data. Every record is a real FAA registrant.
 * Dedup by N-NUMBER via Redis Upstash to prevent re-insertion.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable } from "@workspace/db";
import type { InsertEntity, InsertAsset, InsertRelationship } from "@workspace/db";
import { classifyFaaRegistrant, classifyFaaAssetSignal } from "./faa-ownership-classification";
import { isStructurallyValidCandidateName } from "./llm-name-validator-policy";
import { preloadDedupPrefix, batchMarkSeen, updateJob, appendJobLog } from "./job-queue";
import { logger } from "./logger";

const execAsync = promisify(exec);

// ── Constants ─────────────────────────────────────────────────────────────────

const FAA_ZIP_URL = "https://registry.faa.gov/database/ReleasableAircraft.zip";
const TMP_DIR = join(tmpdir(), "apexfinder-faa");
const ZIP_PATH = join(TMP_DIR, "ReleasableAircraft.zip");
const MASTER_PATH = join(TMP_DIR, "MASTER.txt");

// Cache TTL — re-download if file is older than 23 hours
const CACHE_TTL_MS = 23 * 60 * 60 * 1000;

// FAA MASTER.txt is comma-delimited with 34 documented fields (0-based).
// Registrant type, fractional flag, status and additional names are kept separately.
const ROTORCRAFT = "6";
const F_NNUMBER        = 0;
const F_SERIAL         = 1;
const F_YEAR_MFR       = 4;
const F_TYPE_REG       = 5;
const F_NAME           = 6;
const F_STREET         = 7;
const F_STREET2        = 8;
const F_CITY           = 9;
const F_STATE          = 10;
const F_ZIP            = 11;
const F_COUNTRY        = 14;
const F_TYPE_AIRCRAFT  = 18;
const F_TYPE_ENGINE    = 19;
const F_STATUS         = 20;
const F_FRACTIONAL_OWNER = 22;
const F_OTHER_NAME_1 = 24;
const F_OTHER_NAME_5 = 28;
const F_LAST_ACTIVITY = 15;
const F_MFR_MODEL_CODE = 2;
const F_ENGINE_MODEL_CODE = 3;
const F_EXPIRATION_DATE = 29;
const F_UNIQUE_ID = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FaaIngestionParams {
  jobId: string;
  maxRecords?: number;
  forceRefresh?: boolean;
}

export interface FaaIngestionResult {
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
  candidateEntitiesInserted: number;
}

type FaaBatchRow = { asset: InsertAsset; entity: InsertEntity | null };

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── US state → geographic centroid [lat, lon] ─────────────────────────────────
// FAA bulk CSV has no GPS data; we assign the centroid of the registered state
// so aircraft appear on the map even before live ADS-B enrichment.

export const US_STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.806671, -86.791130], AK: [61.370716, -152.404419], AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123], CA: [36.116203, -119.681564], CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371], DE: [39.318523, -75.507141],  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074], HI: [21.094318, -157.498337], ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137], IN: [39.849426, -86.258278],  IA: [42.011539, -93.210526],
  KS: [38.526600, -96.726486], KY: [37.668140, -84.670067],  LA: [31.169960, -91.867805],
  ME: [44.693947, -69.381927], MD: [39.063946, -76.802101],  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095], MN: [45.694454, -93.900192],  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368], MT: [46.921925, -110.454353], NE: [41.125370, -98.268082],
  NV: [38.313515, -117.055374],NH: [43.452492, -71.563896],  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],NY: [42.165726, -74.948051],  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012], OH: [40.388783, -82.764915],  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],PA: [40.590752, -77.209755],  RI: [41.680893, -71.511780],
  SC: [33.856892, -80.945007], SD: [44.299782, -99.438828],  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461], UT: [40.150032, -111.862434], VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968], WA: [47.400902, -121.490494], WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508], WY: [42.755966, -107.302490], DC: [38.897438, -77.026817],
  PR: [18.220833, -66.590149], GU: [13.444304, 144.793731],  VI: [18.335765, -64.896335],
};

function titleCase(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * Parse one FAA comma-delimited record while respecting quoted commas and escaped quotes.
 * MASTER.txt is not a pipe-delimited file and names may contain commas.
 */
export function parseFaaMasterCsvRecord(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index]!;
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  fields.push(value.trim());
  return fields;
}

/** Keep FAA's registrant order; the raw name is retained for model-led resolution. */
export function normalizeFaaName(rawName: string, _typeReg: string): string {
  return titleCase(rawName);
}

function aircraftLabel(typeEngine: string, typeAircraft: string): string {
  if (typeEngine === "4") return "Jet";
  if (typeEngine === "5") return "Turbofan";
  if (typeEngine === "2") return "Turboprop";
  if (typeEngine === "3") return "Turboshaft / Helicopter";
  if (typeAircraft === ROTORCRAFT) return "Helicopter";
  return "Multi-Engine";
}

function faaDateToIso(value: string): string | null {
  const normalized = value.trim().replace(/\//g, "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

export function buildFaaRegistrantEntity(input: {
  nNumber: string;
  registrantTypeCode: string;
  registrantName: string;
  fractionalOwnershipFlag: string;
  statusCode: string;
  typeAircraft: string;
  typeEngine: string;
  yearManufactured: string;
  serialNumber: string;
  state: string;
  country: string;
  mailingAddress: string;
  otherRegistrantNames: string[];
  lastActivityDate: string;
}): InsertEntity | null {
  const classification = classifyFaaRegistrant(input.registrantTypeCode, {
    fractionalOwnershipFlag: input.fractionalOwnershipFlag,
    statusCode: input.statusCode,
  });
  if (!classification.entityType || !isStructurallyValidCandidateName(input.registrantName)) return null;

  const name = normalizeFaaName(input.registrantName, input.registrantTypeCode);
  const tailNumber = input.nNumber.startsWith("N") ? input.nNumber : `N${input.nNumber}`;
  const isPersonCandidate = classification.entityType === "PersonCandidate";
  return {
    name,
    type: classification.entityType,
    nationality: input.country || "US",
    knownResidences: null,
    sourceRegistries: JSON.stringify(["FAA Releasable Aircraft Database"]),
    bayesianScore: classification.bayesianScore,
    estimatedNetWorth: null,
    isHot: false,
    contactMethod: "FAA registrant record — no direct professional contact route observed",
    notes: `FAA ${classification.registrantTypeLabel.toLowerCase()} registrant for aircraft N${input.nNumber}; registered-to association is not a beneficial-ownership conclusion.`,
    metadata: JSON.stringify({
      source: "faa-aircraft-registry",
      nNumber: tailNumber,
      registrantTypeCode: classification.registrantTypeCode,
      registrantTypeLabel: classification.registrantTypeLabel,
      registrantKind: classification.registrantKind,
      identityStatus: classification.identityStatus,
      ownershipStatus: classification.ownershipStatus,
      beneficialOwnershipStatus: classification.beneficialOwnershipStatus,
      fractionalOwnershipStatus: classification.fractionalOwnershipStatus,
      registrationStatus: classification.registrationStatus,
      confidence: classification.confidence,
      reviewOnly: true,
      wealthStatus: classification.wealthStatus,
      hnwiQualificationStatus: classification.hnwiQualificationStatus,
      estimatedNetWorth: sql`CASE WHEN ${entitiesTable.estimatedNetWorth} IN (180000000, 120000000, 30000000, 15000000, 8000000, 4000000) THEN NULL ELSE ${entitiesTable.estimatedNetWorth} END`,
      bayesianScore: 0.05,
      assetSignal: classifyFaaAssetSignal(input.typeEngine, input.typeAircraft),
      personalWealthEvidence: false,
      nameValidationStatus: "pending_investigator_resolution",
      nameNormalizationStatus: "title_case_only_raw_order_preserved",
      rawRegistrantName: input.registrantName,
      otherRegistrantNames: input.otherRegistrantNames,
      registrantMailingAddress: input.mailingAddress || null,
      registrantState: input.state || null,
      country: input.country || "US",
      typeAircraft: input.typeAircraft,
      typeEngine: input.typeEngine,
      serialNumber: input.serialNumber,
      yearManufactured: input.yearManufactured,
      lastActivityDate: faaDateToIso(input.lastActivityDate),
      sourceUrl: "https://registry.faa.gov/database/ReleasableAircraft.zip",
      sourceFieldSemantics: "FAA registrant type identifies the registration applicant; it does not establish ultimate beneficial ownership or personal wealth.",
      candidateKind: isPersonCandidate ? "individual_registrant_candidate" : "legal_entity_registrant_candidate",
    }),
  };
}

export function buildFaaAircraftAsset(input: {
  nNumber: string;
  registrantTypeCode: string;
  registrantName: string;
  fractionalOwnershipFlag: string;
  statusCode: string;
  typeAircraft: string;
  typeEngine: string;
  yearManufactured: string;
  serialNumber: string;
  manufacturerModelCode: string;
  engineModelCode: string;
  state: string;
  country: string;
  otherRegistrantNames: string[];
  lastActivityDate: string;
  expirationDate: string;
  uniqueId: string;
}): InsertAsset {
  const classification = classifyFaaRegistrant(input.registrantTypeCode, {
    fractionalOwnershipFlag: input.fractionalOwnershipFlag,
    statusCode: input.statusCode,
  });
  const label = aircraftLabel(input.typeEngine, input.typeAircraft);
  const tailNumber = input.nNumber.startsWith("N") ? input.nNumber : `N${input.nNumber}`;
  return {
    category: "Aviation",
    identifier: tailNumber,
    jurisdiction: "FAA, US",
    description: `${label} — ${tailNumber}${input.yearManufactured ? ` (${input.yearManufactured})` : ""}`,
    sourceRegistry: "FAA Releasable Aircraft Database",
    lastActivityDate: faaDateToIso(input.lastActivityDate) ?? undefined,
    estimatedValue: null,
    metadata: JSON.stringify({
      source: "faa-aircraft-registry",
      nNumber: tailNumber,
      registrantName: input.registrantName,
      otherRegistrantNames: input.otherRegistrantNames,
      registrantTypeCode: classification.registrantTypeCode,
      registrantTypeLabel: classification.registrantTypeLabel,
      registrantKind: classification.registrantKind,
      identityStatus: classification.identityStatus,
      ownershipStatus: classification.ownershipStatus,
      beneficialOwnershipStatus: classification.beneficialOwnershipStatus,
      fractionalOwnershipStatus: classification.fractionalOwnershipStatus,
      registrationStatus: classification.registrationStatus,
      assetSignal: classifyFaaAssetSignal(input.typeEngine, input.typeAircraft),
      personalWealthEvidence: false,
      wealthStatus: "not_assessed",
      hnwiQualificationStatus: classification.hnwiQualificationStatus,
      reviewOnly: true,
      typeAircraft: input.typeAircraft,
      typeEngine: input.typeEngine,
      manufacturerModelCode: input.manufacturerModelCode,
      engineModelCode: input.engineModelCode,
      serialNumber: input.serialNumber,
      yearManufactured: input.yearManufactured,
      registrantState: input.state || null,
      country: input.country || "US",
      expirationDate: faaDateToIso(input.expirationDate),
      uniqueId: input.uniqueId || null,
      sourceUrl: "https://registry.faa.gov/database/ReleasableAircraft.zip",
      sourceFieldSemantics: "Registrant is the FAA registration applicant; no beneficial-owner or market-value conclusion is made.",
    }),
  };
}

async function isCacheStale(): Promise<boolean> {
  if (!existsSync(ZIP_PATH)) return true;
  try {
    const s = await stat(ZIP_PATH);
    return Date.now() - s.mtimeMs > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

// ── Batch flush ───────────────────────────────────────────────────────────────

async function repairLegacyFaaOwnershipSemantics(): Promise<void> {
  await db.transaction(async (tx) => {
    const legacyAssets = await tx.select({
      id: assetsTable.id,
      ownerEntityId: assetsTable.ownerEntityId,
    }).from(assetsTable).innerJoin(
      entitiesTable,
      eq(assetsTable.ownerEntityId, entitiesTable.id),
    ).where(and(
      eq(assetsTable.category, "Aviation"),
      eq(assetsTable.sourceRegistry, "FAA Releasable Aircraft Database"),
      isNotNull(assetsTable.ownerEntityId),
      eq(entitiesTable.sourceRegistries, JSON.stringify(["FAA Releasable Aircraft Database"])),
    ));
    // Historical FAA imports promoted registrants to HNWI using aircraft-class
    // multipliers. Downgrade only rows whose sole source is the FAA registry.
    await tx.update(entitiesTable).set({
      type: sql`CASE WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' = '1' THEN 'PersonCandidate' WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' IN ('2','3','7','8') THEN 'Corporation' ELSE 'Other' END`,
      estimatedNetWorth: null,
      bayesianScore: 0.05,
      knownResidences: sql`CASE WHEN EXISTS (SELECT 1 FROM ${assetsTable} WHERE ${assetsTable.ownerEntityId} = ${entitiesTable.id} AND ${assetsTable.sourceRegistry} = 'FAA Releasable Aircraft Database' AND ${assetsTable.address} = ${entitiesTable.knownResidences}) THEN NULL ELSE ${entitiesTable.knownResidences} END`,
      contactMethod: sql`CASE WHEN ${entitiesTable.contactMethod} IS NULL OR BTRIM(${entitiesTable.contactMethod}) = '' THEN 'FAA registrant record — direct professional contact route not verified' ELSE ${entitiesTable.contactMethod} END`,
      metadata: sql`COALESCE(${entitiesTable.metadata}::jsonb, '{}'::jsonb) || jsonb_build_object(
        'legacyFaaOwnershipCorrected', true,
        'hnwiQualificationStatus', CASE
          WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' = '1' THEN 'unverified'
          WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' = '5' THEN 'not_applicable'
          ELSE 'not_assessed'
        END,
        'identityStatus', CASE
          WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' = '1' THEN 'registry_person_candidate'
          WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' IN ('2','3','7','8') THEN 'legal_entity_candidate'
          WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' IN ('4','9') THEN 'co_owned_registrant_unresolved'
          WHEN ${entitiesTable.metadata}::jsonb ->> 'typeRegistrant' = '5' THEN 'government_registrant'
          ELSE 'registrant_type_unknown'
        END,
        'wealthStatus', 'not_assessed',
        'beneficialOwnershipStatus', 'unresolved',
        'reviewOnly', true,
        'bayesianScore', 0.05
      )`,
    }).where(and(
      eq(entitiesTable.type, "HNWI"),
      eq(entitiesTable.sourceRegistries, JSON.stringify(["FAA Releasable Aircraft Database"])),
    ));
    const candidateAssetIds = legacyAssets.map((row) => row.id);
    const legacyOwnerLinks = candidateAssetIds.length > 0
      ? await tx.select({
          sourceEntityId: relationshipsTable.sourceEntityId,
          targetId: relationshipsTable.targetId,
        }).from(relationshipsTable).where(and(
          eq(relationshipsTable.targetType, "Asset"),
          eq(relationshipsTable.relationshipType, "OWNS"),
          eq(relationshipsTable.notes, "FAA aircraft registration"),
          inArray(relationshipsTable.targetId, candidateAssetIds),
        ))
      : [];
    const legacyOwnerPairs = new Set(legacyOwnerLinks.map((row) => `${row.sourceEntityId}:${row.targetId}`));
    const repairAssets = legacyAssets.filter((row) => row.ownerEntityId != null && legacyOwnerPairs.has(`${row.ownerEntityId}:${row.id}`));
    const assetIds = repairAssets.map((row) => row.id);
    if (assetIds.length > 0) {
      await tx.update(assetsTable).set({ ownerEntityId: null }).where(inArray(assetsTable.id, assetIds));
      await tx.update(relationshipsTable).set({
        relationshipType: "REGISTERED_TO",
        strength: 0.75,
        notes: "Legacy FAA registrant link reclassified as REGISTERED_TO; registration is not beneficial-ownership proof.",
      }).where(and(
        eq(relationshipsTable.targetType, "Asset"),
        eq(relationshipsTable.relationshipType, "OWNS"),
        eq(relationshipsTable.notes, "FAA aircraft registration"),
        inArray(relationshipsTable.targetId, assetIds),
      ));
      const existing = await tx.select({
        sourceEntityId: relationshipsTable.sourceEntityId,
        targetId: relationshipsTable.targetId,
      }).from(relationshipsTable).where(and(
        eq(relationshipsTable.targetType, "Asset"),
        eq(relationshipsTable.relationshipType, "REGISTERED_TO"),
        inArray(relationshipsTable.targetId, assetIds),
      ));
      const existingPairs = new Set(existing.map((row) => `${row.sourceEntityId}:${row.targetId}`));
      const repairRows: InsertRelationship[] = repairAssets
        .filter((row) => row.ownerEntityId != null && !existingPairs.has(`${row.ownerEntityId}:${row.id}`))
        .map((row) => ({
          sourceEntityId: row.ownerEntityId!,
          targetId: row.id,
          targetType: "Asset",
          relationshipType: "REGISTERED_TO",
          strength: 0.75,
          notes: "Legacy FAA registrant link reclassified as REGISTERED_TO; registration is not beneficial-ownership proof.",
        }));
      if (repairRows.length > 0) await tx.insert(relationshipsTable).values(repairRows);
    }


  });
}

async function flushBatch(batch: FaaBatchRow[]): Promise<{ inserted: number; errors: number; candidateEntitiesInserted: number }> {
  if (batch.length === 0) return { inserted: 0, errors: 0, candidateEntitiesInserted: 0 };
  try {
    return await db.transaction(async (tx) => {
      const uniqueRows = new Map<string, FaaBatchRow>();
      for (const row of batch) {
        const identifier = row.asset.identifier;
        if (identifier && !uniqueRows.has(identifier)) uniqueRows.set(identifier, row);
      }
      const rows = [...uniqueRows.values()];
      const identifiers = rows.map((row) => row.asset.identifier);
      const existingAssets = await tx.select({
        id: assetsTable.id,
        identifier: assetsTable.identifier,
        ownerEntityId: assetsTable.ownerEntityId,
      }).from(assetsTable).where(and(
        eq(assetsTable.category, "Aviation"),
        eq(assetsTable.sourceRegistry, "FAA Releasable Aircraft Database"),
        inArray(assetsTable.identifier, identifiers),
      ));
      const assetIdByIdentifier = new Map(existingAssets.map((row) => [row.identifier, row.id]));
      const freshAssets = rows.filter((row) => !assetIdByIdentifier.has(row.asset.identifier));
      const insertedAssets = freshAssets.length > 0
        ? await tx.insert(assetsTable).values(freshAssets.map((row) => row.asset)).returning({ id: assetsTable.id, identifier: assetsTable.identifier })
        : [];
      for (const row of insertedAssets) assetIdByIdentifier.set(row.identifier, row.id);

      const legacyOwnerLinks = existingAssets.filter((row) => row.ownerEntityId != null);
      if (legacyOwnerLinks.length > 0) {
        await tx.update(assetsTable).set({ ownerEntityId: null }).where(inArray(assetsTable.id, legacyOwnerLinks.map((row) => row.id)));
      }

      const candidateRows = rows.filter((row): row is FaaBatchRow & { entity: InsertEntity } => row.entity !== null);
      const uniqueEntities = new Map<string, InsertEntity>();
      for (const row of candidateRows) {
        const key = row.entity.name.trim().toLowerCase().replace(/\s+/g, " ");
        if (key && !uniqueEntities.has(key)) uniqueEntities.set(key, row.entity);
      }
      const entityNames = [...uniqueEntities.values()].map((entity) => entity.name);
      const existingEntities = entityNames.length > 0
        ? await tx.select({ id: entitiesTable.id, name: entitiesTable.name }).from(entitiesTable).where(inArray(entitiesTable.name, entityNames))
        : [];
      const entityIdByName = new Map(existingEntities.map((row) => [row.name.trim().toLowerCase().replace(/\s+/g, " "), row.id]));
      const freshEntities = [...uniqueEntities.entries()].filter(([key]) => !entityIdByName.has(key)).map(([, entity]) => entity);
      const insertedEntities = freshEntities.length > 0
        ? await tx.insert(entitiesTable).values(freshEntities).returning({ id: entitiesTable.id, name: entitiesTable.name })
        : [];
      for (const row of insertedEntities) entityIdByName.set(row.name.trim().toLowerCase().replace(/\s+/g, " "), row.id);

      const assetIds = [...assetIdByIdentifier.values()];
      const existingRelations = assetIds.length > 0
        ? await tx.select({
            sourceEntityId: relationshipsTable.sourceEntityId,
            targetId: relationshipsTable.targetId,
          }).from(relationshipsTable).where(and(
            eq(relationshipsTable.targetType, "Asset"),
            eq(relationshipsTable.relationshipType, "REGISTERED_TO"),
            inArray(relationshipsTable.targetId, assetIds),
          ))
        : [];
      const relationPairs = new Set(existingRelations.map((row) => `${row.sourceEntityId}:${row.targetId}`));
      const relationships: InsertRelationship[] = [];

      for (const legacy of legacyOwnerLinks) {
        if (legacy.ownerEntityId == null) continue;
        const key = `${legacy.ownerEntityId}:${legacy.id}`;
        if (relationPairs.has(key)) continue;
        relationPairs.add(key);
        relationships.push({
          sourceEntityId: legacy.ownerEntityId,
          targetId: legacy.id,
          targetType: "Asset",
          relationshipType: "REGISTERED_TO",
          strength: 0.75,
          notes: "FAA registry lists this entity as registrant; this does not establish beneficial ownership.",
        });
      }

      for (const row of candidateRows) {
        const entityKey = row.entity.name.trim().toLowerCase().replace(/\s+/g, " ");
        const entityId = entityIdByName.get(entityKey);
        const assetId = assetIdByIdentifier.get(row.asset.identifier);
        if (!entityId || !assetId) continue;
        const key = `${entityId}:${assetId}`;
        if (relationPairs.has(key)) continue;
        relationPairs.add(key);
        relationships.push({
          sourceEntityId: entityId,
          targetId: assetId,
          targetType: "Asset",
          relationshipType: "REGISTERED_TO",
          strength: 0.75,
          notes: "FAA MASTER lists this entity as registrant; registration does not establish beneficial ownership.",
        });
      }
      if (relationships.length > 0) await tx.insert(relationshipsTable).values(relationships);

      return {
        inserted: insertedAssets.length,
        errors: 0,
        candidateEntitiesInserted: insertedEntities.length,
      };
    });
  } catch (err: any) {
    logger.warn({ err: err.message, batchSize: batch.length }, "FAA transactional asset/registrant batch failed");
    return { inserted: 0, errors: batch.length, candidateEntitiesInserted: 0 };
  }
}

// ── Main ingestion function ───────────────────────────────────────────────────

export async function runFaaIngestion(params: FaaIngestionParams): Promise<FaaIngestionResult> {
  const { jobId, maxRecords = 30_000, forceRefresh = false } = params;
  const startTime = Date.now();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await mkdir(TMP_DIR, { recursive: true });
  await updateJob(jobId, { message: "Reconciling legacy FAA registrant/asset ownership semantics…" });
  await repairLegacyFaaOwnershipSemantics();

  // ── Step 1: Download ZIP ───────────────────────────────────────────────────
  const needsDownload = forceRefresh || await isCacheStale();

  if (needsDownload) {
    await updateJob(jobId, { message: "Downloading FAA Aircraft Registry (~70MB)…" });
    await appendJobLog(jobId, `⬇️  Fetching ${FAA_ZIP_URL}`);
    try {
      await execAsync(
        `curl -L --max-time 300 --retry 2 --retry-delay 5 \
          -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" \
          -H "Accept: application/octet-stream,*/*" \
          -H "Accept-Encoding: identity" \
          -H "Referer: https://registry.faa.gov/aircraftinquiry/Search/NNumberInquiry" \
          -o "${ZIP_PATH}" "${FAA_ZIP_URL}"`,
        { timeout: 320_000 },
      );
      await appendJobLog(jobId, "✅ Download complete.");
    } catch (err: any) {
      throw new Error(`FAA download failed: ${err.message}`);
    }
  } else {
    await appendJobLog(jobId, "📦 Using cached FAA database (< 23h old).");
  }

  // ── Step 2: Extract MASTER.txt ─────────────────────────────────────────────
  await updateJob(jobId, { message: "Extracting MASTER.txt from archive…", progress: 5 });
  await appendJobLog(jobId, "📂 Extracting MASTER.txt…");
  try {
    await execAsync(`cd "${TMP_DIR}" && unzip -o "${ZIP_PATH}" MASTER.txt 2>/dev/null`, {
      timeout: 60_000,
    });
    await appendJobLog(jobId, "✅ Extraction complete. Scanning aircraft records…");
  } catch (err: any) {
    throw new Error(`FAA extraction failed: ${err.message}`);
  }

  // ── Step 3: Stream parse MASTER.txt ───────────────────────────────────────
  // Count total lines first so progress bar is meaningful
  let totalLines = 0;
  try {
    const countResult = await execAsync(`wc -l < "${MASTER_PATH}"`, { timeout: 10_000 });
    totalLines = parseInt(countResult.stdout.trim(), 10) || 0;
  } catch { /* non-fatal */ }

  // Pre-load existing FAA dedup keys into memory (one Upstash scan instead of per-record calls)
  await updateJob(jobId, { message: "Loading FAA dedup index…", progress: 7 });
  const seenKeys = await preloadDedupPrefix("faa:v2:");
  await appendJobLog(jobId, `📋 ${seenKeys.size.toLocaleString()} previously-ingested FAA records in dedup set. Starting parse…`);

  await updateJob(jobId, { message: `Parsing MASTER.txt (${totalLines.toLocaleString()} records)…`, progress: 8 });

  const rl = createInterface({
    input: createReadStream(MASTER_PATH, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let lastProgressLine = 0;
  const batchRows: FaaBatchRow[] = [];
  const pendingDedup: string[] = [];
  let candidateEntitiesInserted = 0;

  for await (const line of rl) {
    lineNum++;
    if (inserted + batchRows.length >= maxRecords) break;

    if (lineNum - lastProgressLine >= 5_000) {
      lastProgressLine = lineNum;
      const pct = totalLines > 0
        ? Math.min(8 + Math.floor((lineNum / totalLines) * 87), 94)
        : Math.min(8 + Math.floor((inserted / maxRecords) * 87), 94);
      await updateJob(jobId, {
        message: `Scanned ${lineNum.toLocaleString()} / ${totalLines.toLocaleString()} FAA rows — ${inserted.toLocaleString()} aircraft assets seeded…`,
        progress: pct,
        inserted,
      });
    }

    const fields = parseFaaMasterCsvRecord(line);
    if (fields[0]?.trim().toLowerCase() === "n-number") continue; // tolerate optional header, never skip the first data row
    if (fields.length <= F_OTHER_NAME_5) continue;

    const nNumber = fields[F_NNUMBER]?.trim() ?? "";
    const typeReg = fields[F_TYPE_REG]?.trim() ?? "";
    const rawName = fields[F_NAME]?.trim() ?? "";
    const street = fields[F_STREET]?.trim() ?? "";
    const street2 = fields[F_STREET2]?.trim() ?? "";
    const city = fields[F_CITY]?.trim() ?? "";
    const state = fields[F_STATE]?.trim() ?? "";
    const zip = fields[F_ZIP]?.trim() ?? "";
    const country = fields[F_COUNTRY]?.trim() || "US";
    const typeAircraft = fields[F_TYPE_AIRCRAFT]?.trim() ?? "";
    const typeEngine = fields[F_TYPE_ENGINE]?.trim() ?? "";
    const statusCode = fields[F_STATUS]?.trim() ?? "";
    const fractionalOwnershipFlag = fields[F_FRACTIONAL_OWNER]?.trim() ?? "";
    const yearMfr = fields[F_YEAR_MFR]?.trim() ?? "";
    const serial = fields[F_SERIAL]?.trim() ?? "";
    const otherRegistrantNames = fields.slice(F_OTHER_NAME_1, F_OTHER_NAME_5 + 1).map((value) => value.trim()).filter(Boolean);
    const lastActivityDate = fields[F_LAST_ACTIVITY]?.trim() ?? "";
    const expirationDate = fields[F_EXPIRATION_DATE]?.trim() ?? "";
    const uniqueId = fields[F_UNIQUE_ID]?.trim() ?? "";
    const manufacturerModelCode = fields[F_MFR_MODEL_CODE]?.trim() ?? "";
    const engineModelCode = fields[F_ENGINE_MODEL_CODE]?.trim() ?? "";

    if (!nNumber) continue;
    const classification = classifyFaaRegistrant(typeReg, { fractionalOwnershipFlag, statusCode });
    // Keep current/renewal-pending registrations; do not seed sold, expired,
    // revoked, reserved, or unknown status rows as live asset candidates.
    if (classification.registrationStatus !== "valid" && classification.registrationStatus !== "pending") continue;

    const assetSignal = classifyFaaAssetSignal(typeEngine, typeAircraft);
    if (assetSignal.strength === "observed_asset_lead") continue;
    const dkey = `faa:v2:${nNumber}`;
    if (seenKeys.has(dkey)) { skipped++; continue; }
    seenKeys.add(dkey);
    pendingDedup.push(dkey);

    const tailNumber = nNumber.startsWith("N") ? nNumber : `N${nNumber}`;
    const mailingAddress = [street, street2, city, state, zip, country !== "US" ? country : ""].filter(Boolean).join(", ");
    const entity = buildFaaRegistrantEntity({
      nNumber,
      registrantTypeCode: typeReg,
      registrantName: rawName,
      fractionalOwnershipFlag,
      statusCode,
      typeAircraft,
      typeEngine,
      yearManufactured: yearMfr,
      serialNumber: serial,
      state,
      country,
      mailingAddress,
      otherRegistrantNames,
      lastActivityDate,
    });
    const asset = buildFaaAircraftAsset({
      nNumber,
      registrantTypeCode: typeReg,
      registrantName: rawName,
      fractionalOwnershipFlag,
      statusCode,
      typeAircraft,
      typeEngine,
      yearManufactured: yearMfr,
      serialNumber: serial,
      manufacturerModelCode,
      engineModelCode,
      state,
      country,
      otherRegistrantNames,
      lastActivityDate,
      expirationDate,
      uniqueId,
    });
    // The FAA registrant can be a person or legal entity. Co-owned, government,
    // and unknown registrant records remain asset-only until a model resolves
    // their identities; none is written to assets.ownerEntityId.
    batchRows.push({ asset: { ...asset, identifier: tailNumber }, entity });

    if (batchRows.length >= 100) {
      const res = await flushBatch(batchRows);
      if (res.errors > 0) {
        errors += res.errors;
        throw new Error(`FAA transactional batch persistence failed for ${res.errors} record(s); dedup keys were not committed.`);
      }
      inserted += res.inserted;
      candidateEntitiesInserted += res.candidateEntitiesInserted;
      batchRows.length = 0;
      await batchMarkSeen(pendingDedup);
      pendingDedup.length = 0;

      if (inserted > 0 && inserted % 1_000 === 0) {
        await appendJobLog(jobId, `✈️ ${inserted.toLocaleString()} aircraft assets seeded; ${candidateEntitiesInserted.toLocaleString()} provisional registrant entities created.`);
      }
    }
  }

  if (batchRows.length > 0) {
    const res = await flushBatch(batchRows);
    if (res.errors > 0) {
      errors += res.errors;
      throw new Error(`FAA final transactional batch persistence failed for ${res.errors} record(s); dedup keys were not committed.`);
    }
    inserted += res.inserted;
    candidateEntitiesInserted += res.candidateEntitiesInserted;
    await batchMarkSeen(pendingDedup);
  }

  await appendJobLog(
    jobId,
    `🏁 FAA ingestion complete: ${inserted.toLocaleString()} aircraft assets inserted, ${candidateEntitiesInserted.toLocaleString()} provisional registrant entities created, ${skipped.toLocaleString()} skipped (dedup), ${errors} errors.`,
  );

  return {
    inserted,
    skipped,
    errors,
    durationMs: Date.now() - startTime,
    candidateEntitiesInserted,
  };
}
