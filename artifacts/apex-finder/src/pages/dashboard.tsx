import { useGetDashboardStats, useGetHotLeads } from "@workspace/api-client-react";
import { isMockMode, mockDashboardStats, mockHotLeads } from "@/lib/dev-mock-data";
import {
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
import { entityEvidenceLabel, entityFindingsSummary, entityWorkSummary, NationalityCell } from "@/lib/utils";
import { entityMeta, EntityTypeMark, entityMetric } from "@/lib/entity-taxonomy";

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

function LeadCard({ lead, index }: { lead: any; index: number }) {
  const access = lead.accessScore ?? 0;
  const confidence = (lead.contactConfidence ?? 0) / 100;
  const contactReady = access >= 0.55;
  const workSummary = entityWorkSummary(lead);
  const findingsSummary = entityFindingsSummary(lead);
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
        {index < 3 && (
          <span className={`relative rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.13em] ${
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
          <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-primary/75">What they do</div>
          <p className="mt-1 text-[11px] leading-5 text-foreground/80">
            {workSummary ?? "No documented role or activity is recorded yet."}
          </p>
        </div>
        <div className="flex items-start gap-2 text-[12px] leading-4 text-muted-foreground">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
          <span><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground/65">What we found · </span>{findingsSummary}</span>
        </div>
      </div>

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

export default function Dashboard() {
  const mock = isMockMode();
  const statsQuery = useGetDashboardStats();
  const leadsQuery = useGetHotLeads({ limit: 8 });
  const stats = mock ? mockDashboardStats() : statsQuery.data;
  const leads = mock ? mockHotLeads() : (leadsQuery.data ?? []);
  const isLoading = mock ? false : (statsQuery.isLoading || leadsQuery.isLoading);
  const hasError = mock ? false : (statsQuery.isError || leadsQuery.isError);

  return (
    <div className="atlas-page pb-12">
      <section className="atlas-enter atlas-ambient-gold relative flex flex-col gap-8 py-8 md:flex-row md:items-end md:justify-between md:py-12">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.2em] text-[#9CFF1A]">
            <span className="atlas-live-dot atlas-live-dot-pulse" aria-hidden />
            Research desk
          </div>
          <h1 className="font-display text-[clamp(2rem,4.8vw,4.25rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#fafaf9]">
            People worth<br className="hidden sm:block" /> knowing.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-stone-400 md:text-[15px]">
            Run the public-records pipeline — discovery, attribution, contacts — then follow live work on the reactor. Only real research lands on this desk.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
          <LaunchAtlasButton variant="primary" />
          <div className="flex gap-2">
            <Link href="/reactor" data-testid="link-dashboard-reactor" className="atlas-outline-btn atlas-pressable inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold sm:flex-none sm:px-5">
              <Radar className="h-4 w-4" /> Reactor
            </Link>
            <Link href="/search" data-testid="link-dashboard-search" className="atlas-outline-btn atlas-pressable inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold sm:flex-none sm:px-5">
              <Search className="h-4 w-4" /> Discover
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
        className="atlas-enter grid grid-cols-2 gap-2 pb-2 pt-5 md:grid-cols-4"
        style={{ animationDelay: "40ms" }}
        data-testid="dashboard-ops-strip"
        aria-label="Desk shortcuts"
      >
        {[
          { href: "/reactor", label: "Reactor", detail: "Live research", testId: "ops-reactor" },
          { href: "/profiles", label: "Ledger", detail: "People & companies", testId: "ops-ledger" },
          { href: "/network", label: "Graph", detail: "Connections", testId: "ops-network" },
          { href: "/status", label: "Status", detail: "Keys & systems", testId: "ops-status" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            className="atlas-pressable group rounded-xl border border-[#9CFF1A]/14 bg-[#0d1219]/80 px-3 py-3.5 transition-colors hover:border-[#9CFF1A]/40 hover:bg-[#0d1219] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/50"
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500 group-hover:text-[#9CFF1A]">{item.label}</div>
            <div className="mt-1 text-[12px] font-medium text-stone-200">{item.detail}</div>
          </Link>
        ))}
      </section>

      <section className="atlas-enter grid grid-cols-2 gap-2.5 py-6 md:grid-cols-4 md:gap-3" style={{ animationDelay: "70ms" }}>
        <StatTile href="/profiles" label="Entities" value={stats?.totalEntities ?? "—"} detail="people · companies · trusts" icon={Users} testId="stat-total-entities" />
        <StatTile href="/profiles" label="Priority" value={stats?.hotLeadsCount ?? "—"} detail="strongest contact paths" icon={Sparkles} testId="stat-hot-leads" />
        <StatTile href="/profiles" label="Assets" value={stats?.totalAssets ?? "—"} detail="linked public evidence" icon={Database} testId="stat-total-assets" />
        <StatTile href="/network" label="Links" value={stats?.totalRelationships ?? "—"} detail="known relationships" icon={Network} testId="stat-total-relationships" />
      </section>

      <section className="atlas-enter pt-3" style={{ animationDelay: "140ms" }}>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="atlas-section-label flex items-center gap-2"><Sparkles className="h-3 w-3" /> Priority profiles</div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-stone-100 md:text-2xl">Strongest contact paths first</h2>
          </div>
          <Link href="/profiles" data-testid="link-view-all-leads" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">View all profiles <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
        {hasError ? <ErrorState onRetry={() => { void statsQuery.refetch(); void leadsQuery.refetch(); }} /> :
          isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <LeadSkeleton key={item} />)}</div> :
          leads.length === 0 ? <EmptyLeads /> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{leads.map((lead: any, index: number) => <LeadCard key={lead.entityId} lead={lead} index={index} />)}</div>}
      </section>

      <section className="atlas-enter mt-10 grid gap-4 border-t border-[#9CFF1A]/10 pt-7 md:grid-cols-[1fr_auto]" style={{ animationDelay: "210ms" }}>
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