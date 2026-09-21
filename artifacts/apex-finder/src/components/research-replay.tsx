import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pause, Play, RotateCcw, Sparkles } from "lucide-react";

type ReplayEvent = {
  id?: string;
  timestamp?: string;
  kind?: string;
  stage?: string;
  status?: string;
  targetName?: string;
  activeToolId?: string;
  toolIds?: string[];
  prompt?: string;
  inputSummary?: string;
  resultSummary?: string;
  story?: string;
  narration?: string;
  why?: string;
  actor?: string;
  sourceUrls?: string[];
  links?: Array<{ title?: string; url: string }>;
  evidence?: number;
  sources?: number;
};

function labelFor(event: ReplayEvent) {
  return event.stage || event.story || event.narration || event.resultSummary || event.inputSummary || event.kind || "Recorded research step";
}

function sourceUrlsFor(event: ReplayEvent) {
  const urls = [
    ...(Array.isArray(event.sourceUrls) ? event.sourceUrls : []),
    ...(Array.isArray(event.links) ? event.links.map((x) => x.url) : []),
  ];
  return Array.from(new Set(urls.filter((url) => /^https?:\/\//i.test(String(url)))));
}

export function ResearchReplay({
  events,
  compact = false,
}: {
  events: ReplayEvent[];
  compact?: boolean;
}) {
  const recorded = useMemo(
    () => events.filter((event) => labelFor(event)).slice(0, 40).reverse(),
    [events],
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);

  useEffect(() => {
    if (!recorded.length) {
      setIndex(0);
      setPlaying(false);
      return;
    }
    setIndex((current) => Math.min(current, recorded.length - 1));
  }, [recorded.length]);

  useEffect(() => {
    if (!playing || recorded.length < 2 || typeof window === "undefined") return;
    const delay = Math.round(1100 / speed);
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= recorded.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, delay);
    return () => window.clearInterval(timer);
  }, [playing, recorded.length, speed]);

  if (!recorded.length) return null;

  const current = recorded[index]!;
  const urls = sourceUrlsFor(current);
  const progress = recorded.length === 1 ? 100 : Math.round((index / (recorded.length - 1)) * 100);
  const terminal = index === recorded.length - 1;

  return (
    <section
      className={`research-replay mt-3 rounded-xl border border-[#9CFF1A]/12 bg-[#0a1018]/90 p-3 ${compact ? "text-[11px]" : ""}`}
      data-testid="research-replay"
      aria-label="Research replay"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#9CFF1A]/20 bg-[#9CFF1A]/[0.07] text-[#d4ff8a]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4ff8a]">Research replay</div>
            <div className="truncate text-[11px] text-stone-500">Recorded trajectory · {recorded.length} steps</div>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-stone-500">{index + 1}/{recorded.length}</span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-stone-800" aria-hidden="true">
        <div className="h-full rounded-full bg-[#9CFF1A]/70 transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.025] p-3" data-testid="research-replay-frame">
        <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-stone-500">
          {current.kind || "event"}{current.status ? ` · ${current.status}` : ""}
        </div>
        <div className="mt-1 text-[13px] font-semibold leading-5 text-stone-100">{labelFor(current)}</div>
        {(current.why || current.inputSummary || current.resultSummary) && (
          <p className="mt-2 text-[11px] leading-5 text-stone-400">
            {current.why || current.inputSummary || current.resultSummary}
          </p>
        )}

        {urls.length > 0 && (
          <div className="mt-3 border-t border-white/[0.06] pt-2">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-600">Recorded sources</div>
            <div className="flex flex-wrap gap-1.5">
              {urls.slice(0, 4).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[32px] max-w-full items-center gap-1 rounded-md border border-[#9CFF1A]/15 bg-[#9CFF1A]/[0.04] px-2 text-[10px] text-stone-300 hover:border-[#9CFF1A]/35 hover:text-[#d4ff8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/60"
                  title={url}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="max-w-[260px] truncate">{(() => { try { return new URL(url).hostname; } catch { return "Recorded source"; } })()}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="reactor-pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#9CFF1A]/20 bg-[#9CFF1A]/[0.06] px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#d4ff8a] hover:border-[#9CFF1A]/40"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause research replay" : "Play research replay"}
          data-testid="button-research-replay-play"
        >
          {playing ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
          {playing ? "Pause" : terminal ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          className="reactor-pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:border-white/20 hover:text-stone-200"
          onClick={() => { setPlaying(false); setIndex(0); }}
          aria-label="Restart research replay"
          data-testid="button-research-replay-restart"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Restart
        </button>
        <label className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/[0.06] px-2 font-mono text-[9px] uppercase tracking-wider text-stone-600">
          Speed
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value) as 0.5 | 1 | 2)}
            className="bg-transparent text-[10px] font-bold text-stone-300 outline-none"
            aria-label="Research replay speed"
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </div>
    </section>
  );
}
