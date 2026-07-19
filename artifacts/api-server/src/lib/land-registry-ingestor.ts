/**
 * UK Land Registry — Overseas Companies Owning Property (OCOD) Ingestor
 *
 * Source: HM Land Registry "Overseas companies that own property in England and Wales"
 * https://use-land-property-data.service.gov.uk/datasets/ocod
 *
 * The OCOD dataset lists every overseas-incorporated company that owns freehold
 * or leasehold property in England and Wales — a direct proxy for offshore wealth.
 * Updated monthly by HMLR. Free under OGL licence.
 *
 * CSV columns (0-based):
 *  0  Title Number
 *  1  Tenure (Freehold/Leasehold)
 *  2  Property Address
 *  3  District
 *  4  County
 *  5  Region
 *  6  Postcode
 *  7  Multiple Address Indicator
 *  8  Price Paid
 *  9  Proprietor Name (1)
 * 10  Company Registration No. (1)
 * 11  Proprietorship Category (1)
 * 12  Country Incorporated (1)
 * 13  Date Proprietor Added
 * 14  Additional Proprietor Indicator
 * 15  Proprietor Name (2) ... (repeated up to 4)
 *
 * Entities → Corporation (overseas company); Assets → Real Estate
 *
 * Dedup by Title Number via Redis.
 */

import { createInterface } from "node:readline";
import { createWriteStream, createReadStream, existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { db, entitiesTable, assetsTable } from "@workspace/db";
import type { InsertEntity, InsertAsset } from "@workspace/db";
import { isDuplicate, markSeen, updateJob, appendJobLog } from "./job-queue";
import { logger } from "./logger";

// ── Constants ─────────────────────────────────────────────────────────────────

// HMLR provide the OCOD dataset as a free download — URL may change each monthly release.
// The stable redirect URL below is the canonical public dataset URL.
const OCOD_URL = "https://use-land-property-data.service.gov.uk/files/ocod/OCOD_FULL.csv";
const OCOD_FALLBACK = "https://landregistry.data.gov.uk/files/ocod/OCOD_FULL.csv";

const TMP_DIR = join(tmpdir(), "apexfinder-landreg");
const CSV_PATH = join(TMP_DIR, "OCOD_FULL.csv");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (monthly updates)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LandRegIngestionParams {
  jobId: string;
  maxRecords?: number;
  forceRefresh?: boolean;
  downloadUrl?: string; // override if HMLR rotates the URL
}

export interface LandRegIngestionResult {
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePrice(raw: string): number | undefined {
  const n = Number(raw.replace(/[^0-9]/g, ""));
  return isNaN(n) || n === 0 ? undefined : n;
}

async function isCacheStale(): Promise<boolean> {
  if (!existsSync(CSV_PATH)) return true;
  try {
    const s = await stat(CSV_PATH);
    return Date.now() - s.mtimeMs > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

async function downloadCsv(url: string, jobId: string): Promise<void> {
  await appendJobLog(jobId, `⬇️  Fetching OCOD CSV from ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "ApexFinder HNWI Research Tool (public data)" },
    signal: AbortSignal.timeout(300_000),
    redirect: "follow",
  });

  if (!res.ok || !res.body) {
    throw new Error(
      `HMLR download failed: HTTP ${res.status}. ` +
        `Visit https://use-land-property-data.service.gov.uk/datasets/ocod ` +
        `to get a fresh download URL and pass it as downloadUrl parameter.`,
    );
  }

  await mkdir(TMP_DIR, { recursive: true });
  const writer = createWriteStream(CSV_PATH);
  const reader = res.body.getReader();

  // Stream to disk without loading into memory
  await new Promise<void>((resolve, reject) => {
    writer.on("error", reject);
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!writer.write(value)) {
            await new Promise<void>((r) => writer.once("drain", r));
          }
        }
        writer.end();
        writer.once("finish", resolve);
      } catch (e) {
        reject(e);
      }
    })();
  });

  await appendJobLog(jobId, "✅ CSV downloaded. Streaming records…");
}

// ── Batch flush ───────────────────────────────────────────────────────────────

async function flushBatch(
  entities: InsertEntity[],
  assets: InsertAsset[],
): Promise<{ inserted: number; errors: number }> {
  if (entities.length === 0) return { inserted: 0, errors: 0 };
  try {
    const rows = await db
      .insert(entitiesTable)
      .values(entities)
      .returning({ id: entitiesTable.id });

    const assetRows: InsertAsset[] = assets.map((a, i) => ({
      ...a,
      ownerEntityId: rows[i]?.id,
    }));
    if (assetRows.length > 0) {
      await db.insert(assetsTable).values(assetRows);
    }

    return { inserted: rows.length, errors: 0 };
  } catch (err: any) {
    logger.warn({ err: err.message }, "Land Registry batch insert error");
    return { inserted: 0, errors: entities.length };
  }
}

// ── Main ingestor ─────────────────────────────────────────────────────────────

