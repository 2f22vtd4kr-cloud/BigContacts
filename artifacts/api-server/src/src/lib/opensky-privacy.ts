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


function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function roundedHour(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

/**
 * Redact legacy precise ADS-B fields before metadata is shown to the UI or
 * model. This also normalizes older rows that predate the status-only writer.
 */
export function sanitizeOpenSkyMetadataRecord(metadata: Record<string, unknown>): Record<string, unknown> {
  const raw = metadata.opensky;
  if (raw == null) return metadata;
  if (!isRecord(raw)) {
    const sanitized = { ...metadata };
    delete sanitized.opensky;
    return sanitized;
  }

  const status = raw.status === "airborne" || raw.status === "on_ground" || raw.status === "unknown"
    ? raw.status
    : raw.onGround === true
      ? "on_ground"
      : raw.onGround === false
        ? "airborne"
        : "unknown";
  const altitude = typeof raw.altitudeBandFt === "number"
    ? raw.altitudeBandFt
    : typeof raw.altitudeFt === "number"
      ? raw.altitudeFt
      : null;
  const speed = typeof raw.speedBandKnots === "number"
    ? raw.speedBandKnots
    : typeof raw.speedKnots === "number"
      ? raw.speedKnots
      : null;
  const observedAtHour = roundedHour(raw.observedAtHour) ?? roundedHour(raw.lastSeenAt);

  return {
    ...metadata,
    opensky: {
      icao24: typeof raw.icao24 === "string" && /^[a-f0-9]{6,12}$/iu.test(raw.icao24.trim())
        ? raw.icao24.trim().toLowerCase()
        : null,
      status,
      altitudeBandFt: roundToBand(altitude, 1_000),
      speedBandKnots: roundToBand(speed, 10),
      observedAtHour,
      source: typeof raw.source === "string" ? raw.source.slice(0, 100) : "unknown",
      privacyScope: "latest_public_status_only_no_coordinates_or_route_history",
    },
  };
}

/** Fail closed on malformed JSON rather than echoing an unparseable legacy blob. */
export function sanitizeOpenSkyMetadataJson(raw: string | null | undefined): string | null {
  if (raw == null) return raw ?? null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return "{}";
    return JSON.stringify(sanitizeOpenSkyMetadataRecord(parsed));
  } catch {
    return "{}";
  }
}

/** Older OpenSky job logs may contain a single precise coordinate pair. */
export function redactLegacyOpenSkyPositionLog(message: string): string {
  return message.replace(/-?\\d{1,3}(?:\\.\\d+)?°\\s*[NS]\\s+-?\\d{1,3}(?:\\.\\d+)?°\\s*[EW]/giu, "[precise position withheld]");
}
