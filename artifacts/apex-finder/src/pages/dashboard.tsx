import { useGetDashboardStats, useGetHotLeads } from "@workspace/api-client-react";
import {
  Radio, Mail, Phone, Network, ChevronRight, Database, Activity, Users,
  Loader2, CheckCircle2, XCircle, Globe, ShieldCheck, BookOpen,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
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
              <div className="flex items-center gap-2 w-52 flex-shrink-0">
                <div
                  className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                  style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }}
                />
                <span className="text-sm font-medium truncate">{job.label}</span>
              </div>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, job.progress)}%`, background: "#10B981" }}
                />
              </div>
              <span className="text-sm font-mono w-12 text-right flex-shrink-0" style={{ color: "#10B981" }}>
                {Math.round(job.progress)}%
              </span>
              {job.message && (
                <span className="text-xs w-36 text-right flex-shrink-0 truncate" style={{ color: "hsl(215,16%,65%)" }}>
                  {job.message}
                </span>
              )}
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
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
          style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
        <span className="text-sm font-semibold" style={{ color: "#10B981" }}>
          RESEARCH ACTIVE: {jobs.length}
        </span>
      </div>
      <div className="text-xs truncate" style={{ color: "hsl(215,16%,65%)" }}>
        {jobs.map(j => j.label).join(" · ")}
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