export async function runLandRegistryIngestion(
  params: LandRegIngestionParams,
): Promise<LandRegIngestionResult> {
  const { jobId, maxRecords = 50_000, forceRefresh = false, downloadUrl } = params;
  const startTime = Date.now();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await mkdir(TMP_DIR, { recursive: true });

  // ── Step 1: Download CSV ───────────────────────────────────────────────────
  const needsDownload = forceRefresh || (await isCacheStale());

  if (needsDownload) {
    await updateJob(jobId, { message: "Downloading UK OCOD dataset…", progress: 1 });
    const url = downloadUrl ?? OCOD_URL;
    try {
      await downloadCsv(url, jobId);
    } catch (primaryErr: any) {
      if (!downloadUrl) {
        // Try fallback URL
        await appendJobLog(jobId, `⚠️  Primary URL failed, trying fallback…`);
        try {
          await downloadCsv(OCOD_FALLBACK, jobId);
        } catch {
          throw primaryErr; // surface original error
        }
      } else {
        throw primaryErr;
      }
    }
  } else {
    await appendJobLog(jobId, "📦 Using cached OCOD dataset (< 30 days old).");
  }

  // ── Step 2: Stream-parse CSV ───────────────────────────────────────────────
  await updateJob(jobId, { message: "Parsing OCOD CSV…", progress: 8 });

  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  const entityBatch: InsertEntity[] = [];
  const assetBatch: InsertAsset[] = [];
  let headerParsed = false;

  for await (const line of rl) {
    lineNum++;
    if (inserted + entityBatch.length >= maxRecords) break;

    // Skip CSV header
    if (!headerParsed) {
      headerParsed = true;
      continue;
    }

    // Parse CSV line (handles quoted fields with commas)
    const fields = parseCsvLine(line);
    if (fields.length < 13) continue;

    const titleNumber    = fields[0]?.trim() ?? "";
    const tenure         = fields[1]?.trim() ?? "";
    const propertyAddr   = fields[2]?.trim() ?? "";
    const district       = fields[3]?.trim() ?? "";
    const county         = fields[4]?.trim() ?? "";
    const postcode       = fields[6]?.trim() ?? "";
    const rawPrice       = fields[8]?.trim() ?? "";
    const rawOwnerName   = fields[9]?.trim() ?? "";
    const compRegNo      = fields[10]?.trim() ?? "";
    const countryIncorp  = fields[12]?.trim() ?? "";
    const dateAdded      = fields[13]?.trim() ?? "";

    if (!titleNumber || !rawOwnerName || rawOwnerName.length < 2) continue;

    // Dedup by Title Number via Redis
    const dkey = `landreg:${titleNumber}`;
    if (await isDuplicate(dkey)) { skipped++; continue; }

    const ownerName = titleCase(rawOwnerName);
    const address = [propertyAddr, district, county, postcode].filter(Boolean).join(", ");
    const pricePaid = parsePrice(rawPrice);

    // Build entity record (overseas corporation)
    const entity: InsertEntity = {
      name: ownerName,
      type: "Corporation",
      nationality: countryIncorp || "Unknown",
      sourceRegistries: JSON.stringify(["UK HM Land Registry (OCOD)"]),
      bayesianScore: pricePaid ? Math.min(0.4 + (pricePaid / 10_000_000) * 0.4, 0.85) : 0.5,
      isHot: !!pricePaid && pricePaid >= 5_000_000, // £5m+ property = hot
      notes: `Overseas company owning UK ${tenure.toLowerCase()} property. Incorporated in ${countryIncorp}.`,
      metadata: JSON.stringify({
        source: "uk-land-registry-ocod",
        titleNumber,
        companyRegistrationNo: compRegNo || undefined,
        countryIncorporated: countryIncorp,
        tenure,
        dateProprietorAdded: dateAdded || undefined,
        downloadDate: new Date().toISOString().split("T")[0],
      }),
    };

    // Build asset record (real estate)
    const asset: InsertAsset = {
      category: "Real Estate",
      identifier: titleNumber,
      jurisdiction: `England & Wales${county ? ` — ${county}` : ""}`,
      description: `${tenure} property — ${propertyAddr}${pricePaid ? ` (£${pricePaid.toLocaleString()})` : ""}`,
      address: address || undefined,
      sourceRegistry: "UK HM Land Registry (OCOD)",
      estimatedValue: pricePaid,
      lastActivityDate: dateAdded || new Date().toISOString().split("T")[0],
    };

    entityBatch.push(entity);
    assetBatch.push(asset);
    await markSeen(dkey);

    // Flush every 100 records
    if (entityBatch.length >= 100) {
      const res = await flushBatch(entityBatch, assetBatch);
      inserted += res.inserted;
      errors += res.errors;
      entityBatch.length = 0;
      assetBatch.length = 0;

      const progress = Math.min(8 + Math.floor((inserted / maxRecords) * 87), 95);
      await updateJob(jobId, {
        message: `Ingested ${inserted.toLocaleString()} overseas property owners…`,
        progress,
        inserted,
      });

      if (inserted % 5_000 === 0) {
        await appendJobLog(
          jobId,
          `🏠 ${inserted.toLocaleString()} overseas property owners ingested…`,
        );
      }
    }
  }

  // Flush remainder
  if (entityBatch.length > 0) {
    const res = await flushBatch(entityBatch, assetBatch);
    inserted += res.inserted;
    errors += res.errors;
  }

  await appendJobLog(
    jobId,
    `🏁 Land Registry OCOD complete: ${inserted.toLocaleString()} inserted, ${skipped.toLocaleString()} skipped (dedup), ${errors} errors.`,
  );

  return { inserted, skipped, errors, durationMs: Date.now() - startTime };
}

// ── CSV parser — handles quoted fields containing commas ──────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
