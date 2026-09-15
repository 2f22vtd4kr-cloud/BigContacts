/** Poll the canonical Atlas job so Launch controls reflect a live run. */
import { useCallback, useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 12_000;

export type AtlasRunSnapshot = {
  active: boolean;
  status?: string;
  message?: string;
  jobId?: string;
  targetName?: string;
  phase?: number;
  phaseTotal?: number;
};

export function useAtlasRun(pollMs: number = POLL_MS) {
  const [run, setRun] = useState<AtlasRunSnapshot>({ active: false });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${BASE}/api/ingest/job/active/atlas-run`, {
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
      if (!res.ok) {
        setRun({ active: false });
        setReady(true);
        return;
      }
      const data = await res.json() as any;
      const job = data?.job ?? null;
      const status = String(job?.status ?? data?.jobStatus ?? "").toLowerCase();
      const active = Boolean(data?.active) && (status === "running" || status === "paused" || status === "queued");
      setRun({
        active,
        status: job?.status ?? data?.jobStatus,
        message: job?.message,
        jobId: data?.jobId ?? job?.jobId,
        targetName: job?.targetName ?? job?.currentTarget ?? undefined,
        phase: job?.atlasPhase ?? job?.progress,
        phaseTotal: job?.atlasPhaseTotal ?? job?.total,
      });
    } catch {
      /* Keep the last known state on transient failures. */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const tickMs = run.active ? pollMs : Math.max(pollMs * 4, 20_000);
    const id = window.setInterval(() => void refresh(), tickMs);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [refresh, pollMs, run.active]);

  return { run, ready, refresh };
}
