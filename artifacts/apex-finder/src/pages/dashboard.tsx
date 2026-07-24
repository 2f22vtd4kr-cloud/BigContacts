import { useGetDashboardStats, useGetHotLeads } from "@workspace/api-client-react";
import {
  Radio, Mail, Phone, Network, ChevronRight, Database, Activity, Users,
  Loader2, CheckCircle2, XCircle, Globe, ShieldCheck, BookOpen,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { formatEntityName } from "@/lib/utils";

// ── Grade helpers ─────────────────────────────────────────────────────────────

type Grade = "A" | "B" | "C" | "D";

function getAccessGrade(score: number): Grade {
  if (score >= 0.8) return "A";
  if (score >= 0.65) return "B";
  if (score >= 0.5) return "C";
  return "D";
}

const GRADE_STYLE: Record<Grade, { bg: string; text: string; border: string }> = {
  A: { bg: "rgba(16,185,129,0.15)", text: "#10B981", border: "#10B981" },
  B: { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", border: "#3B82F6" },
  C: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", border: "#F59E0B" },
  D: { bg: "rgba(107,114,128,0.15)", text: "#6B7280", border: "#6B7280" },
};

function formatWealthTier(netWorth?: number | null): string | null {
  if (netWorth == null) return null;
  if (netWorth >= 100_000_000) return `Ultra · $${Math.round(netWorth / 1_000_000)}M`;
  if (netWorth >= 30_000_000) return `Very High · $${Math.round(netWorth / 1_000_000)}M`;
  if (netWorth >= 4_000_000) return `High · $${Math.round(netWorth / 1_000_000)}M`;
  return null;
}

// ── Data unavailable / empty ──────────────────────────────────────────────────

function DataUnavailable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-muted-foreground",
      compact ? "px-4 py-3 text-[10px]" : "justify-center px-6 py-10 text-center text-xs",
    )}>
      <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
      <span>
        Dashboard data is temporarily unavailable.
        {!compact && (
          <>
            {" "}
            <Link href="/jobs" className="text-primary/80 hover:text-primary underline">
              View research tasks
            </Link>{" "}or try again shortly.
          </>
        )}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <Database className="w-7 h-7" style={{ color: "#10B981" }} />
      </div>
      <h2 className="text-lg font-bold font-mono text-foreground mb-2 uppercase tracking-widest">
        No Profiles Found Yet
      </h2>
      <p className="text-sm text-muted-foreground font-mono max-w-md mb-8">
        Background searches run automatically. Start a manual search to discover profiles now.
      </p>
      <Link href="/jobs"
        className="flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm uppercase tracking-widest transition-colors"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
      >
        <Radio className="w-4 h-4 shrink-0" />
        Open Search Tasks
        <ChevronRight className="w-4 h-4 shrink-0" />
      </Link>
    </div>
  );
}

// ── Operations Rail (live research jobs) ──────────────────────────────────────

interface LiveJob {
  id?: string;
  kind?: string;
  label: string;
  progress: number;
  status: string;
  message?: string;
}

interface CompletedJob {
  label: string;
  inserted?: number;
  message?: string;
  lastRunAt?: string;
}

function useJobPoll() {
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [completed, setCompleted] = useState<CompletedJob | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(() => {
    fetch("/api/ingest/jobs")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: any) => {
        setFetchError(false);
        const all: any[] = data.jobs ?? [];
        const active = all
          .filter((j) => j.status === "running" || j.status === "queued")
          .slice(0, 3)
          .map((j) => ({
            id: j.jobId ?? j.id,
            kind: j.id,
            label: j.label ?? j.type ?? "Task",
            progress: j.progress ?? 0,
            status: j.status,
            message: j.message ?? "",
          }));
        setJobs(active);
        if (active.length === 0) {
          const done = all
            .filter((j) => j.lastRunAt || j.status === "done" || j.status === "failed")
            .sort((a, b) => {
              const at = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
              const bt = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
              return bt - at;
            })[0];
          if (done) setCompleted({ label: done.label ?? done.type ?? "Task", inserted: done.inserted, message: done.message, lastRunAt: done.lastRunAt });
        } else {
          setCompleted(null);
        }
      })
      .catch(() => setFetchError(true));
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  return { jobs, completed, fetchError };
}

// ── Process stream glyph system ───────────────────────────────────────────────

type GlyphKind =
  | "wikipedia" | "browser" | "search" | "globe"
  | "github" | "dns" | "mail" | "phone"
  | "plane" | "registry" | "property" | "company"
  | "person" | "graph" | "path" | "document";

type GlyphSpec = { kind: GlyphKind; size?: "small" | "medium" | "large"; tilt?: number };

