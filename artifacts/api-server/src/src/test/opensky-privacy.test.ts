import { describe, expect, it } from "vitest";
import { buildPrivacySafeOpenSkyObservation } from "../lib/opensky-privacy";

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
});
