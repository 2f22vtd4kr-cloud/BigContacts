/**
 * Select the canonical durable Redis store separately from disposable cache
 * failover. REDIS_URL_1 owns job state, leases and dedup keys; secondary URLs
 * are not replicas and must never become an implicit authority after quota
 * exhaustion.
 */
export type RedisSlotState = { status?: string | null };

export function selectCanonicalPermanentSlotIndex(
  slots: readonly (RedisSlotState | null | undefined)[],
  quotaExhausted: ReadonlySet<number>,
): number | null {
  const primary = slots[0];
  return primary?.status === "ready" && !quotaExhausted.has(0) ? 0 : null;
}

/**
 * Contact records are a disposable cache, so they may use REDIS_URL_2 when
 * the canonical store is unavailable. This helper must not be used by job,
 * lease, replay, quota, or other authoritative state.
 */
export function selectContactCacheSlotIndex(
  slots: readonly (RedisSlotState | null | undefined)[],
  quotaExhausted: ReadonlySet<number>,
): number | null {
  const primary = selectCanonicalPermanentSlotIndex(slots, quotaExhausted);
  if (primary !== null) return primary;
  const secondary = slots[1];
  return secondary?.status === "ready" && !quotaExhausted.has(1) ? 1 : null;
}
