/**
 * Poll atlas pipeline status so Launch controls can reflect a live run.
 */
import { useCallback, useEffect, useState } from "react";
import { readApiJson } from "@/lib/api-json";

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
      const res = await fetch(`${BASE}/api/ingest/atlas-status`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) {
        setRun({ active: false });
        setReady(true);
        return;
      }
      const data = await readApiJson(res).catch(() => ({} as any));
      const status = String(data?.status ?? data?.runStatus ?? "").toLowerCase();
      // Single truth: running|paused only. Never treat scheduler or stale active as research.
      const active =
        status === "running" ||
        status === "paused" ||
        (Boolean(data?.active) && !["done", "completed", "failed", "idle", "stopped", "error"].includes(status) && status !== "");
      setRun({
        active,
        status: data?.status ?? data?.runStatus,
        message: data?.message ?? data?.phaseJ?.message,
        jobId: data?.jobId,
        targetName:
          data?.targetName ??
          data?.currentTarget ??
          data?.atlasTelemetry?.targetName ??
          undefined,
        phase: data?.atlasPhase ?? data?.progress,
        phaseTotal: data?.atlasPhaseTotal,
      });
    } catch {
      /* keep last known */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    // Idle desk: poll slower to protect free Redis command quotas.
    const tickMs = run.active ? pollMs : Math.max(pollMs * 4, 20_000);
    const id = window.setInterval(() => refresh(), tickMs);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [refresh, pollMs, run.active]);

  return { run, ready, refresh };
}
