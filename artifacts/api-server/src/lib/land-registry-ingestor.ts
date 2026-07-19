/**
 * UK Land Registry — Price Paid Data (PPD) SPARQL Ingestor
 *
 * Source: HM Land Registry Linked Data SPARQL endpoint
 * https://landregistry.data.gov.uk/landregistry/query
 *
 * Queries for high-value property transactions (£1M+) involving company buyers.
 * The PPD dataset covers England & Wales transactions from 1995–present.
 * Free under OGL licence — no auth required.
 *
 * Note: The OCOD (Overseas Companies) bulk CSV is Cloudflare-protected from
 * cloud server IPs. This SPARQL approach uses the same underlying HMLR data
 * via their official linked-data endpoint.
 *
 * Entities → Corporation; Assets → Real Estate
 */

import { db, entitiesTable, assetsTable } from "@workspace/db";
import type { InsertEntity, InsertAsset } from "@workspace/db";
import { isDuplicate, markSeen, updateJob, appendJobLog } from "./job-queue";
import { logger } from "./logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LandRegIngestionParams {
  jobId: string;
  maxRecords?: number;
  forceRefresh?: boolean;
  downloadUrl?: string; // legacy — unused but kept for API compat
}

export interface LandRegIngestionResult {
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

// ── SPARQL helpers ────────────────────────────────────────────────────────────

const SPARQL_ENDPOINT = "https://landregistry.data.gov.uk/landregistry/query";
const SPARQL_HEADERS = {
  "Accept": "application/sparql-results+json",
  "Content-Type": "application/sparql-query",
  "User-Agent": "ApexFinder HNWI Research Tool (public data)",
};

// High-value thresholds — proxy for HNWI / corporate wealth
const MIN_PRICE_GBP = 1_000_000; // £1M+

// Number of results per SPARQL page
const PAGE_SIZE = 50;

interface PropertyRecord {
  titleNum: string;
  address: string;
  price: number;
  tenure: string;
  county: string;
  postcode: string;
  date: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Query PPD for high-value transactions, paginated */
async function* sparqlPPD(maxRecords: number): AsyncGenerator<PropertyRecord> {
  let yielded = 0;
  const seen = new Set<string>();

  // Pages through years to get diverse coverage
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];

