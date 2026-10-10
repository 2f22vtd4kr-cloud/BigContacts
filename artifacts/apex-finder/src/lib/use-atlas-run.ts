/** Poll the canonical Atlas job so Launch controls reflect a live run. */
import { useCallback, useEffect, useRef, useState } from "react";
import { classifyApexError, emitApexError } from "@/lib/apex-errors";
import { readApiJson } from "@/lib/api-json";
import { parseAtlasRunSnapshot, type AtlasRunSnapshot } from "@/lib/atlas-run-status-contract";
export type { AtlasRunSnapshot } from "@/lib/atlas-run-status-contract";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 12_000;

export function useAtlasRun(pollMs: number = POLL_MS) {
  const [run, setRun] = useState<AtlasRunSnapshot>({ active: false });
  const [ready, setReady] = useState(false);
  const lastTerminalJob = useRef<string | undefined>();
  const requestGeneration = useRef(0);
  const currentRequestController = useRef<AbortController | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestGeneration.current;
    currentRequestController.current?.abort();
    const requestController = new AbortController();
    currentRequestController.current = requestController;
    const abortFromOwner = () => requestController.abort();
    if (signal?.aborted) requestController.abort();
    else signal?.addEventListener("abort", abortFromOwner, { once: true });
    try {
      const res = await fetch(`${BASE}/api/ingest/job/active/atlas-run`, { cache: "no-store", credentials: "same-origin", signal: requestController.signal });
      if (requestId !== requestGeneration.current || requestController.signal.aborted) return;
      const data = await readApiJson(res);
      if (requestId !== requestGeneration.current || requestController.signal.aborted) return;
      // Failed HTTP polls and malformed successful payloads are not proof of idleness.
      if (!res.ok) return;
      const snapshot = parseAtlasRunSnapshot(data);
      if (!snapshot) return;
      if (!snapshot.active && snapshot.jobId && ["done", "failed", "cancelled"].includes(snapshot.status ?? "") && lastTerminalJob.current !== snapshot.jobId) {
        lastTerminalJob.current = snapshot.jobId;
        if (snapshot.status === "failed") emitApexError(data?.userError ?? classifyApexError(snapshot.message));
      }
      setRun(snapshot);
    } catch { /* Keep the last known state on transient failures. */ }
    finally {
      signal?.removeEventListener("abort", abortFromOwner);
      if (currentRequestController.current === requestController) currentRequestController.current = null;
      if (requestId === requestGeneration.current && !requestController.signal.aborted) setReady(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const tickMs = run.active ? pollMs : Math.max(pollMs * 4, 20_000);
    const id = window.setInterval(() => void refresh(controller.signal), tickMs);
    return () => {
      controller.abort();
      currentRequestController.current?.abort();
      requestGeneration.current += 1;
      window.clearInterval(id);
    };
  }, [refresh, pollMs, run.active]);

  return { run, ready, refresh };
}
