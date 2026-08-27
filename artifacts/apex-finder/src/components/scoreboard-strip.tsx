/**
 * Operator scoreboard strip — GET /api/ingest/scoreboard-snapshot
 * Milestone "pass" is suppressed when bureau integrity is critical.
 */
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  name: string;
  contactOutcome: string | null;
  score: number;
  suggestedLcode?: string;
  evidenceContactCount?: number;
};

type Snapshot = {
  count: number;
  mean: number;
  milestonePass: boolean;
  bureauIntegrity?: string;
  rows: Row[];
};

export function ScoreboardStrip({ className, refreshKey }: { className?: string; refreshKey?: number | string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [integrity, setIntegrity] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const [r, h] = await Promise.all([
        fetch(`${BASE}/api/ingest/scoreboard-snapshot?limit=12`, { credentials: "include" }),
        fetch(`${BASE}/api/healthz`, { credentials: "include" }).catch(() => null),
      ]);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as Snapshot;
      setData(j);
      let integ = String(j.bureauIntegrity ?? "");
      if (h && h.ok) {
        const hj = await h.json();
        integ = String(hj.bureauIntegrity ?? hj.integrity ?? integ);
      }
      if (integ) setIntegrity(integ);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load, refreshKey]);

  if (err && !data) {
    return (
      <div className={cn("text-[10px] font-mono text-slate-500", className)} data-testid="scoreboard-strip">
        Scoreboard unavailable
      </div>
    );
  }
  if (!data) {
    return (
      <div className={cn("text-[10px] font-mono text-slate-500", className)} data-testid="scoreboard-strip">
        Scoreboard…
      </div>
    );
  }

  const integrityBlocksPass = integrity === "critical";
  const showPass = data.milestonePass && !integrityBlocksPass;

  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[11px] font-mono",
        className,
      )}
      data-testid="scoreboard-strip"
      title="Analytic rubric on recent cooked cards (−1…2). Milestone: mean≥1 on ≥8 with no −1. Pass hidden when integrity is critical."
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="uppercase tracking-wider text-slate-400">Scoreboard</span>
        <span className={showPass ? "text-emerald-400" : "text-slate-400"}>
          mean {data.mean.toFixed(2)} · n={data.count}
          {showPass ? " · pass" : ""}
          {integrityBlocksPass ? " · integrity critical" : integrity === "degraded" ? " · integrity degraded" : ""}
        </span>
      </div>
      <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
        {data.rows.slice(0, 10).map((r) => (
          <span
            key={r.id}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px]",
              r.score === 2 && "bg-emerald-500/20 text-emerald-300",
              r.score === 1 && "bg-sky-500/15 text-sky-300",
              r.score === 0 && "bg-white/5 text-slate-400",
              r.score < 0 && "bg-rose-500/20 text-rose-300",
            )}
            title={`${r.name} · ${r.contactOutcome ?? "none"} · score ${r.score}${r.evidenceContactCount ? ` · evidence ${r.evidenceContactCount}` : ""}${r.suggestedLcode && r.suggestedLcode !== "none" ? ` · ${r.suggestedLcode}` : ""}`}
          >
            {r.score}
            {r.score <= 0 && r.suggestedLcode && r.suggestedLcode !== "none"
              ? ` ${r.suggestedLcode.replace("L-", "")}`
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