function ProcessGlyph({ spec }: { spec: GlyphSpec }) {
  const size = spec.size === "large" ? 24 : spec.size === "medium" ? 18 : 13;
  const stroke = spec.size === "large" ? 1.6 : 1.4;
  const svgProps = {
    width: size, height: size, viewBox: "0 0 32 32", fill: "none" as const,
    stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { transform: `rotate(${spec.tilt ?? 0}deg)`, display: "block" as const },
  };
  const paths: Record<GlyphKind, ReactNode> = {
    wikipedia: <><path d="M5 9h4l4 13 3-9 3 9 4-13h4" /><path d="M8 9l-2 0M26 9l2 0" /></>,
    browser:   <><rect x="4" y="5" width="24" height="21" rx="3" /><path d="M4 11h24M8 8.2h.1M11 8.2h.1M14 8.2h.1" /><path d="m10 17 3 3 6-6" /></>,
    search:    <><circle cx="14" cy="14" r="7" /><path d="m19 19 7 7M11 14h6M14 11v6" /></>,
    globe:     <><circle cx="16" cy="16" r="11" /><path d="M5 16h22M16 5c3 3 4 7 4 11s-1 8-4 11c-3-3-4-7-4-11s1-8 4-11Z" /></>,
    github:    <path d="M16 4a11 11 0 0 0-3.5 21.4c.6.1.8-.3.8-.6v-2.3c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6-.8 1.9-1.3.1-.7.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3.1 1.1a10.7 10.7 0 0 1 5.7 0c2.2-1.4 3.1-1.1 3.1-1.1.6 1.6.2 2.8.1 3.1.7.8 1.1 1.8 1.1 3 0 4.2-2.6 5.1-5.1 5.4.4.3.7 1 .7 2v3.1c0 .3.2.7.8.6A11 11 0 0 0 16 4Z" />,
    dns:       <><rect x="5" y="5" width="9" height="7" rx="1.5" /><rect x="18" y="5" width="9" height="7" rx="1.5" /><rect x="11.5" y="20" width="9" height="7" rx="1.5" /><path d="M9.5 12v4h13v-4M16 16v4" /></>,
    mail:      <><rect x="4" y="7" width="24" height="18" rx="2" /><path d="m5 9 11 9L27 9" /></>,
    phone:     <path d="M10 5.5 7.5 7c-1.3.8-1.5 2.6-.8 4.1 2.7 5.7 7.5 10.5 13.2 13.2 1.5.7 3.3.5 4.1-.8l1.5-2.5-5.1-3.1-2 2a18.5 18.5 0 0 1-7.5-7.5l2-2L10 5.5Z" />,
    plane:     <><path d="m4 17 24-7-7 24-4-13-13-4Z" /><path d="m17 21 7-7" /></>,
    registry:  <><path d="M6 26V9l10-4 10 4v17M4 26h24M11 13h2M19 13h2M11 18h2M19 18h2M11 23h2M19 23h2" /></>,
    property:  <><path d="m4 15 12-10 12 10" /><path d="M7 13v13h18V13M12 26v-7h8v7" /></>,
    company:   <><path d="M7 27V5h12v22M19 12h6v15M11 9h3M11 14h3M11 19h3M22 16h1M22 21h1M5 27h22" /></>,
    person:    <><circle cx="16" cy="10" r="4" /><path d="M7 27c.8-5 3.7-8 9-8s8.2 3 9 8" /></>,
    graph:     <><circle cx="7" cy="16" r="3" /><circle cx="24" cy="8" r="3" /><circle cx="24" cy="24" r="3" /><path d="m9.7 14.7 11.6-5.4M9.7 17.3l11.6 5.4" /></>,
    path:      <><circle cx="7" cy="23" r="2.5" /><circle cx="16" cy="9" r="2.5" /><circle cx="25" cy="18" r="2.5" /><path d="m8.5 21 6-9M18.2 10.5l5 6" /></>,
    document:  <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8M12 20h8M12 25h5" /></>,
  };
  return <svg {...svgProps} aria-hidden="true">{paths[spec.kind]}</svg>;
}

type ProcessDescriptor = {
  kicker: string;
  glyphs: GlyphSpec[];
  phrases: string[];
  color: string;
};

