/** Scheduler countdown helpers for Reactor continuous mode UI */

export function schedulerWaitRemaining(nextTriggerAt?: string | null): number {
  if (!nextTriggerAt) return 0;
  const t = Date.parse(nextTriggerAt);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - Date.now());
}

export function formatSchedulerCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
