/**
 * DigSpan trajectory strip — Honeycomb/LangSmith-style live steps from API recentSpans.
 * Data contract: GET /api/ingest/atlas-status → recentSpans[]
 */
import { cn } from "@/lib/utils";

export type DigSpanView = {
  id: string;
  jobId?: string;
  targetName?: string;
  spanType: "llm" | "tool" | "promote" | "error" | "stage" | string;
  name: string;
  status: "active" | "ok" | "error" | string;
  startedAt?: string;
  endedAt?: string;
  inputSummary?: string;
  resultSummary?: string;
  modelId?: string;
  agentName?: string;
  operationName?: string;
};

const TYPE_COLOR: Record<string, string> = {
  llm: "#a78bfa",
  tool: "#9CFF1A",
  promote: "#34d399",
  error: "#fb7185",
  stage: "#67e8f9",
};

function shortTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export function DigSpanTrajectory({
  spans,
  className,
  max = 24,
}: {
  spans: DigSpanView[] | null | undefined;
  className?: string;
  max?: number;
}) {
  const list = (spans ?? []).slice(0, max);
  if (list.length === 0) {
    return (
      <div
        className={cn("rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-slate-500", className)}
        data-testid="dig-span-trajectory-empty"
      >
        No live dig spans yet — free-ReAct steps appear here when tools run.
      </div>
    );
  }

  return (
    <div
      className={cn("flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-[#9CFF1A]/15 bg-black/30 p-2", className)}
      data-testid="dig-span-trajectory"
      role="log"
      aria-label="Dig span trajectory"
    >
      {list.map((s) => {
        const color = TYPE_COLOR[s.spanType] || "#94a3b8";
        const active = s.status === "active";
        return (
          <div
            key={s.id}
            className={cn(
              "grid grid-cols-[52px_1fr_auto] gap-2 rounded-md px-2 py-1.5 text-[11px] leading-snug",
              active ? "bg-[#9CFF1A]/08" : "bg-white/[0.03]",
            )}
            data-span-type={s.spanType}
            data-span-status={s.status}
          >
            <span className="font-mono uppercase tracking-wide" style={{ color }}>
              {s.spanType}
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium text-stone-200">
                {s.name}
                {s.agentName ? (
                  <span className="text-slate-600"> · {s.agentName}</span>
                ) : null}
                {s.targetName ? (
                  <span className="text-slate-500"> · {s.targetName}</span>
                ) : null}
              </div>
              {(s.inputSummary || s.resultSummary) && (
                <div className="truncate text-slate-500">
                  {s.inputSummary || s.resultSummary}
                </div>
              )}
            </div>
            <span className="shrink-0 font-mono text-[10px] text-slate-600">
              {active ? "NOW" : shortTime(s.endedAt || s.startedAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
