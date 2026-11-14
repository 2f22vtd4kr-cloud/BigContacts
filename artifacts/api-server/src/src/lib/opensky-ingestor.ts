/**
 * Live ADS-B — Privacy-Safe Aircraft Status Enricher
 *
 * Fetches the live aircraft state vectors from the OpenSky Network REST API
 * and matches them against aviation assets already in our database (ingested
 * via the FAA registry). When a match is found, it updates the asset's
 * lastActivityDate and enriches its metadata with the latest flight position,
 * altitude, and speed.
 *
 * This is a *latest-status enrichment* pass, not a bulk ingest or tracking history.
 * Run manually when needed; previous positions and routes are never retained.
 *
 * Primary API: https://api.adsb.lol/v2/point/0/0/25000
 *      Free, public global ADS-B feed; no application key required.
 * Fallback API: https://api.airplanes.live/v2/{registration|hex|callsign}/...
 *      Free public targeted lookup when the global feed is unavailable.
 *
 * Matching strategy:
 *   ADS-B registration (or OpenSky callsign) === our aviation asset identifier
 *   (N-number). The adsb.lol readsb feed exposes registration as `r`, while
 *   OpenSky exposes the same value through its callsign field.
 *
 * State vector fields (array index):
 *   0=icao24, 1=callsign, 2=origin_country, 3=time_position,
 *   4=last_contact, 5=longitude, 6=latitude, 7=baro_altitude,
 *   8=on_ground, 9=velocity (m/s), 10=true_track (deg),
 *   11=vertical_rate (m/s), 13=geo_altitude, 14=squawk
 */

