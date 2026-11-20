export type TemporalState = "current" | "aging" | "stale" | "unknown";

const DAY_MS = 86_400_000;

function asTime(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  const normalized = value.trim();
  if (!normalized) return null;

  // Date.parse normalizes impossible ISO calendar dates on some runtimes
  // (for example, 2026-02-30 becomes a date in March). Reject invalid
  // calendar components before parsing the timestamp or timezone.
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:$|[Tt ])/.exec(normalized);
  if (isoDate) {
    const year = Number(isoDate[1]);
    const month = Number(isoDate[2]);
    const day = Number(isoDate[3]);
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (!daysInMonth || day < 1 || day > daysInMonth) return null;
  }

  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

/**
 * Evidence freshness is explicit and bounded. A missing date is unknown, not
 * fresh; a future observation is capped at the current moment.
 */
export function computeFreshnessScore(
  observedAt: Date | string | null | undefined,
  now = new Date(),
  halfLifeDays = 180,
): number {
  const observed = asTime(observedAt);
  if (observed === null) return 0;
  const ageDays = Math.max(0, (now.getTime() - Math.min(observed, now.getTime())) / DAY_MS);
  return Math.max(0, Math.min(1, Math.pow(0.5, ageDays / Math.max(1, halfLifeDays))));
}

export function classifyTemporalState(
  observedAt: Date | string | null | undefined,
  now = new Date(),
  halfLifeDays = 180,
): TemporalState {
  if (asTime(observedAt) === null) return "unknown";
  const score = computeFreshnessScore(observedAt, now, halfLifeDays);
  if (score === 0) return "stale";
  if (score >= 0.7) return "current";
  if (score >= 0.35) return "aging";
  return "stale";
}

export function isValidAt(
  validFrom: Date | string | null | undefined,
  validTo: Date | string | null | undefined,
  at = new Date(),
): boolean {
  const time = at.getTime();
  if (!Number.isFinite(time)) return false;
  const from = asTime(validFrom);
  const to = asTime(validTo);
  if ((validFrom != null && from === null) || (validTo != null && to === null)) return false;
  return (from === null || from <= time) && (to === null || to >= time);
}