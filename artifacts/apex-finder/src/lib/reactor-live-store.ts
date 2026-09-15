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
    const response = await fetch(`${baseUrl()}/api/ingest/atlas-status`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      if (myGeneration === generation && listeners.size > 0) emit(EMPTY);
      return;
    }
    const data = await response.json();
    if (myGeneration !== generation || listeners.size === 0) return;
    const runStatus = String(data?.runStatus ?? data?.status ?? "idle").toLowerCase();
    const activities = normalizeLiveActivities(
      Array.isArray(data?.recentSpans) ? data.recentSpans as ReactorSpanLike[] : [],
      50,
    );
    emit({ runStatus, activities });
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