const PROCESS_DESCRIPTORS: Record<string, ProcessDescriptor> = {
  "western-hnwi": {
    kicker: "company & ownership records",
    color: "#60A5FA",
    glyphs: [
      { kind: "registry", size: "large" },
      { kind: "company",  size: "medium", tilt: -4 },
      { kind: "person",   size: "small" },
      { kind: "document", size: "medium", tilt: 5 },
      { kind: "globe",    size: "small" },
      { kind: "registry", size: "small",  tilt: -4 },
    ],
    phrases: [
      "SEC filings · reading ownership disclosures",
      "Companies House · checking officer names",
      "BRREG · comparing company registrations",
      "issuer record · linking a person to a company",
    ],
  },
  "in-house-enrich": {
    kicker: "public contact paths",
    color: "#10B981",
    glyphs: [
      { kind: "github", size: "medium" },
      { kind: "dns",    size: "large",  tilt: -4 },
      { kind: "mail",   size: "small" },
      { kind: "phone",  size: "medium", tilt: 4 },
      { kind: "globe",  size: "small" },
      { kind: "github", size: "small",  tilt: -5 },
    ],
    phrases: [
      "GitHub · checking public code profiles",
      "RDAP · resolving domain registrants",
      "DNS · testing the company domain",
      "public email · validating a contact vector",
    ],
  },
  "deep-web-osint": {
    kicker: "web corroboration",
    color: "#A78BFA",
    glyphs: [
      { kind: "browser",   size: "large" },
      { kind: "wikipedia", size: "medium", tilt: -5 },
      { kind: "search",    size: "small" },
      { kind: "globe",     size: "medium", tilt: 5 },
      { kind: "document",  size: "small" },
      { kind: "browser",   size: "small",  tilt: 4 },
    ],
    phrases: [
      "Wikipedia · reading biographies",
      "search index · checking name variants",
      "public site · looking for corroboration",
      "contact page · validating a signal",
    ],
  },
  faa: {
    kicker: "aircraft ownership",
    color: "#38BDF8",
    glyphs: [
      { kind: "plane",    size: "large",  tilt: -5 },
      { kind: "registry", size: "small" },
      { kind: "person",   size: "medium", tilt: 4 },
      { kind: "property", size: "small" },
      { kind: "document", size: "medium", tilt: -4 },
      { kind: "plane",    size: "small",  tilt: 5 },
    ],
    phrases: [
      "FAA registry · reading aircraft records",
      "N-number · normalizing owner names",
      "aircraft record · attaching an asset",
      "owner address · preparing a research lead",
    ],
  },
  "land-registry": {
    kicker: "UK property transactions",
    color: "#F59E0B",
    glyphs: [
      { kind: "property", size: "large" },
      { kind: "document", size: "medium", tilt: -4 },
      { kind: "person",   size: "small" },
      { kind: "registry", size: "medium", tilt: 4 },
      { kind: "globe",    size: "small" },
      { kind: "property", size: "small",  tilt: -5 },
    ],
    phrases: [
      "HMLR · reading price paid records",
      "£1M+ transactions · extracting addresses",
      "postcode · clustering nearby owners",
      "property record · attaching an asset",
    ],
  },
  "compute-embeddings": {
    kicker: "semantic name index",
    color: "#C084FC",
    glyphs: [
      { kind: "graph",    size: "large" },
      { kind: "search",   size: "medium", tilt: -4 },
      { kind: "document", size: "small" },
      { kind: "person",   size: "medium", tilt: 5 },
      { kind: "path",     size: "small" },
      { kind: "graph",    size: "small",  tilt: -4 },
    ],
    phrases: [
      "name embeddings · converting text to vectors",
      "profile context · indexing key terms",
      "similarity pass · finding candidate matches",
      "index update · persisting new vectors",
    ],
  },
  "semantic-dedup": {
    kicker: "cross-registry deduplication",
    color: "#818CF8",
    glyphs: [
      { kind: "person",   size: "large" },
      { kind: "graph",    size: "medium", tilt: -4 },
      { kind: "search",   size: "small" },
      { kind: "document", size: "medium", tilt: 5 },
      { kind: "path",     size: "small" },
      { kind: "person",   size: "small",  tilt: -4 },
    ],
    phrases: [
      "name pairs · comparing across registries",
      "similarity score · above threshold review",
      "token overlap · confirming candidate match",
      "merge candidate · flagging for review",
    ],
  },
  "bulk-hybrid-research": {
    kicker: "relationship paths",
    color: "#34D399",
    glyphs: [
      { kind: "graph",    size: "large" },
      { kind: "path",     size: "medium", tilt: -4 },
      { kind: "person",   size: "small" },
      { kind: "company",  size: "medium", tilt: 5 },
      { kind: "document", size: "small" },
      { kind: "graph",    size: "small",  tilt: -5 },
    ],
    phrases: [
      "relationship graph · tracing connected records",
      "path scoring · ranking the strongest route",
      "company edge · checking a shared signal",
      "research brief · shaping the next question",
    ],
  },
  "foundation-filings": {
    kicker: "nonprofit affiliations",
    color: "#FBBF24",
    glyphs: [
      { kind: "document", size: "large" },
      { kind: "person",   size: "medium", tilt: -4 },
      { kind: "company",  size: "small" },
      { kind: "registry", size: "medium", tilt: 5 },
      { kind: "graph",    size: "small" },
      { kind: "document", size: "small",  tilt: -4 },
    ],
    phrases: [
      "IRS 990 · reading nonprofit filings",
      "officer list · comparing known names",
      "foundation · linking shared affiliations",
      "colleague edge · adding a relationship",
    ],
  },
  occrp: {
    kicker: "investigative cross-reference",
    color: "#FB7185",
    glyphs: [
      { kind: "document", size: "large" },
      { kind: "search",   size: "medium", tilt: -4 },
      { kind: "person",   size: "small" },
      { kind: "globe",    size: "medium", tilt: 5 },
      { kind: "registry", size: "small" },
      { kind: "document", size: "small",  tilt: -4 },
    ],
    phrases: [
      "Aleph · searching investigative records",
      "entity match · comparing name and country",
      "source check · validating a record",
      "cross-reference · adding risk context",
    ],
  },
  opensky: {
    kicker: "live aircraft movement",
    color: "#22D3EE",
    glyphs: [
      { kind: "plane",    size: "large",  tilt: -5 },
      { kind: "globe",    size: "medium", tilt: 4 },
      { kind: "registry", size: "small" },
      { kind: "plane",    size: "medium", tilt: 5 },
      { kind: "document", size: "small" },
      { kind: "globe",    size: "small",  tilt: -4 },
    ],
    phrases: [
      "OpenSky · checking live flight data",
      "ICAO hex · matching to known aircraft",
      "callsign · confirming tail number",
      "position update · refreshing movement signal",
    ],
  },
};

function getProcessDescriptor(job: LiveJob): ProcessDescriptor {
  const key = job.kind ?? "";
  if (PROCESS_DESCRIPTORS[key]) return PROCESS_DESCRIPTORS[key];
  const normalized = `${key} ${job.label}`.toLowerCase();
  if (normalized.includes("deep web")) return PROCESS_DESCRIPTORS["deep-web-osint"];
  if (normalized.includes("in-house")) return PROCESS_DESCRIPTORS["in-house-enrich"];
  if (normalized.includes("western")) return PROCESS_DESCRIPTORS["western-hnwi"];
  if (normalized.includes("land")) return PROCESS_DESCRIPTORS["land-registry"];
  if (normalized.includes("faa") || normalized.includes("aircraft")) return PROCESS_DESCRIPTORS.faa;
  return {
    kicker: "source discovery",
    color: "#10B981",
    glyphs: [
      { kind: "search",   size: "large" },
      { kind: "document", size: "medium", tilt: -4 },
      { kind: "globe",    size: "small" },
      { kind: "person",   size: "medium", tilt: 4 },
      { kind: "registry", size: "small" },
      { kind: "search",   size: "small",  tilt: -4 },
    ],
    phrases: [
      "source discovery · scanning public records",
      "record validation · checking provenance",
      "entity match · comparing known signals",
      "update pass · refreshing intelligence",
    ],
  };
}

// ── Lean SVG icon used by ProcessAtmosphere ───────────────────────────────────

