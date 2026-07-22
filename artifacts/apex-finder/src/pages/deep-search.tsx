/**
 * Intelligent Deep Search — Phase 5
 *
 * Visual interface for the hybrid BM25 + TF-IDF + Graph + RRF search engine
 * with Planner → Retriever → Analyst → Critic agent pipeline.
 */

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Cpu, Network, Microscope, ShieldCheck,
  ChevronRight, Zap, Clock, Loader2, AlertCircle,
  Star, TrendingUp, Globe, Database, CheckCircle2,
  SlidersHorizontal, Mail, GitBranch, X as XIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoreBreakdown { bm25: number; semantic: number; graph: number; rrf: number; }

interface SearchResult {
  id: number;
  name: string;
  nationality: string | null;
  bayesianScore: number | null;
  isHot: boolean | null;
  assetCount: number;
  assetTypes: string[];
  sourceRegistries: string[];
  knownResidences: string | null;
  notes: string | null;
  scores: ScoreBreakdown;
  rank: number;
  reasoning: string;
  confidence: "high" | "medium" | "low";
  sourceFlags: string[];
}

interface PipelineStep {
  planner:   { reasoning: string; intent: string; assetFocus?: string; locations: string[]; strategy: string; durationMs: number };
  retriever: { bm25Hits: number; semanticHits: number; graphHits: number; embeddingHits?: number; embeddingCacheSize?: number; totalCandidates: number; sqlPrefilter: number; expandedQuery: string; durationMs: number };
  analyst:   { candidateCount: number; durationMs: number };
  critic:    { finalCount: number; removed: number; durationMs: number };
}

interface SearchResponse {
  query: string;
  expandedQuery: string;
  pipeline: PipelineStep;
  results: SearchResult[];
  isEmpty: boolean;
  totalMs: number;
  cached?: boolean;
}

// ── Example queries ───────────────────────────────────────────────────────────

const EXAMPLES = [
  "US private jet owners in Texas",
  "British directors with aviation assets",
  "Norwegian company directors",
  "turbofan aircraft owners California",
  "SEC EDGAR large shareholders",
  "hot leads UK helicopters",
];

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Pipeline step card ────────────────────────────────────────────────────────

type StepStatus = "idle" | "running" | "done";

interface StepCardProps {
  icon: React.ElementType;
  name: string;
  description: string;
  status: StepStatus;
  metric?: string;
  detail?: string;
  durationMs?: number;
}