import { db, assetsTable, entitiesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { updateJob, appendJobLog } from "./job-queue";
import { logger } from "./logger";
import { readsbToStateVector, type ReadsbAircraft, type StateVector } from "./opensky-normalize";
import { buildPrivacySafeOpenSkyObservation } from "./opensky-privacy";

export interface OpenSkyEnrichParams {
  jobId: string;
}

export interface OpenSkyEnrichResult {
  inserted: number;   // assets updated with fresh flight data
  skipped: number;    // no live match found
  errors: number;
  liveAircraft: number; // total aircraft in the air at query time
  durationMs: number;
}

interface OpenSkyResponse {
  time: number;
  states: StateVector[] | null;
}

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const ADSB_LOL_GLOBAL_URL = "https://api.adsb.lol/v2/point/0/0/25000";

interface ReadsbResponse {
  ac?: ReadsbAircraft[];
  total?: number;
}

async function fetchReadsb(url: string): Promise<ReadsbAircraft[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ApexAtlas/1.0 (public OSINT research)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as ReadsbResponse;
  return data.ac ?? [];
}

async function fetchLiveStates(): Promise<{ states: StateVector[]; source: string }> {
  const failures: string[] = [];
  try {
    const aircraft = await fetchReadsb(ADSB_LOL_GLOBAL_URL);
    return { states: aircraft.map(readsbToStateVector), source: "adsb.lol" };
  } catch (err: any) {
    failures.push(`adsb.lol: ${err.message}`);
  }

  // OpenSky remains a compatibility fallback for installations where the
  // public ADS-B feed is temporarily unavailable.
  try {
    const res = await fetch(OPENSKY_URL, {
      headers: { Accept: "application/json", "User-Agent": "ApexAtlas/1.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as OpenSkyResponse;
    return { states: data.states ?? [], source: "opensky-network" };
  } catch (err: any) {
    failures.push(`OpenSky: ${err.message}`);
  }

  throw new Error(`No live ADS-B source available (${failures.join("; ")})`);
}

export async function runOpenSkyEnrichment(
  params: OpenSkyEnrichParams,
): Promise<OpenSkyEnrichResult> {
  const { jobId } = params;
  const startTime = Date.now();
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  await updateJob(jobId, { message: "Loading aviation assets from DB…", progress: 5 });
  const assets = await db
    .select({
      id: assetsTable.id,
      identifier: assetsTable.identifier,
      ownerEntityId: assetsTable.ownerEntityId,
      metadata: assetsTable.metadata,
    })
    .from(assetsTable)
    .where(eq(assetsTable.category, "Aviation"));

  if (assets.length === 0) {
    await appendJobLog(jobId, "✈️  No aviation assets in DB — skip live ADS-B fetch.");
    await updateJob(jobId, { status: "done", progress: 100, message: "No aviation assets to match" });
    return { inserted: 0, skipped: 0, errors: 0, liveAircraft: 0, durationMs: Date.now() - startTime };
  }

  await updateJob(jobId, { message: "Querying free public ADS-B feeds for latest aircraft status…", progress: 10 });
  await appendJobLog(jobId, "✈️  Fetching public ADS-B state feed; only coarse latest status will be retained (OpenSky fallback enabled)…");

  let states: StateVector[] = [];
  let liveSource = "unknown";

  try {
    const live = await fetchLiveStates();
    states = live.states;
    liveSource = live.source;
    await appendJobLog(jobId, `📡 ${states.length.toLocaleString()} aircraft returned by ${live.source}.`);
  } catch (err: any) {
    throw new Error(`Live ADS-B fetch failed: ${err.message}`);
  }

  await updateJob(jobId, { message: `Building aircraft registration index (${states.length} live aircraft)…`, progress: 15, total: states.length });

  const callsignMap = new Map<string, StateVector>();
  for (const sv of states) {
    const raw = sv[1];
    if (typeof raw === "string") {
      const cs = raw.trim().toUpperCase();
      if (cs) callsignMap.set(cs, sv);
    }
  }

  await updateJob(jobId, {
    total: assets.length,
    message: `Matching ${assets.length} aviation assets against ${callsignMap.size} current public registrations…`,
    progress: 25,
  });
  await appendJobLog(jobId, `🗂  ${assets.length} aviation assets loaded. Matching against live traffic…`);

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    const identifier = (asset.identifier ?? "").toUpperCase();
    if (!identifier) { skipped++; continue; }

    const sv = callsignMap.get(identifier);
    if (!sv) { skipped++; continue; }

    try {
      const icao24 = String(sv[0] ?? "");
      const baroAlt = typeof sv[7] === "number" ? sv[7] : null;
      const onGround = Boolean(sv[8]);
      const velocity = typeof sv[9] === "number" ? sv[9] : null;
      const flightData = buildPrivacySafeOpenSkyObservation({
        icao24,
        onGround,
        altitudeMeters: baroAlt,
        speedMetersPerSecond: velocity,
        observedAt: new Date(),
        source: liveSource,
      });

      const existingMeta = (() => {
        try { return JSON.parse(asset.metadata ?? "{}"); } catch { return {}; }
      })();

      await db
        .update(assetsTable)
        .set({
          lastActivityDate: new Date().toISOString().split("T")[0],
          metadata: JSON.stringify({ ...existingMeta, opensky: flightData }),
        })
        .where(sql`${assetsTable.id} = ${asset.id}`);

      updated++;

      await appendJobLog(
        jobId,
        `✈️  ${identifier} latest public status: ${onGround ? "ON GROUND" : "AIRBORNE"} — approx ${flightData.altitudeBandFt?.toLocaleString() ?? "?"}ft / ${flightData.speedBandKnots ?? "?"}kts; no position or route retained.`,
      );
    } catch (err: any) {
      logger.warn({ err: err.message, asset: asset.identifier }, "OpenSky update error");
      errors++;
    }

    if ((i + 1) % 500 === 0) {
      const progress = Math.min(25 + Math.floor(((i + 1) / assets.length) * 70), 95);
      await updateJob(jobId, {
        progress,
        inserted: updated,
        skipped,
        errors,
        message: `Checked ${i + 1}/${assets.length} assets — ${updated} latest-status observations recorded…`,
      });
    }
  }

  await appendJobLog(
    jobId,
    `🏁 Latest ADS-B status refresh complete: ${updated} matched aircraft statuses recorded, ${skipped} no current match, ${errors} errors. No positions or routes retained.`,
  );

  return {
    inserted: updated,
    skipped,
    errors,
    liveAircraft: states.length,
    durationMs: Date.now() - startTime,
  };
}