function GlyphIcon({ kind, sizePx }: { kind: GlyphKind; sizePx: number }) {
  const sw = sizePx > 28 ? 1.2 : sizePx > 18 ? 1.5 : 1.85;
  const paths: Record<GlyphKind, ReactNode> = {
    wikipedia: <><path d="M5 9h4l4 13 3-9 3 9 4-13h4" /><path d="M8 9l-2 0M26 9l2 0" /></>,
    browser:   <><rect x="4" y="5" width="24" height="21" rx="3" /><path d="M4 11h24M8 8.2h.1M11 8.2h.1M14 8.2h.1" /><path d="m10 17 3 3 6-6" /></>,
    search:    <><circle cx="14" cy="14" r="7" /><path d="m19 19 7 7M11 14h6M14 11v6" /></>,
    globe:     <><circle cx="16" cy="16" r="11" /><path d="M5 16h22M16 5c3 3 4 7 4 11s-1 8-4 11c-3-3-4-7-4-11s1-8 4-11Z" /></>,
    github:    <path d="M16 4a11 11 0 0 0-3.5 21.4c.6.1.8-.3.8-.6v-2.3c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6-.8 1.9-1.3.1-.7.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3.1 1.1a10.7 10.7 0 0 1 5.7 0c2.2-1.4 3.1-1.1 3.1-1.1.6 1.6.2 2.8.1 3.1.7.8 1.1 1.8 1.1 3 0 4.2-2.6 5.1-5.1 5.4.4.3.7 1 .7 2v3.1c0 .3.2.7.8.6A11 11 0 0 0 16 4Z" />,
    dns:       <><rect x="5" y="5" width="9" height="7" rx="1.5" /><rect x="18" y="5" width="9" height="7" rx="1.5" /><rect x="11.5" y="20" width="9" height="7" rx="1.5" /><path d="M9.5 12v4h13v-4M16 16v4" /></>,
    mail:      <><rect x="4" y="7" width="24" height="18" rx="2" /><path d="m5 9 11 9L27 9" /></>,
    phone:     <path d="M10 5.5 7.5 7c-1.3.8-1.5 2.6-.8 4.1 2.7 5.7 7.5 10.5 13.2 13.2 1.5.7 3.3.5 4.1-.8l1.5-2.5-5.1-3.1-2 2a18.5 18.5 0 0 1-7.5-7.5l2-2L10 5.5Z" />,
    plane:     <><path d="m4 17 24-7-7 24-4-13-13-4Z" /><path d="m17 21 7-7" /></>,
    registry:  <><path d="M6 26V9l10-4 10 4v17M4 26h24M11 13h2M19 13h2M11 18h2M19 18h2M11 23h2M19 23h2" /></>,
    property:  <><path d="m4 15 12-10 12 10" /><path d="M7 13v13h18V13M12 26v-7h8v7" /></>,
    company:   <><path d="M7 27V5h12v22M19 12h6v15M11 9h3M11 14h3M11 19h3M22 16h1M22 21h1M5 27h22" /></>,
    person:    <><circle cx="16" cy="10" r="4" /><path d="M7 27c.8-5 3.7-8 9-8s8.2 3 9 8" /></>,
    graph:     <><circle cx="7" cy="16" r="3" /><circle cx="24" cy="8" r="3" /><circle cx="24" cy="24" r="3" /><path d="m9.7 14.7 11.6-5.4M9.7 17.3l11.6 5.4" /></>,
    path:      <><circle cx="7" cy="23" r="2.5" /><circle cx="16" cy="9" r="2.5" /><circle cx="25" cy="18" r="2.5" /><path d="m8.5 21 6-9M18.2 10.5l5 6" /></>,
    document:  <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8M12 20h8M12 25h5" /></>,
  };
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 32 32"
      fill="none" stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }} aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

// ── Seeded RNG + slot builder ──────────────────────────────────────────────────

