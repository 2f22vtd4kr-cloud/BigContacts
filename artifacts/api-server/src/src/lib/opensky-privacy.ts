export interface PrivacySafeOpenSkyObservationInput {
  icao24: string | null;
  onGround: boolean | null;
  altitudeMeters: number | null;
  speedMetersPerSecond: number | null;
  observedAt: Date;
  source: string;
}

function roundToBand(value: number | null, bandSize: number): number | null {
  return value == null || !Number.isFinite(value) ? null : Math.round(value / bandSize) * bandSize;
}

/**
 * Keep only a coarse, latest public aircraft-status observation.
 *
 * Exact coordinates, callsigns, track bearings, squawks, origin-country
 * fields and historical positions are intentionally not persisted. This is
 * asset-currentness enrichment, not a flight-tracking or itinerary feature.
 */
export function buildPrivacySafeOpenSkyObservation(input: PrivacySafeOpenSkyObservationInput) {
  const observedAt = new Date(input.observedAt);
  observedAt.setUTCMinutes(0, 0, 0);
  const altitudeFeet = input.altitudeMeters == null ? null : input.altitudeMeters * 3.281;
  const speedKnots = input.speedMetersPerSecond == null ? null : input.speedMetersPerSecond * 1.944;

  return {
    icao24: input.icao24?.trim().toLowerCase() || null,
    status: input.onGround == null ? "unknown" : input.onGround ? "on_ground" : "airborne",
    altitudeBandFt: roundToBand(altitudeFeet, 1_000),
    speedBandKnots: roundToBand(speedKnots, 10),
    observedAtHour: observedAt.toISOString(),
    source: input.source,
    privacyScope: "latest_public_status_only_no_coordinates_or_route_history",
  } as const;
}
