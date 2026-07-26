import { useState, useEffect } from "react";
import {
  Plane, Building2, Globe, Landmark, FileSearch,
  Search, Scale, Network, Activity, CheckCircle2,
  RefreshCw, ExternalLink, Database, UserCheck, BarChart3,
  Mail, Brain, Filter, BookOpen, Ship, Layers, AtSign,
  User, Terminal, Anchor, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceStatus = "live" | "running" | "idle" | "failed" | "coming-soon";
type SourceKind   = "ingestor" | "enricher";
type SourcePhase  = 1 | 8 | 9 | 10 | 11;

interface RegistryCoverage {
  id: string;
  label: string;
  jurisdiction: string;
  entityIdentifier: string;
  personOfficerFields: string;
  ownershipAvailability: string;
  accessMethod: string;
  rateLimit: string;
  licensing: string;
  freshness: string;
  productionReviewStatus: "review_required" | "reviewed_for_production" | "not_yet_assessed";
  notes?: string;
}

interface SourceDef {
  id: string;
  label: string;
  description: string;
  kind: SourceKind;
  Icon: React.FC<any>;
  color: string;
  bg: string;
  phase: SourcePhase;
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
      "Generates sentence-level embeddings for all 32,000+ entities using all-MiniLM-L6-v2 (384-dim, ~23 MB ONNX model). Embeddings power true semantic search, cross-registry entity resolution, and Hybrid Research path scoring. Runs fully server-side — no external AI API.",
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

  // ── Phase L: Extended OSINT tool suite ──────────────────────────────────
  {
    id: "icij-offshore",
    label: "ICIJ Offshore Leaks",
    description:
      "Reconciles entity names against the ICIJ Offshore Leaks database — Panama Papers, Pandora Papers, Paradise Papers, Bahamas Leaks, and FinCEN Files. Runs automatically during in-house enrichment for all corporations.",
    kind: "enricher",
    Icon: FileSearch,
    color: "#F43F5E",
    bg: "rgba(244,63,94,0.1)",
    phase: 11,
    homepage: "https://offshoreleaks.icij.org",
    note: "No API key required. Free reconciliation API at offshoreleaks.icij.org/reconcile.",
  },
  {
    id: "openownership",
    label: "OpenOwnership BODS",
    description:
      "Beneficial ownership data in the Beneficial Ownership Data Standard — covers UK Register of Persons with Significant Control (PSC) and international BODS-format data. Resolves corporate ownership chains.",
    kind: "enricher",
    Icon: Layers,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
    phase: 11,
    homepage: "https://www.openownership.org",
    endpoint: "/api/enrich/openownership",
    note: "Available via /api/enrich/openownership?entityId=<id>. Also queries UK PSC via Companies House.",
  },
  {
    id: "whoxy-rdap",
    label: "Whoxy Reverse WHOIS",
    description:
      "Finds all domains registered by a known email address or registrant name — reveals corporate infrastructure, personal domains, and holding company networks. Runs automatically in in-house enrichment after email discovery.",
    kind: "enricher",
    Icon: AtSign,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    phase: 11,
    homepage: "https://www.whoxy.com",
    note: "Requires WHOXY_API_KEY secret. Gracefully skipped without it.",
  },
  {
    id: "equasis-vessels",
    label: "Equasis Vessel Intelligence",
    description:
      "Yacht and superyacht ownership via Equasis (IMO-linked vessel register) with VesselFinder fallback. Enriches entities with registered vessel names, flags, and ownership trails.",
    kind: "enricher",
    Icon: Anchor,
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.1)",
    phase: 11,
    homepage: "https://www.equasis.org",
    endpoint: "/api/enrich/equasis",
    note: "Requires EQUASIS_SESSION cookie for full data. VesselFinder API used as fallback.",
  },
  {
    id: "adsb-history",
    label: "ADS-B Historical Flight Traces",
    description:
      "Retrieves historical flight paths for known aircraft registration numbers via ADSBExchange and OpenSky historical APIs. Reveals habitual destinations, home airports, and travel patterns for private jet owners.",
    kind: "enricher",
    Icon: Plane,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    phase: 11,
    homepage: "https://globe.adsbexchange.com",
    endpoint: "/api/enrich/adsb-history",
    note: "Available via /api/enrich/adsb-history?entityId=<id>. Reads registration from entity metadata.",
  },
  {
    id: "holehe-maigret",
    label: "Holehe + Maigret (Email/Username OSINT)",
    description:
      "Checks known email addresses against 200+ online services (Holehe) and discovers social profiles by username across 3,000+ sites (Maigret). Exposes social accounts hidden from standard search.",
    kind: "enricher",
    Icon: User,
    color: "#EC4899",
    bg: "rgba(236,72,153,0.1)",
    phase: 11,
    homepage: "https://github.com/megadose/holehe",
    endpoint: "/api/enrich/holehe",
    note: "Runs server-side Python. Both tools installed. Use /api/enrich/holehe?entityId=<id> and /api/enrich/maigret?entityId=<id>.",
  },
  {
    id: "theharvester",
    label: "theHarvester",
    description:
      "Passive OSINT aggregator that queries Google, Bing, LinkedIn, DNS, and Shodan for emails, hostnames, and subdomains associated with a domain or person name.",
    kind: "enricher",
    Icon: Terminal,
    color: "#6B7280",
    bg: "rgba(107,114,128,0.1)",
    phase: 11,
    homepage: "https://github.com/laramies/theHarvester",
    comingSoon: true,
    note: "Installation dependency conflict on current platform. Will be re-attempted via virtual environment.",
  },
  {
    id: "gliner-ner",
    label: "GLiNER Zero-Shot NER",
    description:
      "Generalist NER model (urchade/gliner-multi-v2.1, 83M params) running locally via Python microservice on port 7890. Replaces regex-based name extraction in web enricher — zero-shot; no training needed for new entity types.",
    kind: "enricher",
    Icon: Cpu,
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.1)",
    phase: 11,
    homepage: "https://github.com/urchade/GLiNER",
    note: "Start with: python3 scripts/gliner_service.py. Automatically used by web enricher when service is running. Falls back to regex NER when offline.",
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

// ─── J0 Funnel Panel ─────────────────────────────────────────────────────────

type FunnelData = {
  total: number;
  outcomes: Record<string, number>;
  byEntityType: Record<string, Record<string, number>>;
  byRegistry: Record<string, Record<string, number>>;
  conversionRate: {
    toDirectCandidate: number;
    toSocialOnly: number;
    toEvidenceOnly: number;
    notEnriched: number;
  };
  note?: string;
};

const OUTCOME_META: Record<string, { label: string; color: string; barColor: string; description: string }> = {
  direct_contact_candidate: {
    label: "Direct Contact",
    color: "text-emerald-400",
    barColor: "bg-emerald-500",
    description: "Person-level email or phone found in public sources",
  },
  direct_contact_verified: {
    label: "Verified Contact",
    color: "text-emerald-300",
    barColor: "bg-emerald-400",
    description: "Validated person-level contact with full attribution",
  },
  social_only: {
    label: "Social Only",
    color: "text-blue-400",
    barColor: "bg-blue-500",
    description: "LinkedIn/Twitter/Telegram found — eligible for direct-contact follow-up (J1)",
  },
  evidence_only: {
    label: "Evidence Only",
    color: "text-amber-400",
    barColor: "bg-amber-500",
    description: "Website or address found — eligible for social/direct-contact follow-up",
  },
  organization_contact: {
    label: "Org Contact",
    color: "text-purple-400",
    barColor: "bg-purple-500",
    description: "Company phone/inbox found (not personal)",
  },
  none: {
    label: "Not Enriched",
    color: "text-muted-foreground",
    barColor: "bg-muted-foreground/40",
    description: "No enrichment pass has run yet",
  },
};

function FunnelPanel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/pipeline/funnel`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(body?.error ?? `HTTP ${r.status}`);
        }
        return body as FunnelData;
      })
      .then(d => {
        setData(d);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setData(null);
        setLoadError(err instanceof Error ? err.message : "Funnel data is unavailable");
      });
  };

  useEffect(() => { load(); }, []);

  const OUTCOME_ORDER = [
    "direct_contact_verified",
    "direct_contact_candidate",
    "social_only",
    "evidence_only",
    "organization_contact",
    "none",
  ];

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold font-mono uppercase tracking-widest text-primary">
            Contact Discovery Funnel
          </span>
          <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">J0</span>
        </div>
        <button
          onClick={load}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {!data ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-xs font-mono text-muted-foreground">
            {loadError ? "Funnel data is unavailable right now." : "Loading funnel data…"}
          </p>
          {loadError && (
            <p className="mt-1 text-[10px] font-mono text-muted-foreground/70">
              The panel will be available when the data service is ready.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Conversion summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Direct Contact", value: ((data.conversionRate.toDirectCandidate ?? 0) * 100).toFixed(2) + "%", color: "text-emerald-400" },
              { label: "Social Only",    value: ((data.conversionRate.toSocialOnly     ?? 0) * 100).toFixed(1) + "%",  color: "text-blue-400" },
              { label: "Evidence Only",  value: ((data.conversionRate.toEvidenceOnly   ?? 0) * 100).toFixed(1) + "%",  color: "text-amber-400" },
              { label: "Not Enriched",   value: ((data.conversionRate.notEnriched      ?? 0) * 100).toFixed(1) + "%",  color: "text-muted-foreground" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Outcome bars */}
          <div className="space-y-2 border-t border-border/40 pt-3">
            {OUTCOME_ORDER.map(key => {
              const meta = OUTCOME_META[key];
              const count = data.outcomes[key] ?? 0;
              if (!count && key !== "none") return null;
              const pct = data.total > 0 ? (count / data.total) * 100 : 0;
              return (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-semibold ${meta?.color ?? "text-muted-foreground"}`}>
                        {meta?.label ?? key}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground hidden md:inline">
                        — {meta?.description}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {count.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${meta?.barColor ?? "bg-muted-foreground/40"}`}
                      style={{ width: `${Math.max(pct, pct > 0 ? 0.5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* By entity type (compact) */}
          {Object.keys(data.byEntityType).length > 0 && (
            <div className="border-t border-border/40 pt-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">By Entity Type</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(data.byEntityType).map(([type, outcomes]) => {
                  const typeTotal = Object.values(outcomes).reduce((s, n) => s + n, 0);
                  const direct = (outcomes["direct_contact_candidate"] ?? 0) + (outcomes["direct_contact_verified"] ?? 0);
                  const social = outcomes["social_only"] ?? 0;
                  return (
                    <div key={type} className="rounded-lg border border-border/40 p-2">
                      <div className="text-[10px] font-mono font-bold text-foreground mb-1">{type}</div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        {typeTotal > 0 ? ((direct / typeTotal) * 100).toFixed(1) : "0.0"}% direct
                      </div>
                      <div className="text-[10px] font-mono text-blue-400">
                        {typeTotal > 0 ? ((social / typeTotal) * 100).toFixed(1) : "0.0"}% social
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground">{typeTotal.toLocaleString()} total</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.note && (
            <p className="text-[9px] font-mono text-muted-foreground/60 border-t border-border/30 pt-2">{data.note}</p>
          )}
        </>
      )}
    </div>
  );
}

function RegistryMatrixPanel() {
  const [sources, setSources] = useState<RegistryCoverage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/registry-matrix`)
      .then((r) => r.json())
      .then((data) => setSources(Array.isArray(data?.sources) ? data.sources : []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold font-mono uppercase tracking-widest text-cyan-400">
          Registry Coverage Matrix
        </span>
        <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded uppercase tracking-wider">J2</span>
      </div>
      {loading ? (
        <p className="text-xs font-mono text-muted-foreground">Loading registry coverage…</p>
      ) : (
        <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-[10px] font-mono">
          <thead className="text-muted-foreground uppercase tracking-wider border-b border-border/50">
            <tr>
              <th className="py-2 pr-3">Registry</th>
              <th className="py-2 pr-3">Jurisdiction</th>
              <th className="py-2 pr-3">Person / officer data</th>
              <th className="py-2 pr-3">Access</th>
              <th className="py-2 pr-3">Freshness</th>
              <th className="py-2">Review</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-border/30 last:border-0 align-top">
                <td className="py-2 pr-3 font-semibold text-foreground whitespace-nowrap">{source.label}</td>
                <td className="py-2 pr-3 text-cyan-300 whitespace-nowrap">{source.jurisdiction}</td>
                <td className="py-2 pr-3 text-muted-foreground">{source.personOfficerFields}</td>
                <td className="py-2 pr-3 text-muted-foreground">{source.accessMethod}</td>
                <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{source.freshness}</td>
                <td className={cn(
                  "py-2 whitespace-nowrap",
                  source.productionReviewStatus === "reviewed_for_production" ? "text-emerald-400" : "text-amber-400",
                )}>
                  {source.productionReviewStatus === "reviewed_for_production" ? "✓ reviewed" : "pending review"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="rounded-lg border border-border/40 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{source.label}</span>
              <span className={cn(
                "text-[9px] font-mono",
                source.productionReviewStatus === "reviewed_for_production" ? "text-emerald-400" : "text-amber-400",
              )}>
                {source.productionReviewStatus === "reviewed_for_production" ? "✓" : "pending"}
              </span>
            </div>
            <div className="text-[10px] font-mono text-cyan-300">{source.jurisdiction}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{source.accessMethod} · {source.freshness}</div>
          </div>
        ))}
      </div>
        </>
      )}
      <p className="text-[10px] font-mono text-muted-foreground mt-3">
        Coverage labels document source quality and review work; they do not gate private research.
      </p>
    </section>
  );
}

// ─── J3 Identity Resolution Panel ───────────────────────────────────────────

type IdentityStats = {
  phase: "J3";
  bundles: number;
  candidates: Record<string, number>;
  reviewOnly: boolean;
};

function IdentityResolutionPanel() {
  const [stats, setStats] = useState<IdentityStats | null>(null);

  useEffect(() => {
    apiGet("/api/identity/stats")
      .then((data) => setStats(data as IdentityStats))
      .catch(() => setStats(null));
  }, []);

  const pending   = stats?.candidates.pending   ?? 0;
  const confirmed = stats?.candidates.confirmed ?? 0;
  const rejected  = stats?.candidates.rejected  ?? 0;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold font-mono uppercase tracking-widest text-violet-400">
          Identity Resolution
        </span>
        <p className="text-[10px] font-mono text-muted-foreground">
          — cross-registry name bundles &amp; link candidates
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Bundles",       value: stats?.bundles ?? "—", color: "text-cyan-300" },
          { label: "Pending",       value: pending,               color: "text-amber-300" },
          { label: "Confirmed",     value: confirmed,             color: "text-emerald-300" },
          { label: "Rejected",      value: rejected,              color: "text-muted-foreground" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
            <div className={`text-lg font-bold font-mono ${item.color}`}>
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </div>
            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-mono text-muted-foreground/60">
        Review-only — confirmed links do not auto-merge entities or promote contacts.
      </p>
    </section>
  );
}


// ─── Phase L: Python Tools Status Panel ──────────────────────────────────────

type PythonToolsStatus = {
  tools: Record<string, boolean>;
  gliner: { available: boolean; port: number };
  installCommand: string;
};

function PythonToolsPanel() {
  const [status, setStatus] = useState<PythonToolsStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/enrich/python-tools`)
      .then(r => r.json())
      .then(d => { setStatus(d as PythonToolsStatus); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const TOOL_META: Record<string, { label: string; desc: string }> = {
    holehe:       { label: "Holehe",       desc: "Email → 200+ service accounts" },
    maigret:      { label: "Maigret",      desc: "Username → 3,000+ social profiles" },
    theHarvester: { label: "theHarvester", desc: "Domain → emails, hostnames, Shodan" },
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold font-mono uppercase tracking-widest text-violet-400">
            Phase L — Python OSINT Tools
          </span>
          <span className="text-[9px] font-mono bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded uppercase tracking-wider">L</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* GLiNER service status */}
      <div className="rounded-lg border border-border/50 bg-muted/10 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-violet-300" />
          <div>
            <div className="text-xs font-semibold text-foreground">GLiNER NER Microservice</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              urchade/gliner-multi-v2.1 · port {status?.gliner.port ?? 7890}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${status?.gliner.available ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className={`text-[10px] font-mono ${status?.gliner.available ? "text-emerald-400" : "text-amber-400"}`}>
            {status ? (status.gliner.available ? "Online" : "Offline") : "—"}
          </span>
        </div>
      </div>

      {!status?.gliner.available && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-[10px] font-mono text-amber-400/80">
            Start GLiNER service: <code className="bg-muted px-1 rounded">python3 scripts/gliner_service.py</code>
            &nbsp;· Falls back to regex NER automatically.
          </p>
        </div>
      )}

      {/* CLI tool availability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {status && Object.entries(TOOL_META).map(([key, meta]) => {
          const available = status.tools[key] ?? false;
          return (
            <div key={key} className="rounded-lg border border-border/40 bg-muted/5 p-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-semibold text-foreground">{meta.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-emerald-500" : "bg-rose-500/60"}`} />
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">{meta.desc}</div>
              <div className={`text-[9px] font-mono mt-0.5 ${available ? "text-emerald-400" : "text-rose-400/70"}`}>
                {available ? "installed" : "not available"}
              </div>
            </div>
          );
        })}
        {!status && (
          <div className="col-span-3 text-[10px] font-mono text-muted-foreground">Checking tool availability…</div>
        )}
      </div>

      <p className="text-[9px] font-mono text-muted-foreground/60">
        All tools run server-side. Endpoints: /api/enrich/holehe · /api/enrich/maigret · /api/enrich/theharvester
      </p>
    </section>
  );
}

// ─── J9 Source Quality Dashboard ─────────────────────────────────────────────

type SourceQualityRow = {
  source: string;
  total_evidence: number;
  verified_count: number;
  candidate_count: number;
  rejected_count: number;
  avg_reliability: number;
  avg_directness: number;
  avg_corroboration: number;
  entities_covered: number;
  vector_types: number;
};

type OutcomeRow = { outcome: string; count: number; pct: number };

type SourceQualityData = {
  bySource: SourceQualityRow[];
  outcomeSummary: OutcomeRow[];
  generatedAt: string;
};

function SourceQualityPanel() {
  const [data, setData] = useState<SourceQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    apiGet("/api/pipeline/phase-j/source-quality")
      .then((d) => { setData(d as SourceQualityData); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Unavailable"); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const outcomeColor: Record<string, string> = {
    direct_contact_verified: "text-emerald-400",
    direct_contact_candidate: "text-amber-300",
    social_only: "text-violet-300",
    organization_contact: "text-rose-300",
    evidence_only: "text-blue-300",
    none: "text-muted-foreground",
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <div>
            <span className="text-sm font-semibold font-mono uppercase tracking-widest text-cyan-400">
              J9 Source Quality
            </span>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              Per-source verification rates, directness scores, and entity coverage
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg px-3 py-2 text-xs font-semibold border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
        </button>
      </div>

      {error && <p className="text-[10px] font-mono text-rose-400">{error}</p>}

      {/* Outcome summary */}
      {data?.outcomeSummary && data.outcomeSummary.length > 0 && (
        <div>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Contact outcome distribution</p>
          <div className="flex flex-wrap gap-2">
            {data.outcomeSummary.map(({ outcome, count, pct }) => (
              <div key={outcome} className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 min-w-[100px]">
                <div className={`text-base font-bold font-mono ${outcomeColor[outcome] ?? "text-foreground"}`}>
                  {Number(count).toLocaleString()}
                </div>
                <div className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider leading-tight">
                  {outcome.replace(/_/g, " ")}
                </div>
                <div className="text-[8px] font-mono text-muted-foreground">{pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-source table */}
      {data?.bySource && data.bySource.length > 0 && (
        <div>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Evidence by source</p>
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-border/40 bg-muted/10">
                  {["Source", "Entities", "Evidence", "Verified", "Candidate", "Reliability", "Directness"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.bySource.slice(0, 12).map((row) => (
                  <tr key={row.source} className="border-b border-border/20 hover:bg-muted/5">
                    <td className="px-3 py-1.5 text-foreground font-medium">{row.source}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.entities_covered.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.total_evidence.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-emerald-400">{row.verified_count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-amber-300">{row.candidate_count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-cyan-300">{(row.avg_reliability ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-blue-300">{(row.avg_directness ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.bySource.length === 0 && (
            <p className="text-[10px] font-mono text-muted-foreground py-4 text-center">
              No evidence rows yet — run a Phase J pass first.
            </p>
          )}
        </div>
      )}

      {data && (
        <p className="text-[9px] font-mono text-muted-foreground">
          Generated {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      )}
    </section>
  );
}

// ─── Enrichment Coverage Stats ───────────────────────────────────────────────


// ─── Per-source card ──────────────────────────────────────────────────────────

function SourceCard({ src }: { src: SourceDef }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-2.5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg p-2 flex-shrink-0" style={{ background: src.bg }}>
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
            {src.comingSoon && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                coming soon
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{src.description}</p>
        </div>

        {src.homepage && (
          <a
            href={src.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {src.note && (
        <p className="text-[11px] font-mono text-muted-foreground/60 border-l-2 border-border pl-2">
          {src.note}
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DataSources() {
  const ingestors = SOURCES.filter((s) => s.kind === "ingestor");
  const enrichers = SOURCES.filter((s) => s.kind === "enricher");

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
              {ingestors.length} registries · {enrichers.filter(s => !s.comingSoon).length} enrichers · ingestion runs automatically
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-5 space-y-6">

        {/* ── Contact enrichment funnel ──────────────────────────────────────── */}
        <FunnelPanel />

        {/* ── Identity Resolution stats ─────────────────────────────────────── */}
        <IdentityResolutionPanel />

        {/* ── Source quality (evidence attribution) ─────────────────────────── */}
        <SourceQualityPanel />

        {/* ── Registry coverage ─────────────────────────────────────────────── */}
        <RegistryMatrixPanel />

        {/* ── Registries & Ingestors ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-primary">
              Registries
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {ingestors.map((src) => (
              <SourceCard key={src.id} src={src} />
            ))}
          </div>
        </section>

        {/* ── Enrichment sources (phases 1–10) ──────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-primary">
              Enrichment
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {enrichers.filter(s => s.phase < 11).map((src) => (
              <SourceCard key={src.id} src={src} />
            ))}
          </div>
        </section>

        {/* ── Phase L: Extended OSINT Tools ─────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-violet-400">
              Phase L — Extended OSINT
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Python tool runtime status */}
          <div className="mb-4">
            <PythonToolsPanel />
          </div>

          {/* Phase L source cards */}
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {[...ingestors, ...enrichers].filter(s => s.phase === 11).map((src) => (
              <SourceCard key={src.id} src={src} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
