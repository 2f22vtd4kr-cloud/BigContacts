/**
 * UK Land Registry — Price Paid Data (PPD) CSV Ingestor
 *
 * Source: HM Land Registry bulk CSV (open data, OGL licence)
 * https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads
 *
 * Downloads the annual PPD CSV files, filters for £1M+ transactions, and
 * inserts asset-only Real Estate transaction records. PPD does not identify the buyer/seller,\n * so an address must never become a synthetic person/company or an owner relationship.
 *
 * The SPARQL endpoint is unreliable for bulk queries; the S3-hosted CSV is
 * the official download route and supports streaming at ~160MB/year.
 *
 * NO synthetic data. Every record is a real HMLR transaction.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, inArray, isNotNull, like, sql } from "drizzle-orm";
import { db, assetsTable, entitiesTable } from "@workspace/db";
import type { InsertAsset } from "@workspace/db";
import { preloadDedupPrefix, batchMarkSeen, updateJob, appendJobLog } from "./job-queue";
import { logger } from "./logger";

const execAsync = promisify(exec);

// ── Constants ─────────────────────────────────────────────────────────────────

// Annual PPD CSV — redirects to prod2 S3 bucket
const PPD_BASE_URL = "http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com";
const TMP_DIR = join(tmpdir(), "apexfinder-hmlr");

// Cache TTL — re-download if file is older than 30 days
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MIN_PRICE_GBP = 1_000_000; // £1M+

// PPD CSV column indices (0-based, comma-delimited, no header row)
const F_TX_ID        = 0;   // {GUID}
const F_PRICE        = 1;   // numeric string
const F_DATE         = 2;   // "YYYY-MM-DD 00:00"
const F_POSTCODE     = 3;
const F_PROP_TYPE    = 4;   // D/S/T/F/O
const F_DURATION     = 6;   // F=Freehold, L=Leasehold, U=Unknown
const F_PAON         = 7;   // primary addressable object name
const F_SAON         = 8;   // secondary addressable object name
const F_STREET       = 9;
const F_LOCALITY     = 10;
const F_TOWN         = 11;
const F_DISTRICT     = 12;
const F_COUNTY       = 13;
const F_PPD_CAT      = 14;  // A=standard, B=additional (skip B for cleaner data)
const F_REC_STATUS   = 15;  // A=Addition, C=Change, D=Delete

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LandRegIngestionParams {
  jobId: string;
  maxRecords?: number;
  forceRefresh?: boolean;
  downloadUrl?: string; // legacy — unused
}

export interface LandRegIngestionResult {
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function csvPath(year: number): string {
  return join(TMP_DIR, `pp-${year}.csv`);
}

async function isCacheStale(path: string): Promise<boolean> {
  if (!existsSync(path)) return true;
  try {
    const s = await stat(path);
    return Date.now() - s.mtimeMs > CACHE_TTL_MS;
  } catch { return true; }
}

/** Parse one PPD CSV row with quoted commas and escaped quotes. */
export function parsePpdCsvRecord(line: string): string[] {
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

export function buildLandRegistryTransactionAsset(input: {
  transactionId: string;
  priceGbp: number;
  date: string;
  propertyTypeCode: string;
  durationCode: string;
  address: string;
  county: string;
  postcode: string;
  paon: string;
  saon: string;
  street: string;
  locality: string;
  town: string;
  year: number;
}): InsertAsset {
  const tenure = input.durationCode === "F" ? "Freehold" : input.durationCode === "L" ? "Leasehold" : "Unknown";
  const propertyType = ({ D: "Detached", S: "Semi-Detached", T: "Terraced", F: "Flat/Maisonette", O: "Other" } as Record<string, string>)[input.propertyTypeCode] ?? "Property";
  const priceLabel = `£${input.priceGbp.toLocaleString("en-GB")}`;
  return {
    category: "RealEstate",
    identifier: input.transactionId,
    jurisdiction: input.county ? `${input.county}, England & Wales` : "England & Wales",
    description: `${propertyType} ${tenure} — ${priceLabel} (${input.date})`,
    address: input.address || undefined,
    sourceRegistry: "UK HM Land Registry (PPD)",
    lastActivityDate: input.date || undefined,
    estimatedValue: null,
    metadata: JSON.stringify({
      source: "hmlr-ppd-csv",
      transactionId: input.transactionId,
      transactionPrice: input.priceGbp,
      transactionCurrency: "GBP",
      transactionDate: input.date,
      propertyTypeCode: input.propertyTypeCode,
      propertyType,
      tenure,
      county: input.county,
      postcode: input.postcode,
      paon: input.paon,
      saon: input.saon,
      street: input.street,
      locality: input.locality,
      town: input.town,
      year: input.year,
      ownerIdentityStatus: "not_disclosed_by_ppd",
      beneficialOwnershipStatus: "unresolved",
      reviewOnly: true,
      wealthStatus: "not_assessed",
    }),
  };
}

// ── Batch flush ───────────────────────────────────────────────────────────────

async function flushBatch(assets: InsertAsset[]): Promise<{ inserted: number; skipped: number; errors: number }> {
  if (assets.length === 0) return { inserted: 0, skipped: 0, errors: 0 };
  try {
    const rows = await db.transaction(async (tx) => {
      const uniqueByTransaction = new Map<string, InsertAsset>();
      for (const asset of assets) {
        if (asset.identifier && !uniqueByTransaction.has(asset.identifier)) uniqueByTransaction.set(asset.identifier, asset);
      }
      const candidates = [...uniqueByTransaction.values()];
      const duplicateCount = assets.length - candidates.length;
      if (candidates.length === 0) return { rows: [], skipped: duplicateCount };
      const existing = await tx.select({ identifier: assetsTable.identifier })
        .from(assetsTable)
        .where(and(
          eq(assetsTable.category, "RealEstate"),
          inArray(assetsTable.identifier, candidates.map((asset) => asset.identifier)),
        ));
      const existingIds = new Set(existing.map((row) => row.identifier));
      const fresh = candidates.filter((asset) => !existingIds.has(asset.identifier));
      if (fresh.length === 0) return { rows: [], skipped: candidates.length + duplicateCount };
      const rows = await tx.insert(assetsTable).values(fresh).returning({ id: assetsTable.id });
      return { rows, skipped: candidates.length - fresh.length + duplicateCount };
    });
    return { inserted: rows.rows.length, skipped: rows.skipped, errors: 0 };
  } catch (err: any) {
    logger.warn({ err: err.message, batchSize: assets.length }, "Land Registry asset-only batch insert failed");
    return { inserted: 0, skipped: 0, errors: assets.length };
  }
}

async function repairLegacyHmlrSyntheticEntities(): Promise<void> {
  await db.transaction(async (tx) => {
    // Old PPD ingestion linked address-generated placeholder entities to assets.
    // The source does not disclose the purchaser, so clear that unsupported FK.
    await tx.update(assetsTable).set({
      ownerEntityId: null,
      metadata: sql`COALESCE(${assetsTable.metadata}::jsonb, '{}'::jsonb) || jsonb_build_object(
        'ownerIdentityStatus', 'not_disclosed_by_ppd',
        'beneficialOwnershipStatus', 'unresolved',
        'wealthStatus', 'not_assessed',
        'legacyOwnerLinkCorrected', true
      )`,
    }).where(and(
      eq(assetsTable.category, "RealEstate"),
      eq(assetsTable.sourceRegistry, "UK HM Land Registry (PPD)"),
      isNotNull(assetsTable.ownerEntityId),
    ));

    // Preserve historical rows for audit, but hide them from target/company views
    // and explicitly mark them as synthetic address-only placeholders.
    await tx.update(entitiesTable).set({
      isHidden: true,
      isHot: false,
      estimatedNetWorth: null,
      bayesianScore: 0.05,
      knownResidences: null,
      notes: "Historical HMLR address-only placeholder retained for audit. PPD does not disclose the purchaser; this is not a person or company target. Use the corresponding asset-only transaction record.",
      metadata: sql`COALESCE(${entitiesTable.metadata}::jsonb, '{}'::jsonb) || jsonb_build_object(
        'legacyHmlrSyntheticAddressEntity', true,
        'identityStatus', 'not_a_person_or_company',
        'ownerIdentityStatus', 'not_disclosed_by_ppd',
        'wealthStatus', 'not_assessed',
        'hnwiQualificationStatus', 'not_assessed',
        'reviewOnly', true
      )`,
    }).where(and(
      eq(entitiesTable.sourceRegistries, JSON.stringify(["UK HM Land Registry (PPD)"])),
      like(entitiesTable.name, "UK Property — %"),
    ));
  });
}

// ── Main ingestion function ───────────────────────────────────────────────────

export async function runLandRegistryIngestion(params: LandRegIngestionParams): Promise<LandRegIngestionResult> {
  const { jobId, maxRecords = 2_000, forceRefresh = false } = params;
  const startTime = Date.now();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await mkdir(TMP_DIR, { recursive: true });
  await updateJob(jobId, { message: "Reconciling legacy HMLR address-only placeholders…" });
  await repairLegacyHmlrSyntheticEntities();

  // Process years newest-first until we hit maxRecords
  const years = [2025, 2024, 2023, 2022];

  // Pre-load existing dedup keys into memory (avoids per-record Upstash calls)
  await updateJob(jobId, { message: "Loading dedup index…", progress: 2 });
  const seenKeys = await preloadDedupPrefix("lr:v2:");
  await appendJobLog(jobId, `📋 ${seenKeys.size.toLocaleString()} previously-ingested Land Registry records in dedup set.`);

  for (const year of years) {
    if (inserted >= maxRecords) break;

    const filePath = csvPath(year);
    const csvUrl = `${PPD_BASE_URL}/pp-${year}.csv`;

    // ── Download if needed ────────────────────────────────────────────────────
    const needsDownload = forceRefresh || await isCacheStale(filePath);
    if (needsDownload) {
      await updateJob(jobId, { message: `Downloading HMLR PPD ${year} CSV…`, progress: 5 });
      await appendJobLog(jobId, `⬇️  Fetching ${csvUrl}`);
      try {
        // -L follows the S3 redirect; --max-time 600 allows for large files
        await execAsync(
          `curl -L --max-time 600 --retry 2 --retry-delay 5 \
            -H "User-Agent: Mozilla/5.0" \
            -o "${filePath}" "${csvUrl}"`,
          { timeout: 620_000 },
        );
        const sizeMB = ((await stat(filePath)).size / 1_048_576).toFixed(1);
        await appendJobLog(jobId, `✅ Download complete (${sizeMB} MB). Scanning records…`);
      } catch (err: any) {
        await appendJobLog(jobId, `⚠️  Download failed for ${year}: ${err.message}. Trying next year.`);
        try { await unlink(filePath); } catch { /* ignore */ }
        continue;
      }
    } else {
      await appendJobLog(jobId, `📦 Using cached PPD ${year} CSV.`);
    }

    // ── Count lines for progress ──────────────────────────────────────────────
    let totalLines = 0;
    try {
      const r = await execAsync(`wc -l < "${filePath}"`, { timeout: 10_000 });
      totalLines = parseInt(r.stdout.trim(), 10) || 0;
    } catch { /* non-fatal */ }

    await updateJob(jobId, { message: `Parsing PPD ${year} (${totalLines.toLocaleString()} records)…`, progress: 8 });

    // ── Stream parse CSV ──────────────────────────────────────────────────────
    const rl = createInterface({
      input: createReadStream(filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    const assetBatch: InsertAsset[] = [];
    const pendingDedup: string[] = [];
    let lineNum = 0;
    let lastProgressLine = 0;

    for await (const line of rl) {
      lineNum++;
      if (inserted + assetBatch.length >= maxRecords) break;

      // Unconditional progress heartbeat every 10,000 lines
      if (lineNum - lastProgressLine >= 10_000) {
        lastProgressLine = lineNum;
        const pct = totalLines > 0
          ? Math.min(8 + Math.floor((lineNum / totalLines) * 85), 94)
          : Math.min(8 + Math.floor((inserted / maxRecords) * 85), 94);
        await updateJob(jobId, {
          message: `PPD ${year}: scanned ${lineNum.toLocaleString()} lines — ${inserted.toLocaleString()} records matched…`,
          progress: pct,
          inserted,
        });
      }

      // PPD CSV fields may contain quoted commas in addresses; use the CSV parser.
      const raw = parsePpdCsvRecord(line);
      if (raw.length < 15) continue;

      const txId       = (raw[F_TX_ID] ?? "").trim();
      const priceStr   = (raw[F_PRICE] ?? "").trim();
      const date       = (raw[F_DATE] ?? "").trim().split(" ")[0] ?? "";
      const postcode   = (raw[F_POSTCODE] ?? "").trim();
      const propType   = (raw[F_PROP_TYPE] ?? "").trim();
      const duration   = (raw[F_DURATION] ?? "").trim();
      const paon       = (raw[F_PAON] ?? "").trim();
      const saon       = (raw[F_SAON] ?? "").trim();
      const street     = (raw[F_STREET] ?? "").trim();
      const locality   = (raw[F_LOCALITY] ?? "").trim();
      const town       = (raw[F_TOWN] ?? "").trim();
      const county     = (raw[F_COUNTY] ?? "").trim();
      const address = [saon, paon, street, locality, town, county, postcode].filter(Boolean).join(", ");
      const ppdCat     = (raw[F_PPD_CAT] ?? "").trim();
      const recStatus  = (raw[F_REC_STATUS] ?? "").trim();

      // Skip deletes and additional category (B = repo/auction sales)
      if (recStatus === "D" || ppdCat === "B") continue;

      const price = parseInt(priceStr, 10);
      if (isNaN(price) || price < MIN_PRICE_GBP) continue;
      if (!txId || !date) continue;

      // Dedup by transaction ID (in-memory — no Upstash per-record call)
      const dkey = `lr:v2:${txId}`;
      if (seenKeys.has(dkey)) { skipped++; continue; }
      seenKeys.add(dkey);
      pendingDedup.push(dkey);

      const asset = buildLandRegistryTransactionAsset({
        transactionId: txId,
        priceGbp: price,
        date,
        propertyTypeCode: propType,
        durationCode: duration,
        address,
        county,
        postcode,
        paon,
        saon,
        street,
        locality,
        town,
        year,
      });

      assetBatch.push(asset);

      if (assetBatch.length >= 50) {
        const res = await flushBatch(assetBatch);
        if (res.errors > 0) throw new Error(`HMLR asset-only batch persistence failed for ${res.errors} transaction(s); dedup keys were not committed.`);
        inserted += res.inserted;
        skipped += res.skipped;
        assetBatch.length = 0;

        // Only persist dedup keys after the asset rows have committed.
        await batchMarkSeen(pendingDedup);
        pendingDedup.length = 0;

        const pct = Math.min(8 + Math.floor((inserted / maxRecords) * 85), 95);
        await updateJob(jobId, { message: `${inserted.toLocaleString()} UK property transaction asset records matched…`, progress: pct, inserted });

        if (inserted % 500 === 0) {
          await appendJobLog(jobId, `🏠 ${inserted.toLocaleString()} £1M+ UK property records ingested…`);
        }
      }
    }

    // Flush remaining
    if (assetBatch.length > 0) {
      const res = await flushBatch(assetBatch);
      if (res.errors > 0) throw new Error(`HMLR final asset-only batch persistence failed for ${res.errors} transaction(s); dedup keys were not committed.`);
      inserted += res.inserted;
      skipped += res.skipped;
      await batchMarkSeen(pendingDedup);
    }
  }

  await appendJobLog(
    jobId,
    `🏁 HMLR PPD asset-only complete: ${inserted.toLocaleString()} transaction assets inserted, ${skipped.toLocaleString()} skipped (dedup), ${errors} errors.`,
  );

  return { inserted, skipped, errors, durationMs: Date.now() - startTime };
}