/** XOR-shift seeded RNG — reproducible layout per job without React state */
function seededRng(seed: number) {
  let s = (seed | 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

type AtmosphereSlot = {
  kind:   GlyphKind;
  sizePx: number;
  opacity: number;
  /** vertical offset as % of bar height — values >±50% overflow and get clipped */
  yPct:   number;
  rotZ:   number;
  rotX:   number;
};

/**
 * Build randomised icon slots for one depth layer.
 * layer 0 = far / slow / small / barely visible
 * layer 1 = mid
 * layer 2 = near / fast / large / overflows bar height for 3-D crop
 */
function buildAtmosphereLayer(
  descriptor: ProcessDescriptor,
  seed:       number,
  intensity:  number,   // 0..1
  layer:      0 | 1 | 2,
): AtmosphereSlot[] {
  const rng       = seededRng(seed + layer * 9973);
  const primary   = descriptor.glyphs[0]?.kind ?? "search";
  const support   = descriptor.glyphs.slice(1).map(g => g.kind);

  // Density rises with intensity — feels like a wave of icons flooding in
  const baseCounts  = [4, 5, 3] as const;
  const extraCounts = [7, 7, 5] as const;
  const count = baseCounts[layer] + Math.round(intensity * extraCounts[layer]);

  // Size ranges per layer (px). Near layer deliberately overshoots bar height.
  const sizeRanges: [number, number][] = [[8, 13], [12, 21], [22, 58]];
  // Base opacity — everything intentionally subtle/dissolved
  const opBase = [0.05, 0.11, 0.24][layer];
  // Vertical spread as % of half-height; near layer spills well beyond bar bounds
  const ySpread  = [26, 50, 105][layer];
  // Rotation: far is nearly flat, near has dramatic tilts for depth feel
  const rotZSp   = [5, 15, 46][layer];
  const rotXSp   = [0, 12, 40][layer];

  return Array.from({ length: count }, (): AtmosphereSlot => {
    // Primary icon dominates more at high intensity (wave effect)
    const primaryBias = 0.38 + intensity * 0.40;
    const kind = rng() < primaryBias
      ? primary
      : (support.length ? support[Math.floor(rng() * support.length)] : primary);

    const [sMin, sMax] = sizeRanges[layer];
    // Skew toward smaller — a few big ones stand out
    const sizePx  = Math.round(sMin + Math.pow(rng(), 0.55) * (sMax - sMin));
    const opacity = opBase * (0.35 + rng() * 0.9) * (0.25 + intensity * 0.75);
    const yPct    = (rng() * 2 - 1) * ySpread;
    const rotZ    = (rng() * 2 - 1) * rotZSp;
    const rotX    = (rng() * 2 - 1) * rotXSp;
    return { kind, sizePx, opacity, yPct, rotZ, rotX };
  });
}

// ── ProcessAtmosphere ─────────────────────────────────────────────────────────

/**
 * Depth-layered, parallax icon field occupying the right ~62% of the progress
 * bar. Three independent scroll speeds create genuine parallax. Large near-layer
 * icons overflow the bar height and are clipped by the parent overflow:hidden,
 * producing the 3-D crop look. Density rises with job.progress to imitate
 * fluctuating processing intensity. Left edge dissolves into the progress fill.
 */
function ProcessAtmosphere({ job }: { job: LiveJob }) {
  const descriptor = getProcessDescriptor(job);
  // Floor at 0.15 so there's always ambient activity even at 0%
  const intensity  = Math.min(1, Math.max(0.15, (job.progress ?? 10) / 100));
  // Only re-generate slots when the density band changes (not every % tick)
  const iBand = Math.floor(intensity * 5);

  const seed = useMemo(
    () => [...(job.id ?? job.kind ?? "x")].reduce((a, c) => a * 31 + c.charCodeAt(0), 1),
    [job.id, job.kind],
  );

  const layers = useMemo(
    () => ([0, 1, 2] as const).map(l => buildAtmosphereLayer(descriptor, seed, intensity, l)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, iBand],
  );

  // Far → near: slow → fast scroll durations
  const DURS = ["46s", "23s", "11s"] as const;
  // Inter-slot gaps per layer; also used as trailing padding for seamless loop
  const GAPS = [32, 24, 17] as const;

  const doubledPhrases = [...descriptor.phrases, ...descriptor.phrases];

  return (
    <div
      className="proc-atmosphere"
      style={{ "--proc-accent": descriptor.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* Three depth layers — far (0) through near (2) */}
      {([0, 1, 2] as const).map(l => {
        const doubled = [...layers[l], ...layers[l]];
        return (
          <div key={l} className="proc-layer">
            <div
              className="proc-track"
              style={{
                gap: GAPS[l],
                paddingRight: GAPS[l],       // trailing gap = seamless loop, no visible jump
                "--proc-dur": DURS[l],
              } as React.CSSProperties}
            >
              {doubled.map((slot, i) => (
                <span
                  key={i}
                  className="proc-slot"
                  style={{
                    width:   slot.sizePx + 2,
                    height:  slot.sizePx + 2,
                    opacity: slot.opacity,
                    color:   descriptor.color,
                    // rotateX uses the perspective set on .proc-atmosphere
                    transform: `translateY(${slot.yPct}%) rotateZ(${slot.rotZ}deg) rotateX(${slot.rotX}deg)`,
                    filter: l === 2
                      ? `drop-shadow(0 0 3px color-mix(in srgb, ${descriptor.color} 25%, transparent))`
                      : undefined,
                  }}
                >
                  <GlyphIcon kind={slot.kind} sizePx={slot.sizePx} />
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* Phrase layer — slowest, most dissolved, sits behind icon layers */}
      <div className="proc-layer proc-phrase-layer">
        <div
          className="proc-track"
          style={{
            gap: 58,
            paddingRight: 58,
            "--proc-dur": "34s",
          } as React.CSSProperties}
        >
          {doubledPhrases.map((phrase, i) => (
            <span key={i} className="proc-phrase" style={{ color: descriptor.color }}>
              {phrase}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Desktop horizontal operations rail */
function OperationsRail() {
  const { jobs, completed, fetchError } = useJobPoll();
  const hasActive = jobs.length > 0;

  if (fetchError) return null;

  return (
    <div
      className="border-b px-6 py-4 flex-shrink-0"
      style={{
        background: hasActive
          ? "linear-gradient(90deg, rgba(16,185,129,0.05) 0%, rgba(11,15,25,0) 100%)"
          : "transparent",
        borderColor: "#2A3045",
      }}
      data-testid="operations-rail"
    >
      {hasActive ? (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <div key={job.id ?? i} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-52 flex-shrink-0 min-w-0">
                <div
                  className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                  style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }}
                />
                <span className="text-sm font-medium truncate">{job.label}</span>
              </div>
              <div
                className="relative flex-1 min-w-0 h-8 rounded-md overflow-hidden"
                style={{ background: "#1E2332" }}
                title={job.message || getProcessDescriptor(job).kicker}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, job.progress))}%`,
                    background: "linear-gradient(90deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))",
                  }}
                />
                <ProcessAtmosphere job={job} />
              </div>
              <span className="text-sm font-mono w-12 text-right flex-shrink-0" style={{ color: "#10B981" }}>
                {Math.round(job.progress)}%
              </span>
            </div>
          ))}
        </div>
      ) : completed ? (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#10B981" }} />
          <span className="text-sm font-medium">{completed.label}</span>
          {completed.inserted != null && (
            <span className="text-sm" style={{ color: "#10B981" }}>+{completed.inserted.toLocaleString()} profiles added</span>
          )}
          {completed.message && !completed.inserted && (
            <span className="text-sm text-muted-foreground">{completed.message}</span>
          )}
          <Link href="/jobs" className="ml-auto text-xs font-mono flex items-center gap-0.5 flex-shrink-0"
            style={{ color: "hsl(215,16%,65%)" }}>
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          <span className="font-mono">Background tasks idle</span>
          <Link href="/jobs" className="ml-auto text-xs font-mono flex items-center gap-0.5"
            style={{ color: "hsl(215,16%,65%)" }}>
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();
  const { jobs } = useJobPoll();
  const s = stats as any;

  if (isLoading) {
    return (
      <div className="h-16 border-b flex items-center px-6 gap-8" style={{ background: "#141824", borderColor: "#2A3045" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-5 w-10 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !s) {
    return (
      <div className="h-16 border-b flex items-center" style={{ background: "#141824", borderColor: "#2A3045" }}>
        <DataUnavailable compact />
      </div>
    );
  }

  const stats4 = [
    {
      icon: <Mail size={18} style={{ color: "#10B981" }} />,
      iconBg: "rgba(16,185,129,0.15)",
      value: (s.contactableCount ?? 0).toLocaleString(),
      label: "Reachable",
      href: "/profiles?contactable=1",
    },
    {
      icon: <Radio size={18} style={{ color: "#3B82F6" }} />,
      iconBg: "rgba(59,130,246,0.15)",
      value: jobs.length.toString(),
      label: "Active Tasks",
      href: "/jobs",
    },
    {
      icon: <Users size={18} style={{ color: "#9CA3AF" }} />,
      iconBg: "rgba(107,114,128,0.15)",
      value: (s.totalEntities ?? 0).toLocaleString(),
      label: "Profiles",
      href: "/profiles",
    },
    {
      icon: <Activity size={18} style={{ color: "#9CA3AF" }} />,
      iconBg: "rgba(107,114,128,0.15)",
      value: `${(s.enrichmentCoverage ?? 0).toFixed(1)}%`,
      label: "Coverage",
      href: null,
    },
  ];

  return (
    <div
      className="border-b flex items-center px-4 sm:px-6 flex-shrink-0"
      style={{ background: "#141824", borderColor: "#2A3045", minHeight: "4rem" }}
      data-testid="stats-bar"
    >
      <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {stats4.map(({ icon, iconBg, value, label, href }) => {
          const inner = (
            <div className="flex items-center gap-3 flex-shrink-0 py-3">
              <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                {icon}
              </div>
              <div>
                <div className="text-xl font-bold leading-tight">{value}</div>
                <div className="text-xs leading-none mt-0.5" style={{ color: "hsl(215,16%,65%)" }}>{label}</div>
              </div>
            </div>
          );
          return href
            ? <Link key={label} href={href} className="hover:opacity-80 transition-opacity">{inner}</Link>
            : <div key={label}>{inner}</div>;
        })}

        {/* Compliance badge */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0 hidden md:flex">
          <ShieldCheck className="w-3 h-3" style={{ color: "hsl(215,16%,40%)" }} />
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(215,16%,40%)" }}>
            Public registry data only
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Contact chips ─────────────────────────────────────────────────────────────

const CHIP_STYLE = {
  background: "rgba(16,185,129,0.1)",
  color: "#10B981",
  border: "1px solid rgba(16,185,129,0.3)",
} as const;

function ContactChips({ lead }: { lead: any }) {
  const hasEmail   = !!(lead.email || lead.contactEmail);
  const hasPhone   = !!(lead.phone || lead.contactPhone);
  const hasNetwork = !!lead.linkedinUrl;

  if (!hasEmail && !hasPhone && !hasNetwork) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
        style={{ background: "rgba(107,114,128,0.1)", color: "#6B7280" }}>
        Registry trace only
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hasEmail && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium" style={CHIP_STYLE}>
          <Mail size={11} /> EMAIL
        </div>
      )}
      {hasPhone && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium" style={CHIP_STYLE}>
          <Phone size={11} /> PHONE
        </div>
      )}
      {hasNetwork && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium" style={CHIP_STYLE}>
          <Network size={11} /> NETWORK
        </div>
      )}
    </div>
  );
}

// ── Desktop lead card ─────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: any }) {
  const [, navigate] = useLocation();
  const score = lead.accessScore ?? 0;
  const grade = getAccessGrade(score);
  const gs = GRADE_STYLE[grade];
  const isLowAccess = grade === "D";
  const wealthLabel = formatWealthTier(lead.estimatedNetWorth);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Profile: ${formatEntityName(lead.entityName)}`}
      data-testid={`card-lead-${lead.entityId}`}
      onClick={() => navigate(`/profile/${lead.entityId}`)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/profile/${lead.entityId}`)}
      className="relative p-5 rounded transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      style={{
        background: isLowAccess ? "rgba(20,24,36,0.5)" : "#141824",
        border: "1px solid #2A3045",
        opacity: isLowAccess ? 0.7 : 1,
      }}
    >
      {/* Grade badge */}
      <div
        className="absolute top-4 right-4 w-10 h-10 rounded flex items-center justify-center font-bold text-lg flex-shrink-0"
        style={{ background: gs.bg, color: gs.text, border: `2px solid ${gs.border}` }}
        title={`Access grade ${grade} — ${Math.round(score * 100)} reachability score`}
      >
        {grade}
      </div>

      {/* Name + type */}
      <div className="pr-14 mb-3">
        <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors"
          style={{ color: "hsl(215,19%,89%)" }}>
          {formatEntityName(lead.entityName)}
        </h3>
        <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(215,16%,65%)" }}>
          {lead.entityType && <span>{lead.entityType}</span>}
          {lead.entityType && lead.nationality && <span>•</span>}
          {lead.nationality && <span>{lead.nationality}</span>}
        </div>
      </div>

      {/* Contact chips */}
      <div className="mb-4">
        <ContactChips lead={lead} />
      </div>

      {/* Bottom: wealth + hover cue */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#2A3045" }}>
        <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
          {wealthLabel ?? (lead.assetCount ? `${lead.assetCount} registered assets` : "Registry data only")}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "#10B981" }}>
          View profile <ChevronRight size={14} />
        </div>
      </div>
    </article>
  );
}

function LeadSkeleton() {
  return (
    <div className="p-5 rounded" style={{ background: "#141824", border: "1px solid #2A3045" }}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-14 space-y-2">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
        </div>
        <div className="w-10 h-10 bg-muted animate-pulse rounded flex-shrink-0" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
    </div>
  );
}

// ── Priority contacts grid (desktop) ─────────────────────────────────────────

function ContactQueue() {
  const { data: hotLeads, isLoading, isError } = useGetHotLeads({ limit: 12 });
  const leads = hotLeads as any[] | undefined;

  return (
    <section className="flex-1 flex flex-col overflow-hidden" aria-label="Priority contacts" data-testid="contact-queue">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#2A3045" }}>
        <div>
          <h2 className="text-lg font-semibold">Priority Contacts</h2>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215,16%,65%)" }}>Best people to reach right now</p>
        </div>
        <Link href="/profiles" className="text-sm flex items-center gap-0.5 transition-colors hover:opacity-80"
          style={{ color: "#10B981" }} data-testid="link-all-profiles">
          All profiles <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <LeadSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <DataUnavailable />
        ) : leads && leads.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {leads.map((lead: any) => <LeadCard key={lead.entityId} lead={lead} />)}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

// ── Research context sidebar (desktop right column) ───────────────────────────

function ResearchContextSidebar() {
  const { data: stats } = useGetDashboardStats();
  const s = stats as any;
  const { completed } = useJobPoll();
  const tiers = s?.wealthTiers;
  const total = tiers ? (tiers.ultraHnw + tiers.veryHnw + tiers.hnw + tiers.unknown) : 0;
  const pct = (n: number) => total > 0 ? Math.max((n / total) * 100, n > 0 ? 1 : 0) : 0;

  return (
    <aside
      className="w-80 flex-shrink-0 border-l flex flex-col overflow-hidden"
      style={{ background: "#141824", borderColor: "#2A3045" }}
      aria-label="Research context"
      data-testid="research-context-sidebar"
    >
      <div className="flex items-center gap-2 px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#2A3045" }}>
        <Globe className="w-4 h-4" style={{ color: "hsl(215,16%,65%)" }} />
        <h3 className="text-sm font-semibold">Research Context</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Wealth distribution */}
        {tiers && total > 0 && (
          <div>
            <div className="text-xs mb-3" style={{ color: "hsl(215,16%,65%)" }}>Wealth distribution</div>
            <div className="space-y-2.5">
              {[
                { label: "Ultra >$100M", val: tiers.ultraHnw, color: "#10B981" },
                { label: "Very $30–100M", val: tiers.veryHnw, color: "#3B82F6" },
                { label: "HNW $4–30M", val: tiers.hnw, color: "#6B7280" },
              ].filter(t => t.val > 0).map(t => (
                <div key={t.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "hsl(215,19%,89%)" }}>{t.label}</span>
                    <span className="font-mono" style={{ color: t.color }}>{t.val.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct(t.val)}%`, background: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last completed task */}
        {completed && (
          <div>
            <div className="text-xs mb-3" style={{ color: "hsl(215,16%,65%)" }}>Last completed task</div>
            <div className="p-3 rounded flex items-start gap-3" style={{ background: "#1E2332" }}>
              <CheckCircle2 size={16} style={{ color: "#10B981", marginTop: 2, flexShrink: 0 }} />
              <div className="text-sm min-w-0">
                <div className="font-medium truncate">{completed.label}</div>
                {completed.inserted != null
                  ? <div style={{ color: "#10B981" }}>+{completed.inserted.toLocaleString()} profiles added</div>
                  : completed.message
                  ? <div className="truncate" style={{ color: "hsl(215,16%,65%)" }}>{completed.message}</div>
                  : null}
              </div>
            </div>
          </div>
        )}

        {/* Active data sources */}
        <div>
          <div className="text-xs mb-3" style={{ color: "hsl(215,16%,65%)" }}>Active data sources</div>
          <div className="space-y-2 text-sm">
            {[
              { label: "Public registry data", active: true },
              { label: "SEC / EDGAR filings", active: true },
              { label: "In-house enrichment", active: true },
              { label: "OCCRP Aleph", active: false },
            ].map(({ label, active }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: active ? "#10B981" : "#6B7280" }} />
                <span style={{ color: active ? "hsl(215,19%,89%)" : "hsl(215,16%,65%)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Asset map link */}
        {(s?.totalAssets ?? 0) > 0 && (
          <div>
            <Link href="/network"
              className="flex items-center justify-between p-3 rounded transition-colors hover:opacity-80"
              style={{ background: "#1E2332" }}
              data-testid="link-open-asset-map"
            >
              <div className="text-sm">
                <div className="font-medium">{(s.totalAssets).toLocaleString()} assets</div>
                <div className="text-xs mt-0.5" style={{ color: "hsl(215,16%,65%)" }}>Registered aviation + real estate</div>
              </div>
              <ChevronRight size={16} style={{ color: "#10B981" }} />
            </Link>
          </div>
        )}
      </div>

      {/* Compliance footer */}
      <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: "#2A3045" }}>
        <p className="text-[9px] font-mono flex items-center gap-1.5" style={{ color: "hsl(215,16%,40%)" }}>
          <ShieldCheck className="w-2.5 h-2.5 flex-shrink-0" />
          Public registry sources only · Source attribution on every record
        </p>
      </div>
    </aside>
  );
}

// ── Mobile lead card ──────────────────────────────────────────────────────────

function MobileLeadCard({ lead }: { lead: any }) {
  const score = lead.accessScore ?? 0;
  const grade = getAccessGrade(score);
  const gs = GRADE_STYLE[grade];
  const isLowAccess = grade === "D";
  const wealthLabel = formatWealthTier(lead.estimatedNetWorth);

  return (
    <Link
      href={`/profile/${lead.entityId}`}
      className="block relative p-4 rounded transition-opacity active:opacity-70"
      style={{
        background: isLowAccess ? "rgba(20,24,36,0.5)" : "#141824",
        border: "1px solid #2A3045",
        opacity: isLowAccess ? 0.7 : 1,
      }}
      data-testid={`card-mobile-lead-${lead.entityId}`}
    >
      {/* Grade badge */}
      <div
        className="absolute top-4 right-4 w-9 h-9 rounded flex items-center justify-center font-bold flex-shrink-0"
        style={{ background: gs.bg, color: gs.text, border: `2px solid ${gs.border}`, fontSize: "16px" }}
      >
        {grade}
      </div>

      {/* Name + type */}
      <div className="pr-12 mb-3">
        <h3 className="font-semibold mb-1" style={{ fontSize: "16px", lineHeight: "1.3", color: "hsl(215,19%,89%)" }}>
          {formatEntityName(lead.entityName ?? lead.name)}
        </h3>
        <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(215,16%,65%)" }}>
          {lead.entityType && <span>{lead.entityType}</span>}
          {lead.entityType && lead.nationality && <span>•</span>}
          {lead.nationality && <span>{lead.nationality}</span>}
        </div>
      </div>

      {/* Contact chips */}
      <div className="mb-3">
        <ContactChips lead={lead} />
      </div>

      {/* Wealth */}
      <div className="text-xs pt-3 border-t" style={{ borderColor: "#2A3045", color: "hsl(215,16%,65%)" }}>
        {wealthLabel ?? (lead.assetCount ? `${lead.assetCount} assets` : "Registry data only")}
      </div>
    </Link>
  );
}

// ── Mobile: Operations banner ─────────────────────────────────────────────────

function MobileOperationsBanner() {
  const { jobs, fetchError } = useJobPoll();
  const hasActive = jobs.length > 0;
  if (fetchError || !hasActive) return null;

  return (
    <div
      className="px-4 py-3 border-b flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(11,15,25,0) 100%)",
        borderColor: "#2A3045",
        boxShadow: "0 0 20px rgba(16,185,129,0.08)",
      }}
      data-testid="mobile-ops-banner"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
            style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
          <span className="text-sm font-semibold truncate" style={{ color: "#10B981" }}>
            RESEARCH ACTIVE
          </span>
        </div>
        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "hsl(215,16%,65%)" }}>
          {jobs.length} {jobs.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      <div className="space-y-2.5">
        {jobs.map((job, index) => {
          const descriptor = getProcessDescriptor(job);
          return (
            <div key={job.id ?? index} className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: descriptor.color }}
                />
                <span className="text-xs font-medium truncate">{job.label}</span>
                <span className="text-[10px] font-mono ml-auto flex-shrink-0" style={{ color: descriptor.color }}>
                  {Math.round(job.progress)}%
                </span>
              </div>
              <div
                className="relative h-7 rounded-md overflow-hidden"
                style={{ background: "rgba(30,35,50,0.9)" }}
                title={job.message || descriptor.kicker}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, job.progress))}%`,
                    background: `linear-gradient(90deg, ${descriptor.color}33, ${descriptor.color}0d)`,
                  }}
                />
                <ProcessAtmosphere job={job} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile: stat tiles ────────────────────────────────────────────────────────

function MobileStatTiles() {
  const { data: stats, isError } = useGetDashboardStats();
  const s = stats as any;
  const { jobs } = useJobPoll();

  if (isError || !s) return null;

  const tiles = [
    { value: (s.contactableCount ?? 0).toLocaleString(), label: "Reachable", href: "/profiles?contactable=1" },
    { value: jobs.length.toString(), label: "Active Jobs", href: "/jobs" },
    { value: (s.totalEntities ?? 0) >= 1000 ? `${Math.round((s.totalEntities ?? 0) / 1000)}k` : (s.totalEntities ?? 0).toLocaleString(), label: "Profiles", href: "/profiles" },
    { value: `${(s.enrichmentCoverage ?? 0).toFixed(1)}%`, label: "Coverage", href: null },
  ];

  return (
    <div className="px-4 py-3 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: "#2A3045", scrollbarWidth: "none" }}>
      <div className="flex gap-3 w-max">
        {tiles.map(({ value, label, href }) => {
          const inner = (
            <div className="px-4 py-3 rounded flex-shrink-0" style={{ background: "#141824", minWidth: "90px" }}>
              <div className="text-xl font-bold leading-tight mb-0.5">{value}</div>
              <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>{label}</div>
            </div>
          );
          return href
            ? <Link key={label} href={href}>{inner}</Link>
            : <div key={label}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

// ── Mobile contact view ───────────────────────────────────────────────────────

function MobileContactView() {
  const { data: hotLeads, isLoading, isError } = useGetHotLeads({ limit: 10 });
  const leads = (hotLeads as any[]) ?? [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <MobileOperationsBanner />
      <MobileStatTiles />

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0" style={{ borderColor: "#2A3045" }}>
        <h2 className="text-base font-semibold">Priority Contacts</h2>
        <Link href="/profiles?hot=1" className="text-sm flex items-center gap-0.5" style={{ color: "#10B981" }}>
          All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#10B981" }} />
          </div>
        )}
        {isError && <DataUnavailable />}
        {!isLoading && !isError && leads.length === 0 && <EmptyState />}
        {leads.map((lead: any) => (
          <MobileLeadCard key={lead.entityId ?? lead.id} lead={lead} />
        ))}
      </div>

      {/* Compliance footer */}
      <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: "#2A3045" }}>
        <p className="text-[9px] font-mono flex items-center gap-1.5" style={{ color: "hsl(215,16%,40%)" }}>
          <ShieldCheck className="w-2.5 h-2.5 flex-shrink-0" />
          Public registry data only · Source attribution on every record
        </p>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const s = stats as any;
  const isEmpty = s != null && (s.totalEntities ?? 0) === 0 && !isLoadingStats;

  if (isEmpty) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <StatsBar />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar — desktop only; mobile uses MobileStatTiles inside MobileContactView */}
      <div className="hidden md:block">
        <StatsBar />
      </div>

      {/* ── Desktop: ops rail → two-column content ── */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        <OperationsRail />
        <div className="flex flex-1 overflow-hidden" role="main">
          <ContactQueue />
          <ResearchContextSidebar />
        </div>
      </div>

      {/* ── Mobile: banner → stats → contact list ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden" role="main">
        <MobileContactView />
      </div>
    </div>
  );
}
