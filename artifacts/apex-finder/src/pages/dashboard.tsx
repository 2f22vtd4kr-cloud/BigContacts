import { useGetDashboardStats, useGetHotLeads } from "@workspace/api-client-react";
import {
  Database, ChevronRight, Activity, Globe, Radio, Users,
  Loader2, CheckCircle2, XCircle, Mail, Phone, Network,
  MapPin, ShieldCheck, BookOpen, ArrowRight,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { formatCurrency, formatEntityName, formatSignal, AccessScoreBadge } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTypeBadgeStyles(type: string) {
  const t = type?.toLowerCase() || "";
  if (t.includes("hnwi") || t.includes("person")) return "text-violet-400 border-violet-400/20 bg-violet-400/10";
  if (t.includes("corp") || t.includes("company")) return "text-blue-400 border-blue-400/20 bg-blue-400/10";
  if (t.includes("trust")) return "text-amber-400 border-amber-400/20 bg-amber-400/10";
  return "text-muted-foreground border-border bg-card";
}

/** Derive a concise "why ranked" explanation from real HotLead fields */
function buildWhyRanked(lead: any): string {
  const parts: string[] = [];
  const score = lead.accessScore ?? 0;
  if (score >= 0.8) parts.push("High public contact evidence");
  else if (score >= 0.5) parts.push("Moderate contact evidence");
  else parts.push("Registry-only trace");
  if (lead.hasResearchSession) parts.push("active research session");
  if ((lead.assetCount ?? 0) >= 3) parts.push(`${lead.assetCount} registered assets`);
  if (lead.signal && lead.signal.length > 4) {
    const short = formatSignal(lead.signal).split("·")[0]?.trim().slice(0, 60);
    if (short) parts.push(short);
  }
  return parts.join(" · ");
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center" data-testid="empty-state-container">
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Database className="w-7 h-7 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold font-mono text-foreground mb-2 uppercase tracking-widest" data-testid="text-empty-state-title">
        No Profiles Found Yet
      </h2>
      <p className="text-sm text-muted-foreground font-mono max-w-md mb-2">
        Connect to public registries to start discovering profiles and assets.
      </p>
      <p className="text-xs text-muted-foreground/60 font-mono max-w-md mb-8">
        Background searches run automatically. You can also start a manual search to find profiles right now.
      </p>
      <Link
        href="/jobs"
        data-testid="link-jobs-from-empty"
        aria-label="Open search tasks"
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono text-sm uppercase tracking-widest hover:bg-primary/20 transition-colors"
      >
        <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
        Open Search Tasks
        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
      </Link>
      <p className="text-[10px] font-mono text-muted-foreground/40 mt-8 max-w-xs">
        COMPLIANCE: All data from public registries only. Source attribution included on every record.
      </p>
    </div>
  );
}

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
            </Link>
            {" "}or try again shortly.
          </>
        )}
      </span>
    </div>
  );
}

// ── Background Activity Rail ──────────────────────────────────────────────────

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

