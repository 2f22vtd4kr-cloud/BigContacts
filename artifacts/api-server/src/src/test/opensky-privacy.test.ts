import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildPrivacySafeOpenSkyObservation, redactLegacyOpenSkyPositionLog, sanitizeOpenSkyMetadataJson, sanitizeOpenSkyMetadataRecord } from "../lib/opensky-privacy";

const assetsRoute = readFileSync(new URL("../routes/assets.ts", import.meta.url), "utf8");
const entitiesRoute = readFileSync(new URL("../routes/entities.ts", import.meta.url), "utf8");
const ingestRoute = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");
const ingestPipelineRoute = readFileSync(new URL("../routes/ingest-pipeline.ts", import.meta.url), "utf8");
const canonicalTarget = readFileSync(new URL("../lib/canonical-seeded-target.ts", import.meta.url), "utf8");

describe("ADS-B privacy boundary wiring", () => {
  it("sanitizes metadata on asset create, update, list and detail API paths", () => {
    expect(assetsRoute).toContain("sanitizeOpenSkyMetadataJson(parsed.data.metadata)");
    expect(assetsRoute).toContain("sanitizeOpenSkyMetadataJson(body.data.metadata)");
    expect(assetsRoute).toContain("sanitizeOpenSkyMetadataJson(asset.metadata)");
    expect(assetsRoute).toContain("sanitizeOpenSkyMetadataJson(row.asset.metadata)");
  });

  it("sanitizes the legacy entity OpenSky endpoint as well as the generic asset endpoints", () => {
    expect(entitiesRoute).toContain('import { sanitizeOpenSkyMetadataJson } from "../lib/opensky-privacy";');
    expect(entitiesRoute).toContain("JSON.parse(sanitizeOpenSkyMetadataJson(a.metadata) ?? \"{}\")");
  });

  it("redacts coordinate-bearing legacy job logs before returning them", () => {
    expect(ingestRoute).toContain('job.type === "opensky"');
    expect(ingestRoute).toContain("log.map(redactLegacyOpenSkyPositionLog)");
  });

  it("redacts legacy ADS-B coordinates from the aggregate active-job summary", () => {
    expect(ingestPipelineRoute).toContain('import { redactLegacyOpenSkyPositionLog } from "../lib/opensky-privacy";');
    expect(ingestPipelineRoute).toContain('def.id === "opensky" ? redactLegacyOpenSkyPositionLog(state?.message ?? "")');
  });

  it("does not copy raw ADS-B metadata into canonical Investigator asset context", () => {
    expect(canonicalTarget).toContain("const assetSourceFields = [");
    expect(canonicalTarget).not.toContain('"opensky"');
    expect(canonicalTarget).toContain("sourceMetadata: assetSourceMetadata");
  });
});

describe("privacy-safe latest ADS-B observation", () => {
  it("stores only coarse current status and never coordinates, callsigns, bearings or route history", () => {
    const observation = buildPrivacySafeOpenSkyObservation({
      icao24: "ABC123",
      onGround: false,
      altitudeMeters: 3_505,
      speedMetersPerSecond: 120,
      observedAt: new Date("2026-11-14T12:37:45.000Z"),
      source: "adsb.lol",
    });

    expect(observation).toEqual({
      icao24: "abc123",
      status: "airborne",
      altitudeBandFt: 11_000,
      speedBandKnots: 230,
      observedAtHour: "2026-11-14T12:00:00.000Z",
      source: "adsb.lol",
      privacyScope: "latest_public_status_only_no_coordinates_or_route_history",
    });
    expect(JSON.stringify(observation)).not.toMatch(/"(latitude|longitude|callsign|track|squawk|originCountry|routeHistory)"/i);
  });

  it("keeps unavailable measurements null and records ground status", () => {
    const observation = buildPrivacySafeOpenSkyObservation({
      icao24: null,
      onGround: true,
      altitudeMeters: null,
      speedMetersPerSecond: null,
      observedAt: new Date("2026-11-14T00:59:59.000Z"),
      source: "opensky",
    });

    expect(observation.status).toBe("on_ground");
    expect(observation.altitudeBandFt).toBeNull();
    expect(observation.speedBandKnots).toBeNull();
    expect(observation.observedAtHour).toBe("2026-11-14T00:00:00.000Z");
  });

  it("does not infer airborne status when the source omits the ground flag", () => {
    const observation = buildPrivacySafeOpenSkyObservation({
      icao24: "abc123",
      onGround: null,
      altitudeMeters: null,
      speedMetersPerSecond: null,
      observedAt: new Date("2026-11-14T01:00:00.000Z"),
      source: "opensky",
    });
    expect(observation.status).toBe("unknown");
  });

  it("sanitizes legacy persisted ADS-B metadata before it reaches the model or UI", () => {
    const sanitized = sanitizeOpenSkyMetadataRecord({
      sourceRegistry: "FAA Releasable Aircraft Database",
      opensky: {
        icao24: "ABC123",
        callsign: "N123AB",
        latitude: 40.12,
        longitude: -74.00,
        altitudeFt: 11_499,
        onGround: false,
        speedKnots: 233,
        trackDeg: 180,
        squawk: "1234",
        lastSeenAt: "2026-11-14T12:37:45.000Z",
        source: "adsb.lol",
      },
    });
    expect(sanitized.sourceRegistry).toBe("FAA Releasable Aircraft Database");
    expect(sanitized.opensky).toEqual({
      icao24: "abc123",
      status: "airborne",
      altitudeBandFt: 11_000,
      speedBandKnots: 230,
      observedAtHour: "2026-11-14T12:00:00.000Z",
      source: "adsb.lol",
      privacyScope: "latest_public_status_only_no_coordinates_or_route_history",
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/latitude|longitude|callsign|trackDeg|squawk/i);
  });

  it("fails closed on malformed legacy metadata and redacts old coordinate-bearing logs", () => {
    expect(sanitizeOpenSkyMetadataJson("{malformed")).toBe("{}");
    expect(redactLegacyOpenSkyPositionLog("N123AB AIRBORNE — 40.12°N 74.00°W @ 10,000ft"))
      .toBe("N123AB AIRBORNE — [precise position withheld] @ 10,000ft");
  });
});
