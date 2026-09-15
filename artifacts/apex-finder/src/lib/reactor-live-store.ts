import { useSyncExternalStore } from "react";
import { normalizeLiveActivities, type LiveActivity, type ReactorSpanLike } from "./reactor-live-model";

type StoreSnapshot = {
  runStatus: string;
  activities: LiveActivity[];
};

const EMPTY: StoreSnapshot = { runStatus: "idle", activities: [] };
const ACTIVE_POLL_MS = 1_200;
const IDLE_POLL_MS = 8_000;

let snapshot: StoreSnapshot = EMPTY;
let listeners = new Set<() => void>();
let timer: number | null = null;
let controller: AbortController | null = null;
let generation = 0;

function baseUrl(): string {
  return (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
}

function emit(next: StoreSnapshot): void {
  const sameStatus = snapshot.runStatus === next.runStatus;
  const sameActivities = snapshot.activities.length === next.activities.length
    && snapshot.activities.every((a, i) => {
      const b = next.activities[i];
      return a.id === b.id && a.status === b.status && a.startedAt === b.startedAt && a.endedAt === b.endedAt && a.resultSummary === b.resultSummary;
    });
  if (sameStatus && sameActivities) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function stopPolling(): void {
  generation += 1;
  if (timer != null) window.clearTimeout(timer);
  timer = null;
  controller?.abort();
  controller = null;
  snapshot = EMPTY;
}

function schedule(): void {
  if (listeners.size === 0) return;
  if (timer != null) window.clearTimeout(timer);
  const active = snapshot.runStatus === "running" || snapshot.runStatus === "paused" || snapshot.activities.some((activity) => activity.status === "active");
  timer = window.setTimeout(() => void pull(), active ? ACTIVE_POLL_MS : IDLE_POLL_MS);
}

async function pull(): Promise<void> {
  if (listeners.size === 0) return;
  const myGeneration = generation;
  controller?.abort();
  controller = new AbortController();
  try {
    // Canonical Atlas status source. The historical /ingest/atlas-status endpoint
    // is intentionally quarantined and returns 410; the active-job projection is
    // the same source used by Launch/Stop controls and cannot drift from them.
    const activeResponse = await fetch(`${baseUrl()}/api/ingest/job/active/atlas-run`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!activeResponse.ok) {
      if (myGeneration === generation && listeners.size > 0) emit(EMPTY);
      return;
    }
    const activeData = await activeResponse.json() as {
      active?: boolean;
      jobId?: string | null;
      job?: Record<string, unknown> | null;
      jobStatus?: string | null;
    };
    if (myGeneration !== generation || listeners.size === 0) return;

    const job = activeData?.job ?? null;
    const runStatus = String(job?.status ?? activeData?.jobStatus ?? "idle").toLowerCase();
    const active = Boolean(activeData?.active) && (runStatus === "running" || runStatus === "paused" || runStatus === "queued");
    const activities = normalizeLiveActivities(
      Array.isArray(job?.recentSpans) ? job.recentSpans as ReactorSpanLike[] : [],
      50,
    );

    // The active-job endpoint is authoritative for run state. Telemetry is
    // best-effort: when spans are not included by the job projection, keep the
    // feed empty rather than inventing activity from prose/status text.
    emit({ runStatus: active ? runStatus : (job?.status ? runStatus : "idle"), activities });
  } catch (error) {
    if (myGeneration === generation && !(error instanceof DOMException && error.name === "AbortError")) {
      emit(EMPTY);
    }
  } finally {
    controller = null;
    schedule();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    generation += 1;
    void pull();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopPolling();
  };
}

function getSnapshot(): StoreSnapshot {
  return snapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return EMPTY;
}

/**
 * Shared React external store for Reactor live telemetry. Graph and feed
 * consumers subscribe to the same normalized recentSpans snapshot, so they
 * cannot drift by independently interpreting the status payload.
 */
export function useReactorLiveTelemetry(): StoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type { LiveActivity };