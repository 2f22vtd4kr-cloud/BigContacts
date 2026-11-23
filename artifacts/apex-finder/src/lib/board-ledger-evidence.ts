export type BoardEvidenceStatus = "verified" | "corroborated" | "review" | "disputed";

/**
 * The Ledger status mirrors ContactSurface's primary presented route.
 * It consumes only API-provided contacts and their validation state.
 */
export function resolveBoardEvidenceStatus(contacts: unknown): BoardEvidenceStatus {
  const primary = Array.isArray(contacts) ? contacts[0] as { validationStatus?: unknown } | undefined : undefined;
  const validation = String(primary?.validationStatus ?? "").toLowerCase();
  if (/disputed|rejected/.test(validation)) return "disputed";
  if (/corroborated/.test(validation)) return "corroborated";
  if (/verified|accepted/.test(validation)) return "verified";
  return "review";
}
