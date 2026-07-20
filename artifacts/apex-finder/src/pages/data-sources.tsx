import { useState, useEffect, useRef } from "react";
import {
  Plane, Building2, Globe, Shield, Landmark, FileSearch,
  Search, Scale, Network, Activity, CheckCircle2, XCircle,
  Clock, AlertTriangle, Play, RefreshCw, ChevronDown, ChevronUp,
  ExternalLink, Zap, Database, UserCheck, BarChart3, Users, FileText,
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
  phase: 1 | 8;
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
  } | null>(null);

  useEffect(() => {
    apiGet("/api/dashboard/stats")
      .then((d: any) => setStats({
        totalEntities: d.totalEntities ?? 0,
        contactableCount: d.contactableCount ?? 0,
        enrichmentCoverage: d.enrichmentCoverage ?? 0,
      }))
      .catch(() => {/* ignore */});
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
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-muted-foreground/60">Auto-detect shared-address co-ownership links across all entities</span>
        <AutoDetectButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Detect corporate name series (e.g. "Tannjets I / II LLC") — builds relationship graph</span>
        <ClusterDetectButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Sync isHot flag for all entities with Bayesian score ≥ 0.70</span>
        <SyncHotFlagsButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Fetch CH company officers for all corporations and store in entity metadata (required for co-director edges)</span>
        <ChOfficersButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Build SHARED_DIRECTOR edges between entities sharing a common CH director — links individual HNWIs across companies</span>
        <ChCodirectorsButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Enrich entity notes from filing metadata — filing type, company, role, CH directors, location (improves profile briefings)</span>
        <PopulateNotesButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Create StockHolding asset records for SEC EDGAR large-shareholder entities that have no assets yet</span>
        <EdgarStockButton />
      </div>
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] font-mono text-muted-foreground/60">Web OSINT: DuckDuckGo + EDGAR + OpenCorporates → LinkedIn URL, email, phone for all 5 hybrid architecture layers</span>
        <WebOsintButton />
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
        <span className={`text-[10px] font-mono ${status === "error" ? "text-red-400" : "text-emerald-400"} max-w-[200px] truncate`} title={msg}>{msg}</span>
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
  const phase1Sources = SOURCES.filter((s) => s.phase === 1);
  const phase8Sources = SOURCES.filter((s) => s.phase === 8);

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

        {/* ── Enrichment Coverage Stats ─────────────────────────────────────── */}
        <EnrichmentCoverageStats />

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