function StepCard({ icon: Icon, name, description, status, metric, detail, durationMs }: StepCardProps) {
  return (
    <div className={cn(
      "border rounded-lg p-4 transition-all duration-300",
      status === "idle"    && "border-border bg-card/20 opacity-50",
      status === "running" && "border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
      status === "done"    && "border-emerald-500/30 bg-emerald-500/5",
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
            status === "idle"    && "bg-muted",
            status === "running" && "bg-primary/20",
            status === "done"    && "bg-emerald-500/20",
          )}>
            {status === "running" ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : status === "done" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          <span className={cn(
            "text-xs font-mono font-bold uppercase tracking-wider",
            status === "idle"    && "text-muted-foreground",
            status === "running" && "text-primary",
            status === "done"    && "text-emerald-400",
          )}>
            {name}
          </span>
        </div>
        {durationMs != null && status === "done" && (
          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{durationMs}ms
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground font-mono mb-2 leading-relaxed">
        {status === "idle" ? description : detail ?? description}
      </p>

      {metric && status === "done" && (
        <div className="text-[10px] font-mono text-primary/80 bg-primary/5 rounded px-2 py-1 inline-block">
          {metric}
        </div>
      )}
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false);

  const confColor =
    result.confidence === "high"   ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
    result.confidence === "medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                                     "text-muted-foreground border-border bg-card/30";

  const score = (result.bayesianScore ?? 0) * 100;

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-all",
      result.isHot ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card/30",
      "hover:border-primary/30 hover:bg-primary/5",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-muted-foreground">#{result.rank}</span>
            {result.isHot && <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />}
            <h3 className="font-bold text-sm text-foreground truncate">{result.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {result.nationality && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <Globe className="w-3 h-3" />{result.nationality}
              </span>
            )}
            {result.assetCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <Database className="w-3 h-3" />{result.assetCount} asset{result.assetCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className={cn(
            "text-xs font-mono font-bold rounded px-2 py-0.5",
            score >= 75 ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" :
            score >= 55 ? "text-primary bg-primary/10 border border-primary/20" :
                          "text-muted-foreground bg-muted border border-border",
          )}>
            {score.toFixed(0)}
          </div>
          <span className={cn("text-[10px] font-mono rounded border px-1.5 py-0.5", confColor)}>
            {result.confidence}
          </span>
        </div>
      </div>

      {/* Source flags */}
      {result.sourceFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {result.sourceFlags.map((flag) => (
            <span key={flag} className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 uppercase tracking-wider">
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Score breakdown */}
      <div className="space-y-1.5 mb-3">
        <ScoreBar label="BM25"     value={result.scores.bm25}      color="bg-blue-500" />
        <ScoreBar label="Semantic" value={result.scores.semantic}   color="bg-violet-500" />
        <ScoreBar label="Graph"    value={result.scores.graph}      color="bg-emerald-500" />
        <ScoreBar label="Embed"    value={result.scores.embedding ?? 0} color="bg-purple-400" />
        <ScoreBar label="Final"    value={result.scores.rrf * 10}   color="bg-primary" />
      </div>

      {/* Reasoning (expandable) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
        Analyst reasoning
      </button>

      {expanded && (
        <div className="mt-2 text-[11px] font-mono text-muted-foreground bg-background/50 border border-border rounded p-2 leading-relaxed">
          {result.reasoning}
        </div>
      )}

      {result.assetTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {result.assetTypes.map((t) => (
            <span key={t} className="text-[9px] font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ASSET_TYPE_OPTIONS = ["Aviation", "RealEstate", "Marine", "PrivateClub"];
const JURISDICTION_OPTIONS = [
  { label: "United States", value: "american" },
  { label: "United Kingdom", value: "british" },
  { label: "Norway",         value: "norwegian" },
  { label: "Other",          value: "other" },
];

export default function DeepSearch() {
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<SearchResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filtersOpen,         setFiltersOpen]         = useState(false);
  const [filterAssetTypes,    setFilterAssetTypes]    = useState<string[]>([]);
  const [filterJurisdictions, setFilterJurisdictions] = useState<string[]>([]);
  const [filterMinScore,      setFilterMinScore]      = useState(0);
  const [filterMaxScore,      setFilterMaxScore]      = useState(100);
  const [filterHasContact,    setFilterHasContact]    = useState(false);
  const [filterHasRelationship, setFilterHasRelationship] = useState(false);

  const activeFilterCount =
    filterAssetTypes.length +
    filterJurisdictions.length +
    (filterMinScore > 0 || filterMaxScore < 100 ? 1 : 0) +
    (filterHasContact ? 1 : 0) +
    (filterHasRelationship ? 1 : 0);

  const toggleAssetType = (t: string) =>
    setFilterAssetTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const toggleJurisdiction = (v: string) =>
    setFilterJurisdictions((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const resetFilters = () => {
    setFilterAssetTypes([]); setFilterJurisdictions([]);
    setFilterMinScore(0); setFilterMaxScore(100);
    setFilterHasContact(false); setFilterHasRelationship(false);
  };

  // Derive step statuses from loading / result state
  const steps: Record<string, StepStatus> = {
    planner:   loading ? "running" : result ? "done" : "idle",
    retriever: loading ? "running" : result ? "done" : "idle",
    analyst:   loading ? "running" : result ? "done" : "idle",
    critic:    loading ? "running" : result ? "done" : "idle",
  };

  const run = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("/api/search/intelligent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          limit: 20,
          filterAssetTypes,
          filterJurisdictions,
          filterMinScore: filterMinScore / 100,
          filterMaxScore: filterMaxScore / 100,
          filterHasContact,
          filterHasRelationship,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as any).error ?? `HTTP ${resp.status}`);
      }
      setResult(await resp.json());
    } catch (e: any) {
      setError(e.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); run(query); };

  const p = result?.pipeline;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Network className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-primary">
            Intelligent Deep Search
          </h1>
          {result && (
            <span className="text-[10px] font-mono text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />{result.totalMs}ms total
              {result.cached && " · cached"}
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground mb-4">
          BM25 · TF-IDF cosine · Graph/Bayesian · RRF fusion · Planner → Retriever → Analyst → Critic
        </p>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. US private jet owners in Texas, British directors, SEC 13D filers…"
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all",
              loading || !query.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? "Running…" : "Search"}
          </button>
        </form>

        {/* Filter toggle row */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[11px] uppercase tracking-wider transition-all",
              filtersOpen || activeFilterCount > 0
                ? "bg-primary/10 border-primary/50 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-destructive transition-colors"
            >
              <XIcon className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-3 p-4 bg-background border border-border rounded-lg space-y-4">
            {/* Asset types */}
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Asset Type</div>
              <div className="flex flex-wrap gap-2">
                {ASSET_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleAssetType(t)}
                    className={cn(
                      "px-2.5 py-1 rounded border text-[10px] font-mono font-bold uppercase transition-all",
                      filterAssetTypes.includes(t)
                        ? "bg-secondary/20 border-secondary text-secondary"
                        : "border-border text-muted-foreground hover:border-secondary/50",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Jurisdictions */}
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Jurisdiction</div>
              <div className="flex flex-wrap gap-2">
                {JURISDICTION_OPTIONS.map((j) => (
                  <button
                    key={j.value}
                    onClick={() => toggleJurisdiction(j.value)}
                    className={cn(
                      "px-2.5 py-1 rounded border text-[10px] font-mono font-bold uppercase transition-all",
                      filterJurisdictions.includes(j.value)
                        ? "bg-blue-500/20 border-blue-500 text-blue-400"
                        : "border-border text-muted-foreground hover:border-blue-500/50",
                    )}
                  >
                    {j.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Score range */}
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Bayesian Score: {filterMinScore}% – {filterMaxScore}%
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={filterMinScore}
                  onChange={(e) => setFilterMinScore(Math.min(Number(e.target.value), filterMaxScore))}
                  className="flex-1 accent-primary" />
                <input type="range" min={0} max={100} value={filterMaxScore}
                  onChange={(e) => setFilterMaxScore(Math.max(Number(e.target.value), filterMinScore))}
                  className="flex-1 accent-primary" />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={filterHasContact} onChange={(e) => setFilterHasContact(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary rounded" />
                <Mail className="w-3 h-3 text-primary" />
                <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                  Has direct contact
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={filterHasRelationship} onChange={(e) => setFilterHasRelationship(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary rounded" />
                <GitBranch className="w-3 h-3 text-secondary" />
                <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                  Has mapped relationships
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Example chips */}
        {!result && !loading && (
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); run(ex); }}
                className="text-[10px] font-mono text-muted-foreground border border-border rounded-full px-3 py-1 hover:border-primary hover:text-primary transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden">

        {/* Error */}
        {error && (
          <div className="m-6 flex items-center gap-3 border border-destructive/30 bg-destructive/10 rounded-lg p-4">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <span className="text-sm font-mono text-destructive">{error}</span>
          </div>
        )}

        {/* Empty DB notice */}
        {result?.isEmpty && (
          <div className="m-6 flex items-center gap-3 border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-mono text-amber-400">
              No results found. Run an ingestion first (Intelligence HQ → Ingest) to load real public registry data.
            </span>
          </div>
        )}

        {/* Two-column layout: pipeline + results */}
        {(loading || result) && (
          <div className="flex h-full overflow-hidden">

            {/* Left: pipeline steps */}
            <div className="w-80 xl:w-96 flex-shrink-0 border-r border-border p-5 overflow-y-auto space-y-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                Agent Pipeline
              </div>

              <StepCard
                icon={Cpu}
                name="Planner"
                description="Decomposes query intent, extracts asset/geo/name filters, selects strategy."
                status={steps.planner as StepStatus}
                durationMs={p?.planner.durationMs}
                metric={p ? `Intent: ${p.planner.intent} · Strategy: ${p.planner.strategy}` : undefined}
                detail={p?.planner.reasoning}
              />

              <StepCard
                icon={Search}
                name="Retriever"
                description="Expands query terms, runs BM25 + TF-IDF cosine + SQL pre-filter, merges candidates."
                status={steps.retriever as StepStatus}
                durationMs={p?.retriever.durationMs}
                metric={p ? `BM25: ${p.retriever.bm25Hits} · Semantic: ${p.retriever.semanticHits} · Embed: ${p.retriever.embeddingHits ?? 0} · ${p.retriever.totalCandidates} candidates` : undefined}
                detail={p ? [
                  p.retriever.expandedQuery && p.retriever.expandedQuery !== result?.query
                    ? `Expanded: "${p.retriever.expandedQuery}"`
                    : "No expansion (query already specific)",
                  `BM25: ${p.retriever.bm25Hits} hits · TF-IDF: ${p.retriever.semanticHits} hits · Graph: ${p.retriever.graphHits} hits · Embedding: ${p.retriever.embeddingHits ?? 0} hits (${p.retriever.embeddingCacheSize ?? 0} cached)`,
                  `SQL pre-filter: ${p.retriever.sqlPrefilter < 0 ? "none" : p.retriever.sqlPrefilter + " entities"}`,
                ].join(" · ") : undefined}
              />

              <StepCard
                icon={Microscope}
                name="Analyst"
                description="Validates source registries, applies Bayesian signal boost, generates per-entity reasoning."
                status={steps.analyst as StepStatus}
                durationMs={p?.analyst.durationMs}
                metric={p ? `${p.analyst.candidateCount} candidates scored` : undefined}
                detail={p ? `${p.analyst.candidateCount} entities analysed — sources validated, confidence assigned.` : undefined}
              />

              <StepCard
                icon={ShieldCheck}
                name="Critic"
                description="Re-ranks by RRF + confidence + hot-lead boost, removes low-signal noise."
                status={steps.critic as StepStatus}
                durationMs={p?.critic.durationMs}
                metric={p ? `${p.critic.finalCount} final · ${p.critic.removed} removed` : undefined}
                detail={p ? `${p.critic.finalCount} results surfaced. ${p.critic.removed} low-signal candidates filtered.` : undefined}
              />

              {result && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] font-mono text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Total time</span>
                      <span className="text-foreground">{result.totalMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Results</span>
                      <span className="text-foreground">{result.results.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RRF k-constant</span>
                      <span className="text-foreground">60</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: results */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading && !result && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                  <p className="text-sm font-mono text-muted-foreground">
                    Building BM25 index · Running TF-IDF cosine · Fusing signals…
                  </p>
                </div>
              )}

              {result && result.results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      {result.results.length} result{result.results.length !== 1 ? "s" : ""} — ranked by RRF fusion
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />BM25</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />Semantic</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Graph</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Final</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {result.results.map((r) => (
                      <ResultCard key={r.id} result={r} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Initial state */}
        {!loading && !result && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Network className="w-12 h-12 text-primary/20 mb-4" />
            <h2 className="text-sm font-mono font-bold text-foreground mb-2 uppercase tracking-widest">
              Hybrid Intelligence Search
            </h2>
            <p className="text-xs font-mono text-muted-foreground max-w-md leading-relaxed">
              Type a natural-language query above. The engine decomposes it through four agents,
              fuses BM25 keyword, TF-IDF semantic, and Bayesian graph signals via RRF,
              and returns ranked results with per-signal score breakdown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