function BackgroundActivityRail({ className }: { className?: string }) {
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [completed, setCompleted] = useState<CompletedJob | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(() => {
    fetch("/api/ingest/jobs")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data: any) => {
        setFetchError(false);
        const all: any[] = data.jobs ?? [];
        const active = all
          .filter((j: any) => j.status === "running" || j.status === "queued")
          .slice(0, 3)
          .map((j: any) => ({
            id: j.jobId ?? j.id,
            label: j.label ?? j.type ?? "Task",
            progress: j.progress ?? 0,
            status: j.status,
            message: j.message ?? "",
          }));
        setJobs(active);

        if (active.length === 0) {
          const done = all
            .filter((j: any) => j.lastRunAt || j.status === "done" || j.status === "failed")
            .sort((a: any, b: any) => {
              const at = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
              const bt = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
              return bt - at;
            })[0];
          if (done) {
            setCompleted({
              label: done.label ?? done.type ?? "Task",
              inserted: done.inserted,
              message: done.message,
              lastRunAt: done.lastRunAt,
            });
          }
        } else {
          setCompleted(null);
        }
      })
      .catch(() => {
        setFetchError(true);
      });
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  const hasActive = jobs.length > 0;

  return (
    <section
      aria-label="Background activity"
      className={cn("flex flex-col gap-2", className)}
      data-testid="background-activity-rail"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              fetchError
                ? "bg-destructive"
                : hasActive
                ? "bg-primary animate-pulse"
                : "bg-muted-foreground/30",
            )}
            aria-hidden="true"
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {fetchError
              ? "Activity unavailable"
              : hasActive
              ? `${jobs.length} task${jobs.length !== 1 ? "s" : ""} running`
              : "Background tasks idle"}
          </span>
        </div>
        <Link
          href="/jobs"
          data-testid="link-view-all-activity"
          aria-label="View all background activity"
          className="text-[10px] font-mono text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5 whitespace-nowrap"
        >
          View all activity <ChevronRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Active jobs */}
      {hasActive && (
        <div className="px-4 space-y-2.5" data-testid="active-jobs-list">
          {jobs.map((job, i) => (
            <div key={job.id ?? i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" aria-hidden="true" />
                <span className="text-xs font-mono text-foreground/80 truncate flex-1">{job.label}</span>
                <span
                  className={cn(
                    "text-[9px] font-mono uppercase shrink-0",
                    job.status === "running" ? "text-primary" : "text-amber-400",
                  )}
                >
                  {job.status}
                </span>
              </div>
              {job.progress > 0 && (
                <div className="flex items-center gap-2 pl-5">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, job.progress)}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(job.progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground w-7 text-right tabular-nums">
                    {Math.round(job.progress)}%
                  </span>
                </div>
              )}
              {job.message && (
                <p className="text-[9px] font-mono text-muted-foreground/70 pl-5 truncate">{job.message}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed result */}
      {!hasActive && completed && !fetchError && (
        <div className="px-4 flex items-start gap-2" data-testid="completed-job-result">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-foreground/80 truncate">{completed.label}</p>
            {completed.inserted != null && (
              <p className="text-[10px] font-mono text-emerald-500">
                +{completed.inserted.toLocaleString()} profiles added
              </p>
            )}
            {completed.message && !completed.inserted && (
              <p className="text-[10px] font-mono text-muted-foreground truncate">{completed.message}</p>
            )}
          </div>
        </div>
      )}

      {fetchError && (
        <div className="px-4 flex items-center gap-2" data-testid="activity-fetch-error">
          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
          <p className="text-[10px] font-mono text-muted-foreground">Could not load activity — retrying</p>
        </div>
      )}
    </section>
  );
}

// ── Compact Summary Header ────────────────────────────────────────────────────

function DashboardHeader() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();
  const s = stats as any;

  return (
    <header
      className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-20"
      data-testid="dashboard-header"
    >
      {isLoading ? (
        <div className="flex items-center gap-6 px-4 sm:px-6 py-3 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 shrink-0">
              <div className="h-2 w-16 bg-muted animate-pulse rounded" />
              <div className="h-5 w-12 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <DataUnavailable compact />
      ) : !s ? null : (
        <div className="flex items-center gap-0 overflow-x-auto divide-x divide-border">
          {/* Title */}
          <div className="px-4 sm:px-6 py-3 shrink-0">
            <h1 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground whitespace-nowrap">
              Research Command Center
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 whitespace-nowrap hidden sm:block">
              Public registry intelligence
            </p>
          </div>

          {/* Reachable / Contactable — PRIMARY metric */}
          <Link
            href="/profiles?contactable=1"
            aria-label={`${(s.contactableCount ?? 0).toLocaleString()} contactable profiles — click to browse`}
            className="flex flex-col px-4 py-3 shrink-0 hover:bg-primary/5 transition-colors group"
            data-testid="header-stat-contactable"
          >
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <Mail className="w-2.5 h-2.5" aria-hidden="true" />
              Reachable
            </span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums leading-tight">
              {(s.contactableCount ?? 0).toLocaleString()}
            </span>
          </Link>

          {/* Active research */}
          <div
            className="flex flex-col px-4 py-3 shrink-0"
            data-testid="header-stat-sessions"
          >
            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1">
              <BookOpen className="w-2.5 h-2.5" aria-hidden="true" />
              Sessions
            </span>
            <span className="text-xl font-bold text-blue-400 tabular-nums leading-tight">
              {(s.activeResearchSessions ?? 0).toLocaleString()}
            </span>
          </div>

          {/* Total profiles */}
          <div
            className="flex flex-col px-4 py-3 shrink-0"
            data-testid="header-stat-profiles"
          >
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Database className="w-2.5 h-2.5" aria-hidden="true" />
              Profiles
            </span>
            <span className="text-xl font-bold text-foreground tabular-nums leading-tight">
              {(s.totalEntities ?? 0).toLocaleString()}
            </span>
          </div>

          {/* Coverage — hidden on smallest mobile */}
          <div
            className="flex-col px-4 py-3 shrink-0 hidden sm:flex"
            data-testid="header-stat-coverage"
          >
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" aria-hidden="true" />
              Coverage
            </span>
            <span className="text-xl font-bold text-cyan-400 tabular-nums leading-tight">
              {(s.enrichmentCoverage ?? 0).toFixed(0)}%
            </span>
          </div>

          {/* Spacer + compliance badge */}
          <div className="flex items-center gap-1.5 px-4 py-3 ml-auto shrink-0 hidden md:flex">
            <ShieldCheck className="w-3 h-3 text-muted-foreground/40" aria-hidden="true" />
            <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest whitespace-nowrap">
              Public registry data only
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Contact evidence chips ────────────────────────────────────────────────────

function ContactChips({ lead }: { lead: any }) {
  const hasEmail = Boolean(lead.email || lead.contactEmail);
  const hasPhone = Boolean(lead.phone || lead.contactPhone);
  const hasLinkedin = Boolean(lead.linkedinUrl);
  const hasSession = Boolean(lead.hasResearchSession);
  const score = lead.accessScore ?? 0;

  const none = !hasEmail && !hasPhone && !hasLinkedin && !hasSession && score < 0.3;

  return (
    <div className="flex items-center gap-1.5 flex-wrap" aria-label="Contact evidence">
      {hasEmail && (
        <span
          className="flex items-center gap-0.5 text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[9px] font-mono"
          title="Email evidence in registry"
        >
          <Mail className="w-2.5 h-2.5" aria-hidden="true" />
          EMAIL
        </span>
      )}
      {hasPhone && (
        <span
          className="flex items-center gap-0.5 text-cyan-400 border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 rounded text-[9px] font-mono"
          title="Phone evidence in registry"
        >
          <Phone className="w-2.5 h-2.5" aria-hidden="true" />
          PHONE
        </span>
      )}
      {hasLinkedin && (
        <span
          className="flex items-center gap-0.5 text-blue-400 border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 rounded text-[9px] font-mono"
          title="LinkedIn profile found"
        >
          <Network className="w-2.5 h-2.5" aria-hidden="true" />
          NETWORK
        </span>
      )}
      {hasSession && (
        <span
          className="flex items-center gap-0.5 text-violet-400 border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 rounded text-[9px] font-mono"
          title="Active research session exists"
        >
          <BookOpen className="w-2.5 h-2.5" aria-hidden="true" />
          SESSION
        </span>
      )}
      {none && (
        <span
          className="flex items-center gap-0.5 text-muted-foreground border border-border bg-muted/30 px-1.5 py-0.5 rounded text-[9px] font-mono"
          title="No direct contact evidence found in public registries"
        >
          Registry trace only
        </span>
      )}
    </div>
  );
}

// ── Contact queue card ────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: any }) {
  const [, navigate] = useLocation();

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Profile: ${formatEntityName(lead.entityName)}`}
      data-testid={`card-lead-${lead.entityId}`}
      onClick={() => navigate(`/profile/${lead.entityId}`)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/profile/${lead.entityId}`)}
      className="p-4 hover:bg-muted/20 transition-colors group border-b border-border last:border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      {/* Name row */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1">
            {formatEntityName(lead.entityName)}
            <ChevronRight
              className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
              aria-hidden="true"
            />
          </h3>
          {/* Type / nationality */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded border text-[9px] uppercase font-mono whitespace-nowrap",
                getTypeBadgeStyles(lead.entityType),
              )}
            >
              {lead.entityType}
            </span>
            {lead.nationality && (
              <span className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] uppercase font-mono text-muted-foreground whitespace-nowrap">
                {lead.nationality}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <AccessScoreBadge score={lead.accessScore} />
        </div>
      </div>

      {/* Contact evidence */}
      <ContactChips lead={lead} />

      {/* Why ranked */}
      <p className="mt-2 text-[10px] font-mono text-muted-foreground/80 line-clamp-2" aria-label="Why ranked">
        <span className="text-primary/70 mr-1">WHY:</span>
        {buildWhyRanked(lead)}
      </p>

      {/* Supporting context */}
      <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
        {lead.estimatedNetWorth != null && (
          <span>
            Net worth:{" "}
            <span className="text-foreground/80">{formatCurrency(lead.estimatedNetWorth)}</span>
          </span>
        )}
        {(lead.assetCount ?? 0) > 0 && (
          <span>
            Assets: <span className="text-foreground/80">{lead.assetCount}</span>
          </span>
        )}
      </div>

      {/* Actions */}
      <div
        className="mt-3 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        role="group"
        aria-label="Profile actions"
      >
        <Link
          href={`/profile/${lead.entityId}`}
          data-testid={`link-profile-${lead.entityId}`}
          aria-label={`Open profile for ${formatEntityName(lead.entityName)}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <BookOpen className="w-2.5 h-2.5" aria-hidden="true" />
          Profile
        </Link>
        <Link
          href={`/network?entity=${lead.entityId}`}
          data-testid={`link-network-${lead.entityId}`}
          aria-label={`Open network map for ${formatEntityName(lead.entityName)}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-blue-400 hover:border-blue-400/40 hover:bg-blue-400/5 transition-colors"
        >
          <Network className="w-2.5 h-2.5" aria-hidden="true" />
          Network
        </Link>
      </div>
    </article>
  );
}

// ── Lead queue skeleton ───────────────────────────────────────────────────────

function LeadSkeleton() {
  return (
    <div className="p-4 border-b border-border" aria-hidden="true">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 mr-3 space-y-2">
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-5 w-12 bg-muted animate-pulse rounded shrink-0" />
      </div>
      <div className="h-3 w-1/2 bg-muted animate-pulse rounded mb-2" />
      <div className="h-8 w-full bg-muted animate-pulse rounded" />
    </div>
  );
}

// ── Best Next Contacts queue ──────────────────────────────────────────────────

function ContactQueue({ className }: { className?: string }) {
  const { data: hotLeads, isLoading, isError } = useGetHotLeads({ limit: 10 });
  const leads = hotLeads as any[] | undefined;

  return (
    <section
      aria-label="Best next contacts"
      className={cn("flex flex-col overflow-hidden", className)}
      data-testid="contact-queue"
    >
      {/* Queue header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">
            Best Next Contacts
          </h2>
          <span className="text-[9px] font-mono text-muted-foreground/60 hidden sm:inline">
            ranked by access score
          </span>
        </div>
        <Link
          href="/profiles"
          aria-label="Browse all profiles"
          className="text-[10px] font-mono text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5 whitespace-nowrap"
          data-testid="link-all-profiles"
        >
          All profiles <ChevronRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border" role="list" aria-label="Contact queue">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <LeadSkeleton key={i} />)
          : isError
          ? <DataUnavailable />
          : leads && leads.length > 0
          ? leads.map((lead: any) => <LeadCard key={lead.entityId} lead={lead} />)
          : (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[180px]">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-sm font-mono text-muted-foreground">No contacts in queue</p>
              <p className="text-xs font-mono text-muted-foreground/50 mt-1">
                Ingest profiles to populate this list
              </p>
              <Link
                href="/jobs"
                aria-label="Go to search tasks"
                className="mt-4 text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
              >
                Go to search tasks <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          )}
      </div>
    </section>
  );
}

// ── Global context (compact map/wealth placeholder) ──────────────────────────

function GlobalContextSection({ className }: { className?: string }) {
  const { data: stats } = useGetDashboardStats();
  const s = stats as any;

  const tiers = s?.wealthTiers;
  const total = tiers
    ? tiers.ultraHnw + tiers.veryHnw + tiers.hnw + tiers.unknown
    : 0;
  const pct = (n: number) =>
    total > 0 ? Math.max((n / total) * 100, n > 0 ? 1 : 0) : 0;

  return (
    <section
      aria-label="Global context"
      className={cn("border-t border-border pt-3 pb-4 px-4", className)}
      data-testid="global-context"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Global context
          </h3>
        </div>
        <Link
          href="/network"
          aria-label="Open asset map"
          data-testid="link-open-asset-map"
          className="text-[10px] font-mono text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5 whitespace-nowrap"
        >
          <MapPin className="w-3 h-3" aria-hidden="true" />
          Open asset map
        </Link>
      </div>

      {tiers && total > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap shrink-0">
              Wealth tiers
            </span>
            <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px" role="img" aria-label="Wealth tier distribution">
              {[
                { val: tiers.ultraHnw, cls: "bg-violet-500" },
                { val: tiers.veryHnw, cls: "bg-primary" },
                { val: tiers.hnw, cls: "bg-amber-500" },
                { val: tiers.unknown, cls: "bg-muted/60" },
              ].map((seg, i) => (
                <div
                  key={i}
                  className={cn("h-full transition-all duration-700", seg.cls)}
                  style={{ width: `${pct(seg.val)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "Ultra >$100M", val: tiers.ultraHnw, cls: "text-violet-400" },
              { label: "Very $30–100M", val: tiers.veryHnw, cls: "text-primary" },
              { label: "HNW $4–30M", val: tiers.hnw, cls: "text-amber-400" },
            ]
              .filter((t) => t.val > 0)
              .map((t) => (
                <span key={t.label} className={cn("text-[9px] font-mono whitespace-nowrap", t.cls)}>
                  {t.label.split(" ")[0]}: {t.val.toLocaleString()}
                </span>
              ))}
            {s?.totalAssets > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap ml-auto">
                {s.totalAssets.toLocaleString()} assets registered
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-[10px] font-mono text-muted-foreground/50">
          No asset distribution data yet.{" "}
          <Link href="/jobs" className="text-primary/60 hover:text-primary underline">
            Start ingestion
          </Link>
        </p>
      )}
    </section>
  );
}

// ── Desktop activity rail (right column) ─────────────────────────────────────

function DesktopActivityRail() {
  return (
    <aside
      aria-label="Background activity and context"
      className="w-[300px] xl:w-[340px] shrink-0 border-l border-border bg-card/20 flex flex-col overflow-hidden"
      data-testid="desktop-activity-rail"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <Activity className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">
          Background Activity
        </h2>
      </div>

      {/* Quick navigation links */}
      <nav aria-label="Quick navigation" className="flex gap-1.5 px-3 py-2 border-b border-border flex-shrink-0">
        <Link
          href="/research"
          aria-label="Run intelligence session"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono uppercase tracking-wider border border-border rounded hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors text-muted-foreground"
        >
          <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          Research
        </Link>
        <Link
          href="/profiles"
          aria-label="Browse all profiles"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono uppercase tracking-wider border border-border rounded hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors text-muted-foreground"
        >
          <Users className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          Profiles
        </Link>
        <Link
          href="/network"
          aria-label="Open network map"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono uppercase tracking-wider border border-border rounded hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors text-muted-foreground"
        >
          <Network className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          Network
        </Link>
      </nav>

      {/* Live activity */}
      <div className="flex-1 overflow-y-auto">
        <BackgroundActivityRail className="py-1" />
        <GlobalContextSection />
      </div>

      {/* Compliance footer */}
      <div className="px-4 py-2 border-t border-border flex-shrink-0">
        <p className="text-[9px] font-mono text-muted-foreground/40 flex items-center gap-1.5">
          <ShieldCheck className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          Public registry sources only · Source attribution on every record
        </p>
      </div>
    </aside>
  );
}

// ── Mobile swipeable activity feed ────────────────────────────────────────────

function MobileActivityFeed() {
  const { data: stats, isError: statsError } = useGetDashboardStats();
  const s = stats as any;

  return (
    <div
      className="overflow-x-auto flex gap-3 px-4 py-3 border-b border-border scroll-smooth snap-x snap-mandatory"
      aria-label="Background activity feed"
      data-testid="mobile-activity-feed"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Activity card */}
      <div className="w-72 shrink-0 snap-start rounded-lg border border-border bg-card/60 p-3 flex flex-col gap-2">
        <BackgroundActivityRail className="gap-1.5" />
      </div>

      {/* Stats snapshot card */}
      {s && !statsError && (
        <div className="w-56 shrink-0 snap-start rounded-lg border border-border bg-card/60 p-3 flex flex-col gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Database className="w-2.5 h-2.5" aria-hidden="true" />
            Snapshot
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-mono text-muted-foreground">Profiles</p>
              <p className="text-base font-bold text-foreground tabular-nums">
                {(s.totalEntities ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-emerald-400">Reachable</p>
              <p className="text-base font-bold text-emerald-400 tabular-nums">
                {(s.contactableCount ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-blue-400">Sessions</p>
              <p className="text-base font-bold text-blue-400 tabular-nums">
                {(s.activeResearchSessions ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-muted-foreground">Coverage</p>
              <p className="text-base font-bold text-cyan-400 tabular-nums">
                {(s.enrichmentCoverage ?? 0).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
      {statsError && (
        <div className="w-56 shrink-0 snap-start rounded-lg border border-border bg-card/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            Snapshot
          </span>
          <DataUnavailable compact />
        </div>
      )}

      {/* Global context card */}
      <div className="w-64 shrink-0 snap-start rounded-lg border border-border bg-card/60 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" aria-hidden="true" />
            Global context
          </span>
          <Link href="/network" aria-label="Open asset map" className="text-[9px] font-mono text-primary/60 hover:text-primary flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" aria-hidden="true" />
            Map
          </Link>
        </div>
        {s?.totalAssets > 0 ? (
          <p className="text-xs font-mono text-muted-foreground">
            <span className="text-foreground font-bold">{s.totalAssets.toLocaleString()}</span> assets across public registries.
            Tap &ldquo;Map&rdquo; to explore geospatially.
          </p>
        ) : (
          <p className="text-xs font-mono text-muted-foreground/50">No asset data yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Mobile lead card ──────────────────────────────────────────────────────────

function MobileLeadCard({ lead }: { lead: any }) {
  const typeColors: Record<string, string> = {
    HNWI: "text-emerald-400", Corporation: "text-blue-400",
    Trust: "text-purple-400", Gatekeeper: "text-amber-400",
  };
  const typeDot: Record<string, string> = {
    HNWI: "bg-emerald-400", Corporation: "bg-blue-400",
    Trust: "bg-purple-400", Gatekeeper: "bg-amber-400",
  };
  const score = lead.accessScore ?? 0;
  const scoreLabel = score >= 0.8 ? "A" : score >= 0.65 ? "B" : score >= 0.5 ? "C" : "D";
  const wealthDots = Math.round((lead.bayesianScore ?? 0) * 5);

  const hasEmail    = !!(lead.contactEmail || lead.email);
  const hasPhone    = !!(lead.contactPhone || lead.phone);
  const hasLinkedin = !!lead.linkedinUrl;

  return (
    <div className="bg-card border border-border rounded-sm p-4 flex flex-col gap-3">
      {/* Row 1: name + access */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[16px] text-foreground leading-tight">
          {formatEntityName(lead.name)}
        </h3>
        <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono
                        bg-primary/10 text-primary border border-primary/20">
          {scoreLabel} {score.toFixed(2)}
        </div>
      </div>
      {/* Row 2: type + wealth */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full shrink-0", typeDot[lead.type] ?? "bg-muted-foreground")} />
          <span className={cn("text-[11px] font-mono", typeColors[lead.type] ?? "text-muted-foreground")}>
            {lead.type}
          </span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("w-2 h-2 rounded-full",
              i < wealthDots ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>
      {/* Row 3: contact chips */}
      {(hasEmail || hasPhone || hasLinkedin) && (
        <div className="flex gap-1.5 flex-wrap">
          {hasEmail    && <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"><Mail className="w-3 h-3" />Email</span>}
          {hasLinkedin && <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"><Network className="w-3 h-3" />LinkedIn</span>}
          {hasPhone    && <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><Phone className="w-3 h-3" />Phone</span>}
        </div>
      )}
      {/* Row 4: reason + arrow */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground italic truncate">{buildWhyRanked(lead)}</p>
        <Link href={`/profile/${lead.id}`}
              className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Mobile contact view ────────────────────────────────────────────────────────

function MobileContactView() {
  const { data: stats } = useGetDashboardStats();
  const s = stats as any;
  const { data: hotLeads, isLoading, isError } = useGetHotLeads({ limit: 10 });
  const leads = (hotLeads as any[]) ?? [];

  // Job polling (reuse existing pattern)
  const [jobs, setJobs] = useState<any[]>([]);
  const poll = useCallback(() => {
    fetch("/api/ingest/jobs")
      .then(r => r.json())
      .then(d => {
        const running = (d.jobs ?? []).filter((j: any) => j.status === "running" || j.status === "queued");
        setJobs(running.slice(0, 3));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Activity strip */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-border bg-card/50 shrink-0"
             style={{ scrollbarWidth: "none" }}>
          {jobs.map((job, i) => (
            <div key={i}
                 className="shrink-0 flex items-center gap-2 h-7 bg-card border border-border rounded px-2.5 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                   style={{ width: `${job.progress ?? 0}%` }} />
              <span className="text-[11px] font-mono text-foreground relative z-10">
                {job.label} <span className="text-muted-foreground mx-1">·</span>
                <span className="text-primary">{Math.round(job.progress ?? 0)}%</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Best Next Contacts</h2>
        <Link href="/profiles?hot=1" className="text-[13px] text-primary flex items-center gap-0.5">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Contact cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {isError && <DataUnavailable />}
        {!isLoading && !isError && leads.length === 0 && <EmptyState />}
        {leads.map((lead: any) => (
          <MobileLeadCard key={lead.id} lead={lead} />
        ))}
      </div>

      {/* Stats strip */}
      {s && (
        <div className="shrink-0 grid grid-cols-4 border-t border-border bg-card">
          {[
            { val: s.totalEntities?.toLocaleString() ?? "—", label: "Entities" },
            { val: s.totalAssets?.toLocaleString() ?? "—",   label: "Assets" },
            { val: s.hotLeads?.toLocaleString() ?? "—",      label: "Hot Leads" },
            { val: s.avgAccessScore != null ? s.avgAccessScore.toFixed(2) : "—", label: "Avg Access" },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center justify-center py-3 border-r border-border last:border-r-0">
              <span className="text-[15px] font-mono font-bold text-primary tabular-nums">{val}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const s = stats as any;
  const isEmpty = s != null && (s.totalEntities ?? 0) === 0 && !isLoadingStats;

  if (isEmpty) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <DashboardHeader />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader />

      {/* ── Desktop: two-column layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden" role="main">
        {/* Left: contact queue */}
        <ContactQueue className="flex-1 border-r border-border" />
        {/* Right: activity rail */}
        <DesktopActivityRail />
      </div>

      {/* ── Mobile: polished redesign ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden" role="main">
        <MobileContactView />
      </div>
    </div>
  );
}
