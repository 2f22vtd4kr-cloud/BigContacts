import { useState, useEffect, useRef } from "react";
import {
  Plane, Building2, Globe, Shield, Landmark, FileSearch,
  Search, Scale, Network, Activity, CheckCircle2, XCircle,
  Clock, AlertTriangle, Play, RefreshCw, ChevronDown, ChevronUp,
  ExternalLink, Zap, Database, UserCheck, BarChart3, Users, FileText, DollarSign,
  Mail, Rocket, GitMerge, AlertCircle, Brain, BookOpen, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceStatus = "live" | "running" | "idle" | "failed" | "coming-soon";
type SourceKind   = "ingestor" | "enricher";

interface SourceDef {
  id: string;
  label: string;
  description: string;
  kind: SourceKind;
  Icon: React.FC<any>;
  color: string;
  bg: string;
  phase: 1 | 8 | 9 | 10;
  homepage?: string;
  endpoint?: string;      // POST endpoint to trigger
  jobType?: string;       // type key for job polling
  bodyParams?: Record<string, unknown>;
  comingSoon?: boolean;
  note?: string;
}

interface JobState {
  jobId: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  inserted: number;
  skipped: number;
  errors: number;
  message: string;
  finishedAt?: string;
  log?: string[];
}

// ─── Source catalogue ─────────────────────────────────────────────────────────

const SOURCES: SourceDef[] = [
  // ── Phase 1: existing sources ──────────────────────────────────────────────
  {
    id: "sec-edgar",
    label: "SEC EDGAR",
    description: "SC 13D/G beneficial owner filings + DEF 14A directors/executives from US public companies.",
    kind: "ingestor",
    Icon: Scale,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    phase: 1,
    homepage: "https://www.sec.gov/cgi-bin/browse-edgar",
    endpoint: "/api/ingest/western-hnwi",
    jobType: "western-hnwi",
    bodyParams: { targetCount: 1000 },
    note: "Part of the Western HNWI pipeline (SEC + CH + BRREG)",
  },
  {
    id: "companies-house",
    label: "UK Companies House",
    description: "Officers and Persons with Significant Control (PSC) from UK-registered companies.",
    kind: "ingestor",
    Icon: Building2,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.1)",
    phase: 1,
    homepage: "https://find-and-update.company-information.service.gov.uk",
    endpoint: "/api/ingest/western-hnwi",
    jobType: "western-hnwi",
    bodyParams: { targetCount: 1000 },
    note: "Requires COMPANIES_HOUSE_API_KEY env var",
  },
  {
    id: "brreg",
    label: "BRREG Norway",
    description: "Brønnøysund Register Centre — Norwegian company directors and shareholders.",
    kind: "ingestor",
    Icon: Globe,
    color: "#A855F7",
    bg: "rgba(168,85,247,0.1)",
    phase: 1,
    homepage: "https://www.brreg.no/en/",
    endpoint: "/api/ingest/western-hnwi",
    jobType: "western-hnwi",
    bodyParams: { targetCount: 1000 },
  },
  {
    id: "faa",
    label: "FAA Aircraft Registry",
    description: "All US-registered turbine and multi-engine aircraft owners — the highest-confidence private jet data set available publicly.",
    kind: "ingestor",
    Icon: Plane,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    phase: 1,
    homepage: "https://registry.faa.gov/database/ReleasableAircraft.zip",
    endpoint: "/api/ingest/faa",
    jobType: "faa",
    bodyParams: { maxRecords: 30000 },
    note: "~70MB download from registry.faa.gov",
  },
  {
    id: "gleif",
    label: "GLEIF LEI Register",
    description: "Global Legal Entity Identifier Foundation — live search for corporate legal entities worldwide.",
    kind: "enricher",
    Icon: Network,
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.1)",
    phase: 1,
    homepage: "https://www.gleif.org/en/lei-data/gleif-lei-look-up-api",
    note: "Available via live registry search — no bulk ingest endpoint",
  },
  {
    id: "opencorporates",
    label: "OpenCorporates",
    description: "World's largest open database of companies — 200m+ companies across 140 jurisdictions.",
    kind: "enricher",
    Icon: Search,
    color: "#EC4899",
    bg: "rgba(236,72,153,0.1)",
    phase: 1,
    homepage: "https://opencorporates.com",
    note: "Available via live registry search — 50 req/day free tier",
  },
  {
    id: "ch-enrich",
    label: "Companies House Contact Enricher",
    description: "Enriches existing entities with officer correspondence addresses from UK Companies House PSC filings. Also recomputes contact confidence scores for all entities.",
    kind: "enricher",
    Icon: UserCheck,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    phase: 1,
    homepage: "https://developer-specs.company-information.service.gov.uk",
    endpoint: "/api/ingest/companies-house-enrich",
    jobType: "companies-house-enrich",
    bodyParams: { batchSize: 50 },
    note: "Requires COMPANIES_HOUSE_API_KEY secret. Without it, still recomputes contactConfidence for all entities.",
  },

  // ── Phase 8: new extended sources ─────────────────────────────────────────
  {
    id: "occrp",
    label: "OCCRP Aleph",
    description: "Open investigative data platform aggregating 200+ datasets — beneficial ownership, sanctions lists, PEPs, and leaked documents.",
    kind: "enricher",
    Icon: FileSearch,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    phase: 8,
    homepage: "https://aleph.occrp.org",
    endpoint: "/api/ingest/occrp",
    jobType: "occrp",
    bodyParams: { limit: 500 },
  },
  {
    id: "land-registry",
    label: "UK Land Registry (OCOD)",
    description: "Overseas Companies that Own Property in England & Wales — monthly bulk dataset from HM Land Registry.",
    kind: "ingestor",
    Icon: Landmark,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
    phase: 8,
    homepage: "https://use-land-property-data.service.gov.uk/datasets/ocod",
    endpoint: "/api/ingest/land-registry",
    jobType: "land-registry",
    bodyParams: { maxRecords: 50000 },
    note: "First run downloads ~300MB CSV. Cached for 30 days.",
  },
  {
    id: "opensky",
    label: "OpenSky Network",
    description: "Live ADS-B flight tracking — matches airborne jets against FAA-ingested aircraft to detect which private jets are flying right now.",
    kind: "enricher",
    Icon: Activity,
    color: "#14B8A6",
    bg: "rgba(20,184,166,0.1)",
    phase: 8,
    homepage: "https://opensky-network.org",
    endpoint: "/api/ingest/opensky",
    jobType: "opensky",
    bodyParams: {},
  },
  {
    id: "easa",
    label: "EASA / National Aviation Registers",
    description: "European national aviation registries (UK CAA, DGAC, LBA, etc.) for non-US private jet ownership.",
    kind: "ingestor",
    Icon: Plane,
    color: "#6B7280",
    bg: "rgba(107,114,128,0.1)",
    phase: 8,
    homepage: "https://www.easa.europa.eu",
    comingSoon: true,
    note: "No standardised bulk download available across European registries yet.",
  },

  // ── Phase 9: In-House OSINT enrichment (no paid API) ─────────────────────
  {
    id: "in-house-enrich",
    label: "In-House OSINT Enricher",
    description:
      "Finds emails, LinkedIn URLs, and websites for HNWI and Gatekeeper entities using 6 free public sources: Wikidata SPARQL, GitHub API, email pattern generation verified by Gravatar MD5, DNS MX validation, RDAP domain contacts, and ProPublica 990 filings. No paid API required.",
    kind: "enricher",
    Icon: Mail,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    phase: 9,
    homepage: "https://query.wikidata.org",
    endpoint: "/api/ingest/in-house-enrich",
    jobType: "in-house-enrich",
    bodyParams: { batchSize: 200 },
    note: "Fully in-house — no Hunter.io, no Apollo.io, no paid plans. Wikidata covers public figures; GitHub covers founders/tech execs; Gravatar-verified email patterns work for most corporate emails. Run after Web OSINT Enrich for best coverage.",
  },

  // ── Phase G (10): Semantic Intelligence Layer ─────────────────────────────
  {
    id: "semantic-embeddings",
    label: "Semantic Embedding Engine",
    description:
      "Generates sentence-level embeddings for all 32,000+ entities using all-MiniLM-L6-v2 (384-dim, ~23 MB ONNX model). Embeddings power true semantic search, cross-registry entity resolution, and MCTS path scoring. Runs fully server-side — no external AI API.",
    kind: "enricher",
    Icon: Brain,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
    phase: 10,
    homepage: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2",
    endpoint: "/api/ingest/compute-embeddings",
    jobType: "compute-embeddings",
    bodyParams: { batchSize: 5000, force: true },
    note: "Auto-triggered at 4 min and 32 min after boot. Run manually to force a full recompute.",
  },
  {
    id: "osint-tools-directory",
    label: "OSINT Tools Directory",
    description:
      "12,500+ categorised OSINT tools sourced from tomvaillant/osint-tool-database on Hugging Face. Search by keyword or filter by category (Social Media, Company Research, Geolocation, Dark Web, etc.). Cached 24h in Redis.",
    kind: "enricher",
    Icon: BookOpen,
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.1)",
    phase: 10,
    homepage: "https://huggingface.co/datasets/tomvaillant/osint-tool-database",
    note: "Browse at /osint-tools — no ingest trigger needed; data fetched on-demand.",
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Enrichment Coverage Stats ───────────────────────────────────────────────

