import { useGetDashboardStats, useGetHotLeads } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { isMockMode, mockDashboardStats, mockHotLeads } from "@/lib/dev-mock-data";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  Database,
  FileSearch,
  Mail,
  Network,
  Phone,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { LaunchAtlasButton } from "@/components/launch-atlas-button";
import { ScoreboardStrip } from "@/components/scoreboard-strip";
import { entityEvidenceLabel, entityFindingsSummary, entityWorkSummary, NationalityCell } from "@/lib/utils";
import { entityMeta, EntityTypeMark, entityMetric } from "@/lib/entity-taxonomy";
import { ReactorMark } from "@/components/reactor-mark";

function scorePercent(score?: number | null) {
  if (score == null || Number.isNaN(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

function compactMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "Wealth signal pending";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B estimated`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M estimated`;
  return `$${Math.round(value / 1_000)}K estimated`;
}

function dateLabel(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function initials(name?: string | null) {
  return (name ?? "Unknown")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function scoreTone(score?: number | null) {
  if ((score ?? 0) >= 0.8) return "text-primary";
  if ((score ?? 0) >= 0.6) return "text-accent";
  return "text-secondary";
}

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  testId,
  href,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  testId: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="atlas-card atlas-pressable group block p-4 transition-colors hover:border-[#9CFF1A]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/50"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground group-hover:text-[#9CFF1A]">{label}</span>
        <Icon className="atlas-stat-icon h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-[#9CFF1A]/80" />
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </Link>
  );
}

function LeadSkeleton() {
  return (
    <div className="atlas-card p-5">
      <div className="flex animate-pulse gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-muted" /><div className="h-2 w-1/3 rounded bg-muted" /></div>
      </div>
      <div className="mt-6 h-2 w-full rounded bg-muted" />
      <div className="mt-4 h-10 w-full rounded bg-muted" />
    </div>
  );
}

function leadMetadata(lead: any): Record<string, unknown> {
  if (typeof lead?.metadata !== "string") return {};
  try { const parsed: unknown = JSON.parse(lead.metadata); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}

function LeadCard({ lead, index }: { lead: any; index: number }) {
  const access = lead.accessScore ?? 0;
  const confidence = (lead.contactConfidence ?? 0) / 100;
  const contactReady = access >= 0.55;
  const workSummary = entityWorkSummary(lead);
  const findingsSummary = entityFindingsSummary(lead);
  const dossier = leadMetadata(lead);
  const reviewOnlyLead = dossier.reviewOnly === true || dossier.partialOrganizationLead === true || dossier.partialPersonLead === true;
  const verificationLevel = String(dossier.verificationLevel ?? "");
  const leadSources = Array.isArray(dossier.sourceUrls) ? dossier.sourceUrls.filter((url): url is string => typeof url === "string" && /^https:\/\//i.test(url)) : [];
  const leadLimitations = Array.isArray(dossier.limitations) ? dossier.limitations.filter((item): item is string => typeof item === "string" && item.trim()) : [];
  return (
    <Link
      href={`/profile/${lead.entityId}`}
      data-testid={`card-entity-${lead.entityId}`}
      className="atlas-card atlas-pressable group relative flex min-w-0 flex-col overflow-hidden p-3.5 sm:p-5 hover:-translate-y-0.5 focus-visible:border-[#9CFF1A]"
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[100px] bg-primary/[0.03] transition-colors group-hover:bg-primary/[0.08]" />
      <div className="relative flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
          {initials(lead.entityName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-semibold text-foreground" data-testid={`text-lead-name-${lead.entityId}`}>
            {lead.entityName || "Unnamed entity"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <EntityTypeMark type={lead.entityType} compact />
            {lead.nationality && <><span className="text-border">·</span><NationalityCell nationality={lead.nationality} /></>}
          </div>
        </div>
        {reviewOnlyLead && (
          <span data-testid={`badge-review-lead-${lead.entityId}`} className="relative rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-200">
            {verificationLevel === "search_result_lead" ? "Search lead · unverified" : "Review lead"}
          </span>
        )}
        {index < 3 && (
          <span className={`relative rounded-full border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.13em] ${
            contactReady
              ? "border-[#9CFF1A]/35 bg-[#9CFF1A]/10 text-[#d4ff8a]"
              : "border-[#9CFF1A]/12 bg-muted/60 text-muted-foreground"
          }`}>
            {contactReady ? "Reachable" : "Review"}
          </span>
        )}
      </div>

      <div className="relative mt-4 space-y-2.5">
        <div className="rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2.5">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary/75">What they do</div>
          <p className="mt-1 text-[11px] leading-5 text-foreground/80">
            {workSummary ?? "No documented role or activity is recorded yet."}
          </p>
        </div>
        <div className="flex items-start gap-2 text-[12px] leading-4 text-muted-foreground">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
          <span><span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/65">What we found · </span>{findingsSummary}</span>
        </div>
      </div>

      {reviewOnlyLead && (
        <div data-testid={`dossier-review-${lead.entityId}`} className="relative mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.045] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200/90">Evidence tier</span>
            <span className="font-mono text-[10px] text-muted-foreground">{leadSources.length} source link{leadSources.length === 1 ? "" : "s"}</span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-foreground/80">
            {verificationLevel === "search_result_lead" ? "Search-result lead; source page not yet verified." : "Review-only lead; qualification is still open."}
          </p>
          {leadSources.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{leadSources.slice(0, 3).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="max-w-full truncate rounded border border-border/70 bg-background/50 px-1.5 py-1 text-[10px] text-primary hover:bg-primary/5">{new URL(url).hostname}</a>)}</div>}
          {leadLimitations.length > 0 && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Open gaps · {leadLimitations.slice(0, 2).join(" · ")}</p>}
        </div>
      )}

      <div className="relative mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-[#9CFF1A]/10 bg-background/45 px-2.5 py-2 sm:px-3 sm:py-2.5">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Contact quality</div>
          <div className={`mt-1 font-mono text-base sm:text-lg font-bold ${scoreTone(confidence)}`} data-testid={`text-confidence-${lead.entityId}`}>{scorePercent(confidence)}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground hidden sm:block">How solid the contact evidence is</div>
        </div>
        <div className="rounded-lg border border-[#9CFF1A]/10 bg-background/45 px-2.5 py-2 sm:px-3 sm:py-2.5 transition-colors group-hover:border-primary/20">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Reachability</div>
          <div className={`mt-1 font-mono text-base sm:text-lg font-bold ${scoreTone(access)}`} data-testid={`text-access-${lead.entityId}`}>{scorePercent(access)}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground hidden sm:block">How realistically they can be reached</div>
        </div>
      </div>

      <div className="relative mt-3 sm:mt-4 flex items-center justify-between border-t border-[#9CFF1A]/10 pt-3 text-[11px] font-mono">
        <span className="text-muted-foreground">{compactMoney(lead.estimatedNetWorth)}</span>
        <span className="text-muted-foreground">{lead.assetCount ?? 0} public assets</span>
      </div>
      {lead.email && (
        <div className="relative mt-3 truncate rounded-md border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 px-2 py-1 font-mono text-[12px] text-[#d4ff8a]" title={lead.email}>
          <span className="opacity-70">Email · </span>{lead.email}
        </div>
      )}
      <div className="relative mt-3 flex items-center gap-2 text-[12px]">
        <span className={`grid h-5 w-5 place-items-center rounded-full ${
          contactReady
            ? "bg-[#9CFF1A]/10 text-[#d4ff8a] border border-[#9CFF1A]/30"
            : "bg-muted text-muted-foreground border border-[#9CFF1A]/12"
        }`}>
          {contactReady ? <ShieldCheck className="h-3 w-3" /> : <FileSearch className="h-3 w-3" />}
        </span>
        <span className={contactReady ? "font-mono text-[12px] uppercase tracking-[0.1em] text-[#d4ff8a]/90" : "font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground"}>
          {contactReady ? "Contact path found" : "Contact path incomplete"}
        </span>
        <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className="relative mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
        {entityEvidenceLabel(lead)} · {dateLabel(lead.signalDate)}
      </div>
    </Link>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
      <CircleAlert className="h-7 w-7 text-destructive" />
      <h2 className="mt-4 font-display text-lg font-semibold">The desk could not load</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">Your entities and evidence are still safe. Try the workspace again.</p>
      <button onClick={onRetry} data-testid="button-retry-dashboard" className="atlas-outline-btn atlas-pressable mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}

function EmptyLeads() {
  return (
    <div className="atlas-empty rounded-2xl border border-dashed border-[#9CFF1A]/18 bg-[#0d1219] px-6 py-14 text-center sm:py-16">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 text-[#9CFF1A]">
        <Radar className="h-5 w-5" />
      </div>
      <h2 className="mt-5 font-display text-lg font-semibold tracking-tight text-stone-100">No priority profiles yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-400">
        Launch Atlas or discover entities from public registries. Only real research results appear here — never demo data.
      </p>
      <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <Link href="/search" data-testid="link-empty-discover" className="atlas-pressable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#9CFF1A] px-4 py-2.5 text-xs font-bold text-black hover:brightness-105">
          <Search className="h-3.5 w-3.5" /> Discover entities
        </Link>
        <Link href="/reactor" data-testid="link-empty-reactor" className="atlas-outline-btn atlas-pressable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold">
          <Radar className="h-3.5 w-3.5" /> Open reactor
        </Link>
      </div>
    </div>
  );
}

function normalizeHotLeads(data: unknown): any[] {
  if (Array.isArray(data)) return data.filter(Boolean);
  if (data == null) return [];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["leads", "data", "items", "results", "hotLeads"] as const) {
      const v = o[key];
      if (Array.isArray(v)) return v.filter(Boolean);
    }
  }
  return [];
}

function normalizeResearchLeads(data: unknown): any[] {
  if (Array.isArray(data)) return data.filter(Boolean);
  if (!data || typeof data !== "object") return [];
  const leads = (data as Record<string, unknown>).leads;
  return Array.isArray(leads) ? leads.filter(Boolean) : [];
}


function SourceLeadCard({ lead, index }: { lead: any; index: number }) {
  const fetchFailed = lead.retrievalStatus === "fetch_failed";
  const observed = lead.retrievalStatus === "observed";
  const partialFetch = lead.retrievalStatus === "partial_fetch";
  const blocked = lead.retrievalStatus === "blocked_preflight";
  const hasFetchedExcerpt = (observed || partialFetch) && Boolean(lead.excerpt);
  return (
    <a
      href={lead.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`card-source-lead-${lead.caseId}-${lead.id}`}
      className="atlas-card atlas-pressable group flex min-w-0 flex-col gap-3 p-4 transition-colors hover:border-[#9CFF1A]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/50"
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-sky-300/20 bg-sky-300/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-sky-200">
          <FileSearch className="h-3 w-3" /> Search lead
        </span>
        <span className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${fetchFailed ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-200" : blocked ? "border-violet-300/20 bg-violet-300/[0.06] text-violet-200" : "border-sky-300/20 bg-sky-300/[0.06] text-sky-200"}`}>
          {observed ? "Observed source" : partialFetch ? "Partial fetch" : blocked ? "Blocked before fetch" : fetchFailed ? "Fetch failed" : "Not fetched"}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="break-all text-sm font-semibold text-foreground group-hover:text-primary">{lead.sourceDomain}</h3>
        <p className="mt-1 break-all font-mono text-xs leading-5 text-muted-foreground">{lead.sourcePath || "/"}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {observed
            ? "The page was fetched, but no structured entity claim was emitted. Review this source; do not infer a person or ownership from the URL."
            : partialFetch
              ? "Retrieval returned only partial material. Treat this excerpt as incomplete and do not infer claims not directly supported by observed text."
              : blocked
                ? "A preflight/scope/repeat guard blocked retrieval before any request was sent. This is not evidence that the source is absent; do not repeat the action unchanged."
                : fetchFailed
                  ? "Retrieval did not yield an observed source. This remains an unverified lead; the failed attempt says nothing about other search results."
                  : "Returned by a successful search, but the page has not been observed. Its contents are not evidence yet."}
        </p>
        {(observed || partialFetch) && lead.excerpt && (
          <p className="mt-2 border-l border-sky-300/25 pl-2 text-xs leading-5 text-muted-foreground" data-testid={`text-source-excerpt-${lead.caseId}-${lead.id}`}>
            {lead.excerpt}
          </p>
        )}
        {lead.searchSnippet && !hasFetchedExcerpt && (
          <div className="mt-2 border-l border-amber-300/25 pl-2 text-xs leading-5 text-muted-foreground" data-testid={`text-unverified-search-snippet-${lead.caseId}-${lead.id}`}>
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-amber-200">Unverified search snippet</span>
            {lead.searchSnippet}
          </div>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>Case {lead.caseId}</span>
        <span>Not an entity / not HNWI evidence</span>
      </div>
    </a>
  );
}

function normalizeResearchSourceLeads(data: unknown): any[] {
  if (!data || typeof data !== "object") return [];
  const sourceLeads = (data as Record<string, unknown>).sourceLeads;
  return Array.isArray(sourceLeads) ? sourceLeads.filter(Boolean) : [];
}

function ReviewLeadCard({ lead, index }: { lead: any; index: number }) {
  const sourceCount = Array.isArray(lead.sourceUrls) ? lead.sourceUrls.length : 0;
  const descriptor = lead.entityType === "PersonCandidate"
    ? "Identity/ownership lead · wealth not established"
    : "Organization lead · targetable person not yet established";
  return (
    <Link
      href={`/profile/${lead.entityId}`}
      data-testid={`card-review-lead-${lead.entityId}`}
      className="atlas-card atlas-pressable group flex min-w-0 flex-col gap-3 p-4 transition-colors hover:border-[#9CFF1A]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/50"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <EntityTypeMark type={lead.entityType} compact />
        <span className="rounded border border-amber-300/20 bg-amber-300/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200">Partial review</span>
      </div>
      <div>
        <h3 className="line-clamp-2 break-words text-sm font-semibold text-foreground group-hover:text-primary">{lead.entityName}</h3>
        <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">{lead.notes || descriptor}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>{sourceCount} fetched source{sourceCount === 1 ? "" : "s"}</span>
        <span>Not HNWI-verified</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const mock = isMockMode();
  const statsQuery = useGetDashboardStats();
  const leadsQuery = useGetHotLeads({ limit: 8 });
  const reviewLeadsQuery = useQuery({
    queryKey: ["dashboard", "research-leads"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/research-leads?limit=8", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Research leads request failed (${response.status}).`);
      return response.json() as Promise<{ leads?: unknown[]; sourceLeads?: unknown[]; activeDiscovery?: boolean }>;
    },
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
  const stats = mock ? mockDashboardStats() : statsQuery.data;
  const leads = mock ? mockHotLeads() : normalizeHotLeads(leadsQuery.data);
  const reviewLeads = mock ? [] : normalizeResearchLeads(reviewLeadsQuery.data);
  const sourceLeads = mock ? [] : normalizeResearchSourceLeads(reviewLeadsQuery.data);
  const reviewLeadsLoading = mock ? false : reviewLeadsQuery.isLoading;
  const reviewLeadsError = mock ? false : reviewLeadsQuery.isError;
  const isLoading = mock ? false : (statsQuery.isLoading || leadsQuery.isLoading);
  const hasError = mock ? false : (statsQuery.isError || leadsQuery.isError);

  return (
    <div className="atlas-page w-full min-w-0 max-w-full pb-12">
      <div className="px-0 pt-2 md:pt-4">
        <ScoreboardStrip className="mb-2" />
      </div>
      <section className="atlas-enter atlas-dashboard-hero atlas-ambient-gold relative flex flex-col gap-8 py-8 lg:flex-row lg:items-end lg:justify-between lg:py-12">
        {/* Wash only — must not mask headline or Launch */}
        <div className="atlas-ambient-wash" aria-hidden />
        <div className="atlas-dashboard-hero-copy relative z-10 max-w-2xl">
          <div className="mb-4 flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.2em] text-[#9CFF1A]">
            <span className="atlas-live-dot atlas-live-dot-pulse" aria-hidden />
            Research desk
          </div>
          <h1 className="font-display text-[clamp(2rem,4.8vw,4.25rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#fafaf9]">
            People worth<br className="hidden sm:block" /> knowing.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-stone-400 md:text-[15px]">
            Run free dig — the model chooses tools, visits sources, and builds contact routes. Only real research lands on this desk.
          </p>
        </div>
        <div className="atlas-home-actions relative z-10 flex w-full flex-col gap-2 sm:w-auto lg:w-[28rem] lg:max-w-[28rem]">
          <div className="atlas-home-primary-row">
            <LaunchAtlasButton variant="primary" className="atlas-home-launch" />
          </div>
          <div className="atlas-home-secondary-row" role="group" aria-label="Research desk shortcuts">
            <Link href="/reactor" data-testid="link-dashboard-reactor" className="atlas-outline-btn atlas-pressable inline-flex h-12 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold">
              <ReactorMark size={17} className="shrink-0" /> Reactor
            </Link>
            <Link href="/search" data-testid="link-dashboard-search" className="atlas-outline-btn atlas-pressable inline-flex h-12 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold">
              <Search className="h-4 w-4" aria-hidden="true" /> Discover
            </Link>
          </div>
        </div>
        <div className="atlas-soft-edge" aria-hidden />
      </section>

      {/* Registry-shallow risk — when no live web-search provider slots are active */}
      {!mock && (stats as { registryShallowRisk?: boolean } | undefined)?.registryShallowRisk ? (
        <div
          role="status"
          data-testid="banner-registry-shallow-risk"
          className="mt-4 flex flex-col gap-2 rounded-xl border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 px-4 py-3 text-sm text-[#fef3c7] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#d4ff8a]" />
            <p className="text-[13px] leading-5">
              <span className="font-semibold">Registry-shallow risk.</span>{" "}
              No active web-search provider slots — discovery may stay filings-only until keys are live and the API is restarted.
            </p>
          </div>
          <Link
            href="/status"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#9CFF1A]/40 bg-[#9CFF1A]/10 px-3 text-xs font-semibold text-[#fef3c7] hover:bg-[#9CFF1A]/20"
          >
            Open system status
          </Link>
        </div>
      ) : mock ? (
        <div data-testid="banner-registry-shallow-risk" className="sr-only" aria-hidden="true">
          registry shallow risk marker
        </div>
      ) : null}

      {/* Desk shortcuts — product map without burying the hero */}
      <section
        className="atlas-enter atlas-dashboard-wide grid grid-cols-2 gap-2 pb-2 pt-5 md:grid-cols-4"
        style={{ animationDelay: "40ms" }}
        data-testid="dashboard-ops-strip"
        aria-label="Desk shortcuts"
      >
        {[
          { href: "/reactor", label: "Reactor", detail: "Live research", testId: "ops-reactor", icon: ReactorMark },
          { href: "/profiles", label: "Ledger", detail: "People & companies", testId: "ops-ledger", icon: Users },
          { href: "/network", label: "Graph", detail: "Connections", testId: "ops-network", icon: Network },
          { href: "/status", label: "Status", detail: "Keys & systems", testId: "ops-status", icon: Activity },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            className="atlas-pressable group rounded-xl border border-[#9CFF1A]/14 bg-[#0d1219]/80 px-3 py-3.5 transition-colors hover:border-[#9CFF1A]/40 hover:bg-[#0d1219] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/50"
          >
            <div className="flex items-center gap-2">
              <item.icon className="h-3.5 w-3.5 text-stone-500 transition-colors group-hover:text-[#9CFF1A]" aria-hidden="true" />
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500 group-hover:text-[#9CFF1A]">{item.label}</div>
            </div>
            <div className="mt-1 text-[12px] font-medium text-stone-200">{item.detail}</div>
          </Link>
        ))}
      </section>

      <section className="atlas-enter atlas-dashboard-wide grid grid-cols-2 gap-2.5 py-6 md:grid-cols-4 md:gap-3" style={{ animationDelay: "70ms" }}>
        <StatTile href="/profiles" label="Entities" value={stats?.totalEntities ?? "—"} detail="people · companies · trusts" icon={Users} testId="stat-total-entities" />
        <StatTile href="/profiles" label="Priority" value={stats?.hotLeadsCount ?? "—"} detail="strongest contact paths" icon={Sparkles} testId="stat-hot-leads" />
        <StatTile href="/profiles" label="Assets" value={stats?.totalAssets ?? "—"} detail="linked public evidence" icon={Database} testId="stat-total-assets" />
        <StatTile href="/network" label="Links" value={stats?.totalRelationships ?? "—"} detail="known relationships" icon={Network} testId="stat-total-relationships" />
      </section>

      <section className="atlas-enter atlas-dashboard-wide pt-3" style={{ animationDelay: "140ms" }}>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="atlas-section-label flex items-center gap-2"><Sparkles className="h-3 w-3" /> Priority profiles</div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-stone-100 md:text-2xl">Strongest contact paths first</h2>
          </div>
          <Link href="/profiles" data-testid="link-view-all-leads" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">View all profiles <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
        {hasError ? <ErrorState onRetry={() => { void statsQuery.refetch(); void leadsQuery.refetch(); }} /> :
          isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <LeadSkeleton key={item} />)}</div> :
          leads.length === 0 ? <EmptyLeads /> :
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{leads.map((lead: any, index: number) => <LeadCard key={lead.entityId} lead={lead} index={index} />)}</div>}
      </section>

      <section className="atlas-enter atlas-dashboard-wide mt-10 border-t border-[#9CFF1A]/10 pt-7" style={{ animationDelay: "180ms" }} data-testid="section-research-leads">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="atlas-section-label flex items-center gap-2"><FileSearch className="h-3 w-3" /> Keep the evidence so far</div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-stone-100 md:text-2xl">Research leads in review</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Useful source-backed leads remain visible while the Investigator continues. These are not verified HNWIs or contact-ready targets.</p>
          </div>
          <Link href="/entities" data-testid="link-view-all-review-leads" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">View entity ledger <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
        {reviewLeadsError ? (
          <div className="atlas-card p-4 text-xs text-muted-foreground">
            Partial review leads could not be loaded. The entity ledger remains the canonical record.
            <button onClick={() => { void reviewLeadsQuery.refetch(); }} className="ml-2 font-semibold text-primary underline underline-offset-2">Retry</button>
          </div>
        ) : reviewLeadsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <LeadSkeleton key={item} />)}</div>
        ) : (
          <>
            {reviewLeads.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{reviewLeads.map((lead: any, index: number) => <ReviewLeadCard key={lead.entityId} lead={lead} index={index} />)}</div>
            ) : sourceLeads.length === 0 ? (
              <div className="atlas-card p-5" data-testid="empty-research-leads">
                <div className="text-sm font-semibold text-foreground">No named entity lead is source-backed yet</div>
                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">As soon as search returns URLs, Atlas keeps them visible as unverified source leads below. A person or company entity card still requires a supported name from observed source content; search snippets and guessed contacts are never promoted to facts.</p>
              </div>
            ) : (
              <div className="atlas-card px-4 py-3 text-xs leading-5 text-muted-foreground" data-testid="no-named-research-leads">No named company/person has met the source-backed lead bar yet. The discovered URLs remain visible below and can be pursued within this run.</div>
            )}
            {sourceLeads.length > 0 && (
              <div className="mt-6" data-testid="section-source-leads">
                <div className="mb-4">
                  <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">Search-result leads to pursue</h3>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">These cards are backed only by search-result URLs. A failed fetch is a retrieval limitation, not evidence against the source or the entity it may describe.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{sourceLeads.map((lead: any, index: number) => <SourceLeadCard key={lead.id} lead={lead} index={index} />)}</div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="atlas-enter atlas-dashboard-wide mt-10 grid gap-4 border-t border-[#9CFF1A]/10 pt-7 md:grid-cols-[1fr_auto]" style={{ animationDelay: "210ms" }}>
        <div>
          <div className="atlas-section-label flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> Evidence, not guesses</div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Open a profile for registries, ownership, assets, and public contact channels — then decide what deserves attention.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground md:justify-end">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#9CFF1A]/12 bg-card"><Mail className="h-3.5 w-3.5" /></span>
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#9CFF1A]/12 bg-card"><Phone className="h-3.5 w-3.5" /></span>
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#9CFF1A]/12 bg-card"><FileSearch className="h-3.5 w-3.5" /></span>
        </div>
      </section>
    </div>
  );
}