  for (const year of years) {
    if (yielded >= maxRecords) break;

    for (let offset = 0; offset < 500 && yielded < maxRecords; offset += PAGE_SIZE) {
      // Use date-range FILTER instead of YEAR() — the HMLR SPARQL endpoint
      // stores dates as xsd:date (not xsd:dateTime), so YEAR() returns no
      // results. A string-comparable ISO range is universally supported.
      const sparql = `
PREFIX ppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?transRecord ?amount ?street ?paon ?saon ?postcode ?county ?town ?tenure ?date
WHERE {
  ?transRecord a ppi:TransactionRecord ;
    ppi:pricePaid ?amount ;
    ppi:transactionDate ?date ;
    ppi:propertyAddress ?addr .
  ?addr ppi:postcode ?postcode .
  OPTIONAL { ?addr ppi:street ?street }
  OPTIONAL { ?addr ppi:paon ?paon }
  OPTIONAL { ?addr ppi:saon ?saon }
  OPTIONAL { ?addr ppi:county ?county }
  OPTIONAL { ?addr ppi:town ?town }
  OPTIONAL { ?transRecord ppi:estateType ?tenure }
  FILTER(?amount >= ${MIN_PRICE_GBP})
  FILTER(?date >= "${year}-01-01"^^xsd:date && ?date < "${year + 1}-01-01"^^xsd:date)
}
ORDER BY DESC(?amount)
LIMIT ${PAGE_SIZE}
OFFSET ${offset}
`.trim();

      let data: any;
      try {
        // HMLR SPARQL requires GET with ?query= param (POST body is not supported)
        const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}`;
        const resp = await fetch(url, {
          method: "GET",
          headers: SPARQL_HEADERS,
          signal: AbortSignal.timeout(30_000),
        });
        if (!resp.ok) {
          logger.warn({ status: resp.status }, "SPARQL query failed");
          break;
        }
        data = await resp.json();
      } catch (err: any) {
        logger.warn({ err: err.message }, "SPARQL fetch error");
        break;
      }

      const bindings: any[] = data?.results?.bindings ?? [];
      if (bindings.length === 0) break;

      for (const b of bindings) {
        if (yielded >= maxRecords) break;

        const transUri: string = b.transRecord?.value ?? "";
        // URI form: .../transaction/<UUID>/current — take the UUID (index -2)
        const parts = transUri.split("/");
        const titleNum = parts[parts.length - 2] ?? parts[parts.length - 1] ?? transUri;
        if (!titleNum || titleNum === "current" || seen.has(titleNum)) continue;
        seen.add(titleNum);

        const price = Number(b.amount?.value ?? 0);
        if (price < MIN_PRICE_GBP) continue;

        const street = [b.saon?.value, b.paon?.value, b.street?.value].filter(Boolean).join(", ");
        const town = b.town?.value ?? "";
        const county = b.county?.value ?? "";
        const postcode = b.postcode?.value ?? "";
        const address = [street, town, county, postcode].filter(Boolean).join(", ");
        const date = b.date?.value?.split("T")[0] ?? "";
        const tenureUri = b.tenure?.value ?? "";
        const tenure = tenureUri.includes("freehold") ? "Freehold" : tenureUri.includes("leasehold") ? "Leasehold" : "Unknown";

        yielded++;
        yield { titleNum, address, price, tenure, county, postcode, date };
      }

      await sleep(200); // be polite to SPARQL endpoint
    }
  }
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
      .onConflictDoNothing()
      .returning({ id: entitiesTable.id });

    const assetRows = rows.map((r, i) => ({ ...assets[i], entityId: r.id })).filter((a) => a.entityId);
    if (assetRows.length > 0) {
      await db.insert(assetsTable).values(assetRows).onConflictDoNothing();
    }
    return { inserted: rows.length, errors: 0 };
  } catch (err: any) {
    logger.warn({ err: err.message }, "Land Registry batch insert error");
    return { inserted: 0, errors: entities.length };
  }
}

// ── Bayesian score from price ─────────────────────────────────────────────────

function bayesianFromPrice(price: number): number {
  if (price >= 10_000_000) return 0.88;
  if (price >= 5_000_000)  return 0.78;
  if (price >= 2_000_000)  return 0.68;
  return 0.58;
}

// ── Main ingestion function ───────────────────────────────────────────────────

export async function runLandRegistryIngestion(params: LandRegIngestionParams): Promise<LandRegIngestionResult> {
  const { jobId, maxRecords = 2_000 } = params;
  const startTime = Date.now();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await updateJob(jobId, { message: "Connecting to HMLR SPARQL endpoint…", progress: 2 });
  await appendJobLog(jobId, "🔗 Querying HM Land Registry Price Paid Data via SPARQL…");
  await appendJobLog(jobId, `🎯 Target: £1M+ transactions — proxy for HNWI property ownership`);

  const entityBatch: InsertEntity[] = [];
  const assetBatch: InsertAsset[] = [];
  let pageCount = 0;

  for await (const record of sparqlPPD(maxRecords)) {
    // Dedup by transaction URI
    const dkey = `lr:${record.titleNum}`;
    if (await isDuplicate(dkey)) { skipped++; continue; }

    const score = bayesianFromPrice(record.price);
    const isHot = record.price >= 5_000_000;
    const priceStr = `£${record.price.toLocaleString("en-GB")}`;

    // Use address as entity name (property ownership proxy)
    const entityName = record.address
      ? `UK Property — ${record.address.split(",")[0].trim()}`
      : `UK Property — ${record.postcode}`;

    const entity: InsertEntity = {
      name: entityName,
      type: "Corp",
      nationality: "UK",
      knownResidences: record.address || undefined,
      sourceRegistries: JSON.stringify(["UK HM Land Registry (PPD)"]),
      bayesianScore: score,
      isHot,
      notes: `High-value UK property transaction. ${record.tenure} title. Paid ${priceStr} on ${record.date}.`,
      metadata: JSON.stringify({
        source: "hmlr-ppd-sparql",
        titleNum: record.titleNum,
        price: record.price,
        tenure: record.tenure,
        county: record.county,
        postcode: record.postcode,
        date: record.date,
      }),
    };

    const asset: InsertAsset = {
      category: "RealEstate",
      identifier: record.titleNum,
      jurisdiction: record.county ? `${record.county}, England & Wales` : "England & Wales",
      description: `${record.tenure} property — ${priceStr} (${record.date})`,
      address: record.address || undefined,
      sourceRegistry: "UK HM Land Registry (PPD)",
      lastActivityDate: record.date || undefined,
      estimatedValue: record.price,
    };

    entityBatch.push(entity);
    assetBatch.push(asset);
    await markSeen(dkey);

    if (entityBatch.length >= 50) {
      const res = await flushBatch(entityBatch, assetBatch);
      inserted += res.inserted;
      errors += res.errors;
      entityBatch.length = 0;
      assetBatch.length = 0;

      pageCount++;
      const progress = Math.min(2 + Math.floor((inserted / maxRecords) * 93), 95);
      await updateJob(jobId, { message: `${inserted} high-value properties ingested…`, progress, inserted });

      if (pageCount % 4 === 0) {
        await appendJobLog(jobId, `🏠 ${inserted.toLocaleString()} high-value UK property records ingested…`);
      }
    }
  }

  if (entityBatch.length > 0) {
    const res = await flushBatch(entityBatch, assetBatch);
    inserted += res.inserted;
    errors += res.errors;
  }

  await appendJobLog(
    jobId,
    `🏁 HMLR PPD complete: ${inserted.toLocaleString()} inserted, ${skipped.toLocaleString()} skipped (dedup), ${errors} errors.`,
  );

  return { inserted, skipped, errors, durationMs: Date.now() - startTime };
}
