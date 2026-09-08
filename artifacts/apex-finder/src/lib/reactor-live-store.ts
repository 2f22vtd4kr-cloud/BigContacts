import { useSyncExternalStore } from "react";
import {
  normalizeLiveActivities,
  type LiveActivity,
  type ReactorSpanLike,
} from "./reactor-live-model";

export interface ReactorLiveSnapshot {
  runStatus: string;
  activities: LiveActivity[];
  fetchedAt: number;
}

const EMPTY: ReactorLiveSnapshot = { runStatus: "", activities: [], fetchedAt: 0 };

let snapshot: ReactorLiveSnapshot = EMPTY;
let listeners = new Set<() => void>();
let timer: number | null = null;
let controller: AbortController | null = null;
let inFlight = false;

function emit(next: ReactorLiveSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function pull() {
  if (inFlight) return;
  inFlight = true;
  controller?.abort();
  controller = new AbortController();
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/api/ingest/atlas-status`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return;
    const data = await response.json();
    const runStatus = String(data?.runStatus ?? data?.status ?? "").toLowerCase();
    const recentSpans = Array.isArray(data?.recentSpans) ? data.recentSpans as ReactorSpanLike[] : [];
    emit({
      runStatus,
      activities: normalizeLiveActivities(recentSpans),
      fetchedAt: Date.now(),
    });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      emit({ runStatus: "", activities: [], fetchedAt: Date.now() });
    }
  } finally {
    inFlight = false;
  }
}

function start() {
  if (timer !== null) return;
  void pull();
  timer = window.setInterval(() => void pull(), 1200);
}

function stop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  controller?.abort();
  controller = null;
  inFlight = false;
  snapshot = EMPTY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot() {
  return snapshot;
}

/** One atlas-status poller shared by every Reactor live consumer. */
export function useReactorLiveSnapshot(): ReactorLiveSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
