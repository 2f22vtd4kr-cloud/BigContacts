export type StateVector = (string | number | boolean | null)[];

export interface ReadsbAircraft {
  hex?: string;
  flight?: string;
  r?: string;
  ownOp?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  squawk?: string;
  seen?: number;
  on_ground?: boolean;
}

/**
 * Convert a readsb aircraft observation into the OpenSky-compatible state
 * vector shape used by the enrichment matcher. This module is intentionally
 * free of database/runtime imports so observation normalization remains a
 * pure boundary that can be tested without provisioning infrastructure.
 */
export function readsbToStateVector(aircraft: ReadsbAircraft): StateVector {
  const altitude = typeof aircraft.alt_baro === "number" ? aircraft.alt_baro / 3.281 : null;
  const speed = typeof aircraft.gs === "number" ? aircraft.gs / 1.944 : null;
  return [
    aircraft.hex ?? null,
    // Keep the registration in the callsign slot used by the matching loop.
    // For readsb feeds this is more reliable than the operator callsign.
    aircraft.r ?? aircraft.flight ?? null,
    aircraft.ownOp ?? null,
    null,
    null,
    typeof aircraft.lon === "number" ? aircraft.lon : null,
    typeof aircraft.lat === "number" ? aircraft.lat : null,
    altitude,
    aircraft.on_ground ?? (typeof aircraft.alt_baro === "string" && aircraft.alt_baro === "ground"),
    speed,
    typeof aircraft.track === "number" ? aircraft.track : null,
    null,
    null,
    null,
    aircraft.squawk ?? null,
  ];
}