function EnrichmentCoverageStats() {
  const [stats, setStats] = useState<{
    totalEntities: number;
    contactableCount: number;
    enrichmentCoverage: number;
    totalRelationships: number;
    researchSessions: number;
  } | null>(null);

  useEffect(() => {
    const base = (import.meta as any).env.BASE_URL?.replace(/\/$/, "") ?? "";
    Promise.all([
      apiGet("/api/dashboard/stats").catch(() => ({})),
      fetch(`${base}/api/research/sessions?limit=1`).then(r => r.json()).catch(() => ({})),
    ]).then(([d, sess]: any[]) => {
      setStats({
        totalEntities:      d.totalEntities      ?? 0,
        contactableCount:   d.contactableCount   ?? 0,
        enrichmentCoverage: d.enrichmentCoverage ?? 0,
        totalRelationships: d.totalRelationships ?? 0,
        researchSessions:   d.activeResearchSessions ?? d.totalCount ?? sess?.total ?? sess?.count ?? 0,
      });
    }).catch(() => {/* ignore */});
  }, []);

  if (!stats) return null;

  const coverageBarCls =
    stats.enrichmentCoverage >= 50 ? "bg-emerald-500"
    : stats.enrichmentCoverage >= 20 ? "bg-amber-500"
    : "bg-muted-foreground/40";

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold font-mono uppercase tracking-widest text-primary">Enrichment Coverage</span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.totalEntities.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Total Entities</div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-primary">{stats.contactableCount.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Contactable</div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.enrichmentCoverage}%</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Coverage</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>Entities with any contact data</span>
          <span>{stats.enrichmentCoverage}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${coverageBarCls}`}
            style={{ width: `${stats.enrichmentCoverage}%` }}
          />
        </div>
        {stats.enrichmentCoverage < 10 && (
          <p className="text-[10px] font-mono text-amber-500 mt-1">
            ↑ Run "Companies House Contact Enricher" below to improve coverage.
          </p>
        )}
      </div>

      {/* E4: Pipeline progress bars with targets */}
      <div className="space-y-3 border-t border-border/40 pt-3">
        {(
          [
            { label: "Contactable Entities",  current: stats.contactableCount,   target: 200,     color: "bg-primary" },
            { label: "Research Sessions",     current: stats.researchSessions,   target: 500,     color: "bg-secondary" },
            { label: "Relationship Edges",    current: stats.totalRelationships, target: 500_000, color: "bg-amber-500" },
          ] as const
        ).map(({ label, current, target, color }) => {
          const pct  = Math.min(Math.round((current / target) * 100), 100);
          const done = current >= target;
          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
                <span className={cn("text-[10px] font-mono font-bold", done ? "text-emerald-400" : "text-foreground")}>
                  {current.toLocaleString()} / {target.toLocaleString()}{done ? " ✓" : ""}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Auto-detect shared-address co-ownership links across all entities</span>
        <div className="flex-shrink-0"><AutoDetectButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Detect corporate name series (e.g. "Tannjets I / II LLC") — builds relationship graph</span>
        <div className="flex-shrink-0"><ClusterDetectButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Sync isHot flag for all entities with Bayesian score ≥ 0.70</span>
        <div className="flex-shrink-0"><SyncHotFlagsButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Fetch CH company officers for all corporations and store in entity metadata (required for co-director edges)</span>
        <div className="flex-shrink-0"><ChOfficersButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Build SHARED_DIRECTOR edges between entities sharing a common CH director — links individual HNWIs across companies</span>
        <div className="flex-shrink-0"><ChCodirectorsButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Enrich entity notes from filing metadata — filing type, company, role, CH directors, location (improves profile briefings)</span>
        <div className="flex-shrink-0"><PopulateNotesButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Create StockHolding asset records for SEC EDGAR large-shareholder entities that have no assets yet</span>
        <div className="flex-shrink-0"><EdgarStockButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Backfill estimatedNetWorth = 3× registered asset value for all entities where net worth is unset</span>
        <div className="flex-shrink-0"><NetWorthBackfillButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Web OSINT: DuckDuckGo + EDGAR + OpenCorporates → LinkedIn URL, email, phone for all entities</span>
        <div className="flex-shrink-0"><WebOsintButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">In-House OSINT: Wikidata · GitHub · Gravatar MD5 · RDAP · ProPublica 990 → email, LinkedIn, phone (no paid API)</span>
        <div className="flex-shrink-0"><InHouseEnrichButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Deep Web OSINT: DuckDuckGo HTML + Bing · 12 rotating browser fingerprints · 4–7 context-aware queries per entity</span>
        <div className="flex-shrink-0"><DeepWebOsintButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">EDGAR co-filers: scan SC 13D/G group filings — pairs that filed together are KNOWN_ASSOCIATEs</span>
        <div className="flex-shrink-0"><EdgarAssociatesButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Wikidata associates: spouse · partner · sibling · parent relationships → KNOWN_ASSOCIATE / FAMILY_OF edges</span>
        <div className="flex-shrink-0"><WikidataAssociatesButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">Run full hybrid research pipeline (L1 BM25+TF-IDF · L2 multi-agent · L3 query expansion · L4 UCT · L5 Bayesian-UCB) on top hot leads</span>
        <div className="flex-shrink-0"><BulkMctsButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">G1 Semantic embeddings: all-MiniLM-L6-v2 (384-dim ONNX) — powers 4-signal hybrid search and cross-registry deduplication</span>
        <div className="flex-shrink-0"><ComputeEmbeddingsButton /></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 min-w-0 line-clamp-2">G2b Semantic entity resolution: compare embeddings across registries — creates LIKELY_SAME_PERSON edges for cosine sim &gt; 0.93</span>
        <div className="flex-shrink-0"><SemanticDedupButton /></div>
      </div>
    </div>
  );
}

function SyncHotFlagsButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/sync-hot-flags`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
        {status === "running" ? "Syncing…" : "Sync Hot Flags"}
      </button>
    </div>
  );
}

function ClusterDetectButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/relationships/auto-detect-clusters`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`hidden sm:inline text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Network className="w-3 h-3" />}
        {status === "running" ? "Clustering…" : "Name Clusters"}
      </button>
    </div>
  );
}

function AutoDetectButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/relationships/auto-detect`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
        {status === "running" ? "Detecting…" : "Auto-detect"}
      </button>
    </div>
  );
}

function ChOfficersButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollJob = (jobId: string, base: string) => {
    intervalRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${base}/api/ingest/job/${jobId}`);
        const d = await r.json();
        if (d.status === "done") {
          clearInterval(intervalRef.current!);
          setMsg(`✓ ${d.inserted ?? 0} enriched`);
          setStatus("done");
        } else if (d.status === "failed") {
          clearInterval(intervalRef.current!);
          setMsg(d.message ?? "Failed");
          setStatus("error");
        } else {
          setMsg(d.message ? d.message.slice(0, 60) : `${d.progress ?? 0}%`);
        }
      } catch {
        clearInterval(intervalRef.current!);
        setStatus("error");
        setMsg("Polling failed");
      }
    }, 2500);
  };

  const run = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("running");
    setMsg("Starting…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/ch-company-officers`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg("Running…");
      pollJob(d.jobId, base);
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-blue-400 hover:border-blue-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
        {status === "running" ? "Enriching…" : "CH Officers"}
      </button>
    </div>
  );
}

function ChCodirectorsButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/relationships/auto-detect-ch-codirectors`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-violet-400 hover:border-violet-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
        {status === "running" ? "Building…" : "CH Co-directors"}
      </button>
    </div>
  );
}

function PopulateNotesButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/populate-notes`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
        {status === "running" ? "Populating…" : "Populate Notes"}
      </button>
    </div>
  );
}

function EdgarStockButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/create-edgar-stock-assets`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
        {status === "running" ? "Creating…" : "EDGAR Stock Assets"}
      </button>
    </div>
  );
}

function NetWorthBackfillButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/backfill-net-worth`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
        {status === "running" ? "Backfilling…" : "Backfill Net Worth"}
      </button>
    </div>
  );
}

function EdgarAssociatesButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("Scanning EDGAR filings…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/relationships/seed-edgar-associates`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[240px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-amber-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
        {status === "running" ? "Scanning…" : "EDGAR Co-filers"}
      </button>
    </div>
  );
}

function WikidataAssociatesButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("Querying Wikidata…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/relationships/seed-wikidata-associates`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[240px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-amber-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-violet-400 hover:border-violet-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Network className="w-3 h-3" />}
        {status === "running" ? "Querying…" : "Wikidata Associates"}
      </button>
    </div>
  );
}

function WebOsintButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = async () => {
    setStatus("running");
    setMsg("Starting…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/web-osint-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 200 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      const jobId: string = d.jobId;
      setMsg(`Enriching ${d.total} entities…`);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${base}/api/ingest/job/${jobId}`);
          const pj = await p.json();
          setMsg(`${pj.progress}/${pj.total} — ${pj.inserted} enriched`);
          if (pj.status === "done" || pj.status === "failed") {
            clearInterval(pollRef.current!);
            setMsg(pj.message ?? "Done");
            setStatus(pj.status === "done" ? "done" : "error");
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[220px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-amber-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-orange-400 hover:border-orange-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
        {status === "running" ? "Searching…" : "Web OSINT Enrich"}
      </button>
    </div>
  );
}

function InHouseEnrichButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = async () => {
    setStatus("running");
    setMsg("Starting…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/in-house-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 200 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      if (!d.jobId) { setMsg(d.message ?? "Nothing to enrich"); setStatus("done"); return; }
      const jobId: string = d.jobId;
      setMsg(`Enriching ${d.total} entities…`);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${base}/api/ingest/job/${jobId}`);
          const pj = await p.json();
          setMsg(`${pj.progress ?? 0}/${pj.total ?? 0} — ${pj.inserted ?? 0} enriched`);
          if (pj.status === "done" || pj.status === "failed") {
            clearInterval(pollRef.current!);
            setMsg(pj.message ?? "Done");
            setStatus(pj.status === "done" ? "done" : "error");
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[220px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-amber-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
        {status === "running" ? "Enriching…" : "In-House Enrich"}
      </button>
    </div>
  );
}

function DeepWebOsintButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("running");
    setMsg("Starting…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/deep-web-osint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 300, hotOnly: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      if (!d.jobId) { setMsg(d.message ?? "Nothing to search"); setStatus("done"); return; }
      const jobId: string = d.jobId;
      setMsg(`Searching ${d.total} entities…`);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${base}/api/ingest/job/${jobId}`);
          const pj = await p.json();
          setMsg(`${pj.progress ?? 0}/${pj.total ?? 0} — ${pj.inserted ?? 0} found`);
          if (pj.status === "done" || pj.status === "failed") {
            clearInterval(pollRef.current!);
            setMsg(pj.message ?? "Done");
            setStatus(pj.status === "done" ? "done" : "error");
          }
        } catch { /* ignore */ }
      }, 4000);
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[220px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-cyan-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
        {status === "running" ? "Searching…" : "Deep Web OSINT"}
      </button>
    </div>
  );
}

function BulkMctsButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("running");
    setMsg("Starting…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/research/bulk-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 60, skipExisting: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      if (!d.jobId) { setMsg(d.message ?? "All sessions exist"); setStatus("done"); return; }
      setMsg(`Running Hybrid Research on ${d.total} hot leads…`);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${base}/api/ingest/job/${d.jobId}`);
          const pj = await p.json();
          setMsg(`${pj.inserted ?? 0}/${pj.total ?? d.total} sessions done`);
          if (pj.status === "done" || pj.status === "failed") {
            clearInterval(pollRef.current!);
            setMsg(pj.message ?? "Done");
            setStatus(pj.status === "done" ? "done" : "error");
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[240px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-amber-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-violet-400 hover:border-violet-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
        {status === "running" ? "Running…" : "Bulk Research"}
      </button>
    </div>
  );
}

// ─── G: Compute Embeddings Button ────────────────────────────────────────────

function ComputeEmbeddingsButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg]       = useState("");
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load embedding cache size on mount
  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/search/embedding-status`).then(r => r.json()).then((d: any) => {
      if (d?.cacheSize !== undefined) setCacheSize(d.cacheSize);
    }).catch(() => {});
  }, []);

  const run = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("running");
    setMsg("Loading model…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/compute-embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 5000, force: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      if (!d.jobId) { setMsg(d.message ?? "Nothing to embed"); setStatus("done"); return; }
      const jobId: string = d.jobId;
      setMsg(`Computing embeddings…`);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${base}/api/ingest/job/${jobId}`);
          const pj = await p.json();
          setMsg(`${pj.progress ?? 0}/${pj.total ?? 0} embedded`);
          if (pj.status === "done" || pj.status === "failed") {
            clearInterval(pollRef.current!);
            setMsg(pj.message ?? "Done");
            setStatus(pj.status === "done" ? "done" : "error");
            if (pj.status === "done" && pj.total) setCacheSize(pj.total);
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {cacheSize !== null && status === "idle" && (
        <span className="text-[10px] font-mono text-violet-400/70">{cacheSize.toLocaleString()} cached</span>
      )}
      {msg && (
        <span className={`text-[10px] font-mono max-w-[220px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-violet-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-violet-400 hover:border-violet-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
        {status === "running" ? "Embedding…" : "Compute Embeddings"}
      </button>
    </div>
  );
}

// ─── G: Semantic Dedup Button ─────────────────────────────────────────────────

function SemanticDedupButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    setMsg("Comparing embeddings…");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/relationships/semantic-dedup`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg(d.message ?? "Done");
      setStatus("done");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {msg && (
        <span className={`text-[10px] font-mono max-w-[260px] truncate ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-violet-400"}`} title={msg}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-violet-400 hover:border-violet-400/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
        {status === "running" ? "Resolving…" : "Semantic Dedup"}
      </button>
    </div>
  );
}

// ─── Pipeline Status Panel ────────────────────────────────────────────────────

interface PipelineStatus {
  totalEntities: number;
  hotLeads: number;
  coldMcts: number;
  needsEnrichment: number;
  zeroContact: number;
  sparseNotes: number;
  zeroRelationships: number;
}

function PipelineStatusPanel() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/pipeline/status`)
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const runFullPipeline = async () => {
    if (running) return;
    setRunning(true);
    setRunMsg("Step 1/4: Populating notes…");
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");

    const step = async (label: string, url: string, body?: unknown) => {
      setRunMsg(label);
      try {
        const r = await fetch(`${base}${url}`, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : {},
          body: body ? JSON.stringify(body) : undefined,
        });
        const d = await r.json();
        // If it returns a jobId, wait for completion
        if (d.jobId) {
          await new Promise<void>((resolve) => {
            const iv = setInterval(async () => {
              try {
                const p = await fetch(`${base}/api/ingest/job/${d.jobId}`);
                const pj = await p.json();
                if (pj.status === "done" || pj.status === "failed") {
                  clearInterval(iv);
                  resolve();
                }
              } catch { clearInterval(iv); resolve(); }
            }, 3000);
          });
        }
      } catch { /* non-fatal */ }
    };

    await step("Step 1/4: Populating notes…",          "/api/ingest/populate-notes");
    await step("Step 2/4: Creating EDGAR stock assets…", "/api/ingest/create-edgar-stock-assets");
    await step("Step 3/4: Detecting relationship clusters…", "/api/relationships/auto-detect-clusters");
    await step("Step 4/4: Running Hybrid Research on hot leads…", "/api/research/bulk-run",
               { batchSize: 60, skipExisting: true });

    setRunMsg("Pipeline complete ✓");
    setRunning(false);
    refresh();
  };

  if (loading) return null;
  if (!status) return null;

  const items = [
    {
      label: "Pipeline-cold hot leads",
      count: status.coldMcts,
      total: status.hotLeads,
      color: status.coldMcts === 0 ? "text-emerald-400" : "text-red-400",
      dot: status.coldMcts === 0 ? "bg-emerald-500" : "bg-red-500 animate-pulse",
      tip: "Hot leads with no Hybrid Research session — use Bulk Research to activate them",
    },
    {
      label: "Pending enrichment",
      count: status.needsEnrichment,
      total: status.totalEntities,
      color: status.needsEnrichment === 0 ? "text-emerald-400" : "text-amber-400",
      dot: status.needsEnrichment === 0 ? "bg-emerald-500" : "bg-amber-500",
      tip: "Entities flagged needsEnrichment=true — run In-House Enrich to clear",
    },
    {
      label: "Zero contact confidence",
      count: status.zeroContact,
      total: status.totalEntities,
      color: status.zeroContact < status.totalEntities * 0.1 ? "text-emerald-400" : "text-amber-400",
      dot: status.zeroContact < status.totalEntities * 0.1 ? "bg-emerald-500" : "bg-amber-500",
      tip: "HNWI/Gatekeeper entities with no email, phone, or LinkedIn discovered",
    },
    {
      label: "Sparse notes (< 50 chars)",
      count: status.sparseNotes,
      total: status.totalEntities,
      color: status.sparseNotes === 0 ? "text-emerald-400" : "text-muted-foreground",
      dot: status.sparseNotes === 0 ? "bg-emerald-500" : "bg-muted-foreground/40",
      tip: "Entities with missing or very short briefing notes — run Populate Notes to fix",
    },
    {
      label: "Isolated nodes (0 edges)",
      count: status.zeroRelationships,
      total: status.totalEntities,
      color: status.zeroRelationships === 0 ? "text-emerald-400" : "text-muted-foreground",
      dot: status.zeroRelationships === 0 ? "bg-emerald-500" : "bg-muted-foreground/40",
      tip: "Entities with no relationship edges — run Name Clusters to link them",
    },
  ];

  const allClear = items.every(i => i.count === 0);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold font-mono uppercase tracking-widest text-primary">Pipeline Status</span>
        </div>
        <button
          onClick={refresh}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {allClear ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono">
          <CheckCircle2 className="h-4 w-4" />
          All pipeline steps complete — database fully operational
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.label} className="flex items-center justify-between" title={item.tip}>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
                <span className="text-[11px] font-mono text-muted-foreground">{item.label}</span>
              </div>
              <span className={`text-[11px] font-mono font-bold tabular-nums ${item.color}`}>
                {item.count.toLocaleString()}
                <span className="text-muted-foreground/40 font-normal"> / {item.total.toLocaleString()}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Run Full Pipeline button */}
      <div className="border-t border-border/40 pt-3 flex flex-col gap-2">
        {runMsg && (
          <p className={`text-[10px] font-mono ${running ? "text-amber-400" : "text-emerald-400"}`}>{runMsg}</p>
        )}
        <button
          onClick={runFullPipeline}
          disabled={running || allClear}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Running pipeline…</>
            : allClear
            ? <><CheckCircle2 className="h-3.5 w-3.5" />Pipeline complete</>
            : <><Rocket className="h-3.5 w-3.5" />Run Full Pipeline</>
          }
        </button>
        <p className="text-[10px] font-mono text-muted-foreground/50 text-center">
          Chains: Populate Notes → EDGAR Stock Assets → Cluster Detection → Hybrid Research
        </p>
      </div>
    </div>
  );
}

// ─── Per-source card ──────────────────────────────────────────────────────────

function SourceCard({ src }: { src: SourceDef }) {
  const [job, setJob]       = useState<JobState | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  useEffect(() => () => stopPoll(), []);

  async function pollJob(jobId: string) {
    try {
      const state = await apiGet(`/api/ingest/job/${jobId}`) as JobState;
      setJob(state);
      if (state.status === "done" || state.status === "failed") stopPoll();
    } catch { /* ignore */ }
  }

  async function handleRun() {
    if (!src.endpoint) return;
    setError(null);
    try {
      const res = await apiPost(src.endpoint, src.bodyParams) as { jobId: string };
      const mockJob: JobState = {
        jobId: res.jobId,
        status: "queued",
        progress: 0,
        inserted: 0,
        skipped: 0,
        errors: 0,
        message: "Starting…",
      };
      setJob(mockJob);
      pollRef.current = setInterval(() => pollJob(res.jobId), 2_000);
    } catch (err: any) {
      setError(err.message ?? "Failed to start job");
    }
  }

  const isRunning = job?.status === "queued" || job?.status === "running";
  const isDone    = job?.status === "done";
  const isFailed  = job?.status === "failed";

  const statusDot = src.comingSoon ? "bg-gray-600"
    : isFailed  ? "bg-red-500 animate-pulse"
    : isRunning ? "bg-yellow-400 animate-pulse"
    : isDone    ? "bg-emerald-500"
    : job        ? "bg-emerald-500/60"
    : "bg-muted-foreground/30";

  return (
    <div
      className="rounded-xl border border-border bg-card/60 hover:bg-card transition-colors p-4 flex flex-col gap-3"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className="rounded-lg p-2 flex-shrink-0"
          style={{ background: src.bg }}
        >
          <src.Icon className="h-4 w-4" style={{ color: src.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{src.label}</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: src.bg, color: src.color }}
            >
              {src.kind}
            </span>
            {src.phase === 8 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                Phase 8
              </span>
            )}
            {src.comingSoon && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                coming soon
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{src.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Live status dot */}
          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", statusDot)} />

          {src.homepage && (
            <a
              href={src.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Note */}
      {src.note && (
        <p className="text-[11px] font-mono text-muted-foreground/60 border-l-2 border-border pl-2">
          {src.note}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-950/30 border border-red-800/40 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Job progress */}
      {job && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className={cn(
              isFailed  ? "text-red-400" :
              isDone    ? "text-emerald-400" :
              isRunning ? "text-yellow-400" : "text-muted-foreground"
            )}>
              {job.message}
            </span>
            <span>{job.progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isFailed  ? "bg-red-500" :
                isDone    ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
            <span className="text-emerald-400">+{job.inserted.toLocaleString()}</span>
            <span>skip {job.skipped.toLocaleString()}</span>
            {job.errors > 0 && <span className="text-red-400">{job.errors} err</span>}
            {job.finishedAt && <span>{new Date(job.finishedAt).toLocaleTimeString()}</span>}
          </div>

          {/* Log toggle */}
          {job.log && job.log.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} job log ({job.log.length} lines)
            </button>
          )}

          {expanded && job.log && (
            <div className="mt-1 rounded-md bg-background/60 border border-border/50 p-2 max-h-40 overflow-y-auto">
              {job.log.map((line, i) => (
                <div key={i} className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {src.endpoint && !src.comingSoon && (
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={cn(
            "mt-auto flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
            isRunning
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          )}
        >
          {isRunning ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Running…</>
          ) : isDone ? (
            <><RefreshCw className="h-3.5 w-3.5" />Re-run</>
          ) : (
            <><Play className="h-3.5 w-3.5" />Run {src.kind === "enricher" ? "Enrichment" : "Ingest"}</>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DataSources() {
  const phase1Sources  = SOURCES.filter((s) => s.phase === 1);
  const phase8Sources  = SOURCES.filter((s) => s.phase === 8);
  const phase9Sources  = SOURCES.filter((s) => s.phase === 9);
  const phaseGSources  = SOURCES.filter((s) => s.phase === 10);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-base font-bold tracking-widest uppercase font-mono text-primary">
              Data Sources
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {SOURCES.filter((s) => !s.comingSoon && s.endpoint).length} live sources · {SOURCES.filter((s) => s.comingSoon).length} coming soon
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground">Registries online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-8">

        {/* ── Pipeline Status ───────────────────────────────────────────────── */}
        <PipelineStatusPanel />

        {/* ── Enrichment Coverage Stats ─────────────────────────────────────── */}
        <EnrichmentCoverageStats />

        {/* ── Phase G — Semantic Intelligence Layer ────────────────────────── */}
        {phaseGSources.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-violet-400">
                Phase G — Semantic Intelligence
              </h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
              {phaseGSources.map((src) => (
                <SourceCard key={src.id} src={src} />
              ))}
            </div>
          </section>
        )}

        {/* ── Phase 9 — In-House OSINT Engine ──────────────────────────────── */}
        {phase9Sources.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-emerald-400">
                Phase 9 — In-House OSINT Engine
              </h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
              {phase9Sources.map((src) => (
                <SourceCard key={src.id} src={src} />
              ))}
            </div>
          </section>
        )}

        {/* ── Phase 8 — Extended Sources ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-primary">
              Phase 8 — Extended Sources
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {phase8Sources.map((src) => (
              <SourceCard key={src.id} src={src} />
            ))}
          </div>
        </section>

        {/* ── Phase 1 — Core Sources ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-emerald-500">
              Phase 1 — Core Sources
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {phase1Sources.map((src) => (
              <SourceCard key={src.id} src={src} />
            ))}
          </div>
        </section>

        {/* Legend */}
        <section className="border border-border/50 rounded-xl p-4 bg-card/30">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Source Types
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">Ingestor</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Downloads a bulk dataset and creates new Entity + Asset records in your database.
                Deduplication via Upstash Redis — safe to run multiple times.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">Enricher</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Queries an external API against entities already in your database and adds intelligence
                (investigation flags, sanctions matches, live flight positions) to existing records.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
