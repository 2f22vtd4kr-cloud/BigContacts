import type { NextFunction, Request, Response } from "express";

const BOOLEAN_FIELDS = [
  "discoveryFirst",
  "includeLandRegistry",
  "skipIngestion",
  "hotLeadsOnly",
  "runResearch",
  "skipFaa",
] as const;

export type CanonicalSingleTargetIdParse =
  | { kind: "omitted" }
  | { kind: "invalid" }
  | { kind: "single-target"; id: number };

/**
 * An explicitly supplied invalid target must never silently switch a caller
 * from a target investigation into the much broader discovery pipeline.
 */
export function parseCanonicalSingleTargetId(
  body: Record<string, unknown>,
): CanonicalSingleTargetIdParse {
  if (!Object.prototype.hasOwnProperty.call(body, "singleTargetId")) return { kind: "omitted" };

  const raw = body.singleTargetId;
  let targetId: number;
  if (typeof raw === "number") {
    targetId = raw;
  } else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    targetId = Number(raw.trim());
  } else {
    return { kind: "invalid" };
  }

  if (!Number.isSafeInteger(targetId) || targetId <= 0) return { kind: "invalid" };
  return { kind: "single-target", id: targetId };
}

function parseBoolean(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

/**
 * JSON clients normally send booleans as booleans. Some operator shells/forms
 * send strings, however. Normalize only the canonical Atlas launch fields so
 * `"false"` can never become truthy through JavaScript Boolean("false").
 * Unknown values remain untouched and are rejected/handled by the launch
 * contract rather than guessed.
 */
export function normalizeAtlasLaunchBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === "POST" && req.path === "/ingest/atlas-run" && req.body && typeof req.body === "object") {
    for (const field of BOOLEAN_FIELDS) {
      if (field in req.body) req.body[field] = parseBoolean(req.body[field]);
    }
  }
  next();
}
