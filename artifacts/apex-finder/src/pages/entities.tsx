import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useListEntities, useCreateEntity, useDeleteEntity } from "@workspace/api-client-react";
import { entityFindingsSummary, entityEvidenceLabel, entityWorkSummary, formatCurrency, formatEntityName, AccessScoreBadge, ConfidenceBadge, NationalityCell, parseEntityRegistries } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { entityMeta, EntityTypeMark, entityMetric, ENTITY_TYPES } from "@/lib/entity-taxonomy";
import { isMockMode, MOCK_ENTITIES } from "@/lib/dev-mock-data";
import {
  Plus, Search, Trash2, Loader2, Target as TargetIcon, Globe, ChevronDown, ChevronUp, X, Loader2,
  ChevronRight, Network, Target as TargetIcon, Download, ShieldAlert,
  Filter, IdCard,
  CheckSquare, Square, Users2, CheckCheck, Database, XCircle,
  Star, EyeOff, Eye, CheckCircle2, Flame,
} from "lucide-react";
import { readApiJson } from "@/lib/api-json";
import { ContactSurface } from "@/components/contact-surface";
import { launchAtlasPipeline } from "@/lib/launch-atlas";
import { ScoreboardStrip } from "@/components/scoreboard-strip";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = "HNWI" | "Corporation" | "Trust" | "Gatekeeper";

interface AddEntityForm {
  name: string;
  type: EntityType;
  nationality: string;
  estimatedNetWorth: string;
  knownResidences: string;
  phone: string;
  email: string;
  contactMethod: string;
  notes: string;
  sourceRegistries: string;
}

interface RegistryResult {
  name: string;
  type: "Corporation" | "HNWI" | "Gatekeeper";
  nationality?: string;
  knownResidences?: string;
  sourceRegistries?: string;
  notes?: string;
  metadata?: string;
}

const EMPTY_FORM: AddEntityForm = {
  name: "", type: "HNWI", nationality: "", estimatedNetWorth: "",
  knownResidences: "", phone: "", email: "", contactMethod: "",
  notes: "", sourceRegistries: "",
};

// ─── Contact richness filter ──────────────────────────────────────────────────

type ContactRichness = null | "any" | "direct" | "verified";

const RICHNESS_TIERS: { value: Exclude<ContactRichness, null>; label: string; color: string }[] = [
  { value: "any",      label: "Has Contact", color: "#64748B" },
  { value: "direct",   label: "Direct",      color: "#3B82F6" },
  { value: "verified", label: "Verified [V]",  color: "#10B981" },
];

const CONFIDENCE_STEPS = [25, 50, 75] as const;
type ConfidenceStep = typeof CONFIDENCE_STEPS[number];

// Small per-row badge config keyed by contactOutcome value

const ORG_INBOX_RE = /^(info|sales|contact|office|support|admin|hello|team|enquiries|inquiry|inquiries|press|media|hr|jobs|careers|billing|accounts|noreply|no-reply)@/i;
function isOrgInbox(email?: string | null): boolean {
  if (!email) return false;
  return ORG_INBOX_RE.test(email.trim());
}
function ReachChip({ kind, label, href, title }: { kind: "personal" | "org" | "social"; label: string; href?: string; title?: string }) {
  const styles = kind === "personal"
    ? "text-[#d4ff8a] border-[#9CFF1A]/35 bg-[#9CFF1A]/10"
    : kind === "org"
      ? "text-[#d4ff8a] border-[#9CFF1A]/35 bg-[#9CFF1A]/10"
      : "text-stone-300 border-stone-500/35 bg-stone-500/10";
  const tag = kind === "personal" ? "Personal" : kind === "org" ? "Company" : "Social";
  const body = (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-tight", styles)} title={title}>
      <span className="shrink-0 text-[11px] uppercase tracking-wider opacity-70">{tag}</span>
      <span className="truncate">{label}</span>
    </span>
  );
  if (href) return <a href={href} className="max-w-full hover:opacity-90" onClick={(e) => e.stopPropagation()} title={title ?? label}>{body}</a>;
  return body;
}
function entityReachVectors(entity: any) {
  const out: Array<{ kind: "personal" | "org" | "social"; label: string; href?: string; title?: string }> = [];
  const contacts = Array.isArray(entity.contacts) ? entity.contacts : [];
  // Prefer API presented contacts (org routes included) — maximum public surface.
  if (contacts.length > 0) {
    for (const c of contacts.slice(0, 8)) {
      const value = String(c?.value ?? "").trim();
      if (!value) continue;
      const mark = String(c?.mark ?? "candidate");
      const vt = String(c?.vectorType ?? "").toLowerCase();
      const kind = mark === "organization" || vt === "organization" ? "org" : vt === "social" ? "social" : mark === "personal" ? "personal" : "personal";
      const href =
        vt === "phone" ? `tel:${value.replace(/[^\d+]/g, "") || value}`
        : vt === "email" ? `mailto:${value}`
        : c?.sourceUrl || (value.startsWith("http") ? value : undefined);
      out.push({
        kind: kind as "personal" | "org" | "social",
        label: value,
        href,
        title: `${c?.label || mark} · ${c?.source || ""}`.trim(),
      });
    }
    return out;
  }
  // Floor contract: UI fallback respects contactOutcome —
  // outcome === "direct_contact_verified" → personal; else candidate until verified.
  const outcome = String(entity.contactOutcome ?? "");
  const verified = outcome === "direct_contact_verified";
  if (entity.email) {
    const org = isOrgInbox(entity.email) || outcome === "organization_contact";
    const scope = org ? "org" : verified ? "personal" : "candidate";
    out.push({
      kind: org ? "org" : "personal",
      label: entity.email,
      href: `mailto:${entity.email}`,
      title: org ? `REACH · org — ${entity.email}` : `REACH · ${scope} — ${entity.email}`,
    });
  }
  if (entity.phone) {
    const scope = verified ? "personal" : "candidate";
    const src = entity.phoneSource ? ` · ${entity.phoneSource}` : "";
    // Org-marked phone sources must not show as personal chips
    const orgPhone = /org|registry|company|ir/i.test(String(entity.phoneSource ?? "")) || outcome === "organization_contact";
    out.push({
      kind: orgPhone ? "org" : "personal",
      label: `${entity.phone}${src}`,
      href: `tel:${entity.phone}`,
      title: `REACH · ${orgPhone ? "org" : scope} — ${entity.phone}${src}`,
    });
  }
  if (entity.linkedinUrl) out.push({ kind: "social", label: "LinkedIn", href: entity.linkedinUrl, title: entity.linkedinUrl });
  if (entity.twitterHandle) {
    const h = String(entity.twitterHandle).replace(/^@/, "");
    out.push({ kind: "social", label: `@${h}`, href: `https://x.com/${h}`, title: `X @${h}` });
  }
  return out;
}


const OUTCOME_BADGES: Record<string, { label: string; color: string }> = {
  direct_contact_verified:  { label: "[V] verified",  color: "#10B981" },
  direct_contact_candidate: { label: "direct",       color: "#3B82F6" },
  organization_contact:     { label: "org",           color: "#8B5CF6" },
  social_only:              { label: "social",        color: "#64748B" },
  evidence_only:            { label: "evidence",      color: "#374151" },
};

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportToCsv(entities: any[]) {
  const cols = [
    "id","name","type","nationality","bayesianScore","estimatedNetWorth",
    "knownResidences","contactMethod","isHot","notes","sourceRegistries","createdAt",
  ];
  const rows = [
    cols.join(","),
    ...entities.map((e) =>
      cols.map((c) => {
        const v = e[c];
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(",")
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apex-entities-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Re-run Research button ───────────────────────────────────────────────────

function RerunButton({ entityId }: { entityId: number }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const baseUrl = (import.meta as any).env.BASE_URL?.replace(/\/$/, "") ?? "";

  const handleRerun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === "running") return;
    setState("running");
    try {
      const r = await fetch(`${baseUrl}/api/ingest/web-osint-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds: [entityId], batchSize: 1, force: true }),
      });
      if (!r.ok) throw new Error("failed");
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const icon = state === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
    : state === "done" ? <CheckCheck className="w-3.5 h-3.5" />
    : state === "error" ? <XCircle className="w-3.5 h-3.5" />
    : <TargetIcon className="w-3.5 h-3.5" />;
  const label = state === "running" ? "Running" : state === "done" ? "Done" : state === "error" ? "Failed" : "Re-run";
  const cls = state === "done"
    ? "bg-[#9CFF1A]/10 border-[#9CFF1A]/30 text-[#b8ff4d]"
    : state === "error"
    ? "bg-red-500/10 border-red-500/30 text-red-400"
    : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20";

  return (
    <button
      onClick={handleRerun}
      disabled={state === "running"}
      className={cn("flex flex-col items-center justify-center gap-1.5 py-2 border rounded transition-colors disabled:opacity-60", cls)}
    >
      {icon}
      <span className="text-[11px] font-mono uppercase">{label}</span>
    </button>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileEntityCard({
  entity, selected, onToggleSelect, isExpanded, onToggleExpand, onToggleStar, onToggleHide, onDelete,
}: {
  entity: any; selected: boolean; isExpanded: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onToggleExpand: () => void;
  onToggleStar: (entity: any) => void;
  onToggleHide: (entity: any) => void;
  onDelete: (id: number) => void;
}) {
  const typeColor = entityMeta(entity.type).color;
  const registries = parseEntityRegistries(entity.sourceRegistries);
  const workSummary = entityWorkSummary(entity);
  const findingsSummary = entityFindingsSummary(entity);
  const organizationLike = entity.type === "Corporation" || entity.type === "Corp" || entity.type === "Trust";
  const hasPublicVector = Boolean(entity.email || entity.phone || entity.linkedinUrl || entity.twitterHandle || entity.instagramHandle || entity.telegramHandle || (Array.isArray(entity.contacts) && entity.contacts.length > 0));
  const contactState = organizationLike
    ? entity.contactOutcome === "organization_contact"
      ? "Organization route"
      : hasPublicVector
        ? "Public vector — review"
        : "No public route"
    : entity.contactOutcome === "direct_contact_verified"
      ? "Verified direct"
      : entity.contactOutcome === "direct_contact_candidate"
        ? "Direct candidate"
        : entity.contactOutcome === "social_only"
          ? "Social only"
          : hasPublicVector
            ? "Public vector — review"
            : "No public route";

  return (
      <div className={cn("border-b border-[#9CFF1A]/12 bg-card transition-colors hover:bg-card/80", selected && "bg-primary/5")}>
      <div
        onClick={onToggleExpand}
        className="flex items-start gap-3 px-3 py-3.5 cursor-pointer"
      >
        <button onClick={onToggleSelect} className="shrink-0 mt-0.5" aria-label={selected ? "Deselect" : "Select"}>
          {selected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[15px] leading-snug text-foreground break-words">
                {formatEntityName(entity.name)}
              </div>
              {entity.linkedinHeadline && (
                <div className="mt-0.5 text-[11px] text-stone-400 font-mono line-clamp-1" title={entity.linkedinHeadline}>
                  {entity.linkedinHeadline}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              {entity.cookedAt && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9CFF1A]" aria-label="Fully enriched" />
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          {workSummary && workSummary !== entity.linkedinHeadline && (
          <div className="text-[11px] leading-4 text-muted-foreground line-clamp-2">
            {workSummary}
          </div>
          )}
          {!workSummary && !entity.linkedinHeadline && (
          <div className="text-[11px] leading-4 text-muted-foreground line-clamp-2">
            No documented role or activity recorded
          </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-mono font-bold"
              style={{ color: typeColor, backgroundColor: typeColor + "18" }}
            >
              <EntityTypeMark type={entity.type} compact />
            </span>
            {organizationLike ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wide",
                  entity.contactOutcome === "organization_contact"
                    ? "text-[#d4ff8a] border-[#9CFF1A]/30 bg-[#9CFF1A]/10"
                    : "text-muted-foreground border-[#9CFF1A]/12 bg-muted/30",
                )}
                title={entity.contactOutcome === "organization_contact"
                  ? "Organization contact route — not a personal access route"
                  : "No validated personal access route is recorded for this organization"}
              >
                {contactState}
              </span>
            ) : (
              <>
                <ConfidenceBadge score={entity.contactConfidence} />
                <AccessScoreBadge score={entity.accessScore} />
              </>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 fade-in duration-200">
           <div className="mb-4 grid gap-2">
             <div className="rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-primary/75">What they do</div>
                <p className="mt-1 text-xs leading-5 text-foreground/80">{workSummary ?? "No documented role or activity is recorded yet."}</p>
             </div>
             <div className="rounded-lg border border-secondary/15 bg-secondary/[0.035] px-3 py-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-secondary/80">What we found</div>
                <p className="mt-1 text-xs leading-5 text-foreground/80">{findingsSummary}</p>
             </div>
           </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Nationality</div>
              <div className="text-xs"><NationalityCell nationality={entity.nationality} /></div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">{entityMeta(entity.type).metricLabel}</div>
              <div className="text-xs text-foreground font-mono">{entity.type === "HNWI" && entity.estimatedNetWorth ? formatCurrency(entity.estimatedNetWorth) : entityMetric(entity)}</div>
            </div>
          </div>
          
          <div className="mb-3">
             <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">
               Public routes
             </div>
            <ContactSurface
              contacts={(entity as { contacts?: unknown[] }).contacts as never}
              phone={entity.phone}
              email={entity.email}
              linkedinUrl={entity.linkedinUrl}
              phoneSource={entity.phoneSource}
              density="mobile"
            />
            {entity.contactOutcome && OUTCOME_BADGES[entity.contactOutcome] && (
              <span
                className="inline-block text-[11px] font-mono px-1.5 py-0.5 rounded mt-0.5"
                style={{
                  color: OUTCOME_BADGES[entity.contactOutcome].color,
                  background: OUTCOME_BADGES[entity.contactOutcome].color + "18",
                }}
              >
                {OUTCOME_BADGES[entity.contactOutcome].label}
              </span>
            )}
          </div>

          {registries.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Source Registries</div>
              <div className="flex flex-wrap gap-1">
                {registries.map((r) => (
                  <span key={r} className="text-[11px] font-mono px-1.5 py-0.5 bg-muted border border-[#9CFF1A]/12 rounded text-muted-foreground">{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <Link
              href={`/profile/${entity.id}`}
              className="flex flex-col items-center justify-center gap-1.5 py-2 bg-muted border border-[#9CFF1A]/12 rounded text-muted-foreground hover:text-primary transition-colors"
            >
              <IdCard className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono uppercase">Profile</span>
            </Link>
            <Link
              href={`/network?entity=${entity.id}`}
              className="flex flex-col items-center justify-center gap-1.5 py-2 bg-muted border border-[#9CFF1A]/12 rounded text-muted-foreground hover:text-primary transition-colors"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono uppercase">Network</span>
            </Link>
            <RerunButton entityId={entity.id} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entity.id);
              }}
              className="atlas-pressable flex flex-col items-center justify-center gap-1.5 rounded border border-rose-400/35 bg-rose-500/10 py-2 text-rose-200 hover:bg-rose-500/20 transition-colors"
              aria-label={`Delete ${formatEntityName(entity.name)} from ledger`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-mono uppercase">Delete</span>
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleStar(entity); }}
              className="atlas-pressable flex flex-1 items-center justify-center gap-1.5 rounded border border-[#9CFF1A]/15 py-2 font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-[#d4ff8a]"
            >
              <Star className={cn("h-3.5 w-3.5", entity.isStarred && "fill-[#9CFF1A] text-[#9CFF1A]")} />
              {entity.isStarred ? "Unstar" : "Star"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleHide(entity); }}
              className="atlas-pressable flex flex-1 items-center justify-center gap-1.5 rounded border border-[#9CFF1A]/15 py-2 font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-stone-200"
            >
              {entity.isHidden ? <Eye className="h-3.5 w-3.5 text-lime-400" /> : <EyeOff className="h-3.5 w-3.5" />}
              {entity.isHidden ? "Unhide" : "Hide"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLedgerState({
  kind,
  searchTerm,
  onClearSearch,
}: {
  kind: "loading" | "unavailable" | "empty";
  searchTerm?: string;
  onClearSearch?: () => void;
}) {
  if (kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
        <p className="text-xs font-mono uppercase tracking-wider">Loading profiles</p>
      </div>
    );
  }

  if (kind === "unavailable") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center text-muted-foreground">
        <XCircle className="w-7 h-7 text-[#9CFF1A]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">Profiles are temporarily unavailable</p>
          <p className="text-xs leading-relaxed mt-1.5 text-muted-foreground">
            We could not reach the database. Try again in a moment, or check background tasks.
          </p>
        </div>
        <Link href="/jobs" className="text-xs font-mono text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          View background tasks →
        </Link>
      </div>
    );
  }

  const q = (searchTerm || "").trim();
  return (
    <div className="atlas-empty mx-auto flex max-w-md flex-col items-center justify-center gap-3 px-6 py-16 text-center md:py-14" data-testid="profiles-empty">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-[#9CFF1A]/25 bg-[#9CFF1A]/10">
        <Database className="h-5 w-5 text-[#9CFF1A]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-100">
          {q ? `No profiles match “${q}”` : "Ledger is empty"}
        </p>
        <p className="mx-auto mt-1.5 max-w-[280px] text-xs leading-relaxed text-stone-400">
          {q
            ? "Try a shorter name, clear search, or open Discover across registries."
            : "Run free dig from Launch, or search Discover. Only real research lands here — no demo rows."}
        </p>
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col items-stretch gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        {q && onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="atlas-outline-btn atlas-pressable rounded-xl px-3 py-2.5 text-xs font-medium"
          >
            Clear search
          </button>
        )}
        {!q && (
          <Link
            href="/reactor"
            className="atlas-pressable inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-[#9CFF1A] to-[#5eead4] px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(156,255,26,0.25)]"
          >
            Launch Apex Atlas
          </Link>
        )}
        <Link
          href="/search"
          className="atlas-pressable inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#9CFF1A]/35 bg-[#9CFF1A]/10 px-3 py-2.5 text-xs font-semibold text-[#d4ff8a] hover:bg-[#9CFF1A]/15"
        >
          Open Discover
        </Link>
        <Link
          href="/reactor"
          className="atlas-outline-btn atlas-pressable inline-flex min-h-[40px] items-center justify-center rounded-xl px-3 py-2.5 text-xs font-medium"
        >
          Reactor
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EntityLedger() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);

  const [searchTerm, setSearchTerm] = useState(() => (urlParams.get("q") || urlParams.get("search") || "").trim());
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [hotOnly, setHotOnly] = useState(() => urlParams.get("hot") === "1");
  const [hideBillionaires, setHideBillionaires] = useState(false);
  const [contactRichness, setContactRichness] = useState<ContactRichness>(() =>
    urlParams.get("contactable") === "1" ? "any" : null
  );
  const [minConfidence, setMinConfidence] = useState<ConfidenceStep | 0>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddEntityForm>(EMPTY_FORM);

  // View mode: all (default, hides hidden), starred, hidden
  type ViewMode = "all" | "starred" | "hidden";
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // Optimistic overrides for star/hide toggles (avoids full refetch on each click)
  const [localOverrides, setLocalOverrides] = useState<Map<number, { isStarred?: boolean; isHidden?: boolean }>>(new Map());

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgePhrase, setPurgePhrase] = useState("");
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [page, setPage]           = useState(0);
  // Infinite-scroll accumulation
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [hasMore, setHasMore]         = useState(true);
  const pageRef                       = useRef(0);
  const desktopSentinelRef            = useRef<HTMLDivElement>(null);
  const mobileSentinelRef             = useRef<HTMLDivElement>(null);

  // Reset to page 0 + clear accumulated list when filters change
  useEffect(() => {
    setPage(0);
    setAllEntities([]);
    setHasMore(true);
  }, [searchTerm, typeFilter, hotOnly, contactRichness, minConfidence, viewMode]);

  // Keep ?q= in the URL so Reactor REACH deep-links and share links stay honest
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = searchTerm.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    const next = params.toString();
    const path = window.location.pathname + (next ? `?${next}` : "");
    window.history.replaceState(null, "", path);
  }, [searchTerm]);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const toggleSelectAll = (list: any[]) =>
    setSelectedIds((prev) => prev.size === list.length ? new Set() : new Set(list.map((e: any) => e.id)));

  const handleBulkExportCsv = () => {
    const sel = (entities ?? []).filter((e: any) => selectedIds.has(e.id));
    exportToCsv(sel);
  };

  const handleBulkMcts = () => {
    const first = [...selectedIds][0];
    if (first) navigate(`/research?entity=${first}`);
  };

  const [showRegistry, setShowRegistry] = useState(false);
  const [registryQuery, setRegistryQuery] = useState("");
  const [registrySource, setRegistrySource] = useState<string>("opencorporates");
  const [registryResults, setRegistryResults] = useState<RegistryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const [mobileSelectedEntity, setMobileSelectedEntity] = useState<any>(null);

  // Contact richness + confidence are server-side; hotOnly and hideBillionaires are client-side
  const isSpecialFilter = hotOnly || hideBillionaires;
  const anyContactFilter = contactRichness !== null || minConfidence > 0;

  const { data: rawEntities, isLoading: isLoadingEntities, isError: isEntitiesError, refetch } = useListEntities({
    search: searchTerm.length > 2 ? searchTerm : undefined,
    type: typeFilter ?? undefined,
    limit: isSpecialFilter ? 500 : 50,
    offset: isSpecialFilter ? 0 : page * 50,
    starred: viewMode === "starred" ? true : undefined,
    hidden: viewMode === "hidden" ? true : undefined,
    // Richness tier → server-side contactOutcome / contactable filter
    contactable: contactRichness === "any" ? true : undefined,
    contactOutcome: (contactRichness === "direct" || contactRichness === "verified")
      ? contactRichness : undefined,
    minContactConfidence: minConfidence > 0 ? minConfidence : undefined,
  } as Parameters<typeof useListEntities>[0]);
  const deleteEntity = useDeleteEntity();
  const createEntity = useCreateEntity();

  // Star/hide toggle helpers
  const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
  const handleToggleStar = async (entity: any) => {
    const newVal = !(localOverrides.get(entity.id)?.isStarred ?? entity.isStarred ?? false);
    setLocalOverrides((prev) => { const m = new Map(prev); m.set(entity.id, { ...m.get(entity.id), isStarred: newVal }); return m; });
    try {
      await fetch(`${base}/api/entities/${entity.id}/star`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: newVal }),
      });
    } catch { /* non-fatal */ }
  };
  const handleToggleHide = async (entity: any) => {
    const newVal = !(localOverrides.get(entity.id)?.isHidden ?? entity.isHidden ?? false);
    setLocalOverrides((prev) => { const m = new Map(prev); m.set(entity.id, { ...m.get(entity.id), isHidden: newVal }); return m; });
    try {
      await fetch(`${base}/api/entities/${entity.id}/hide`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: newVal }),
      });
      // If we're in default "all" view and just hid something, remove it from the list
      if (viewMode === "all" && newVal) refetch();
    } catch { /* non-fatal */ }
  };

  // Client-side filters: proximity + hot + local overrides merged in
  // ?mock=1 / ?demo=1 → empty offline scaffold (no fabricated entities)
  const entities = useMemo(() => {
    const source = isMockMode() ? MOCK_ENTITIES : (rawEntities as any[] | undefined);
    if (!source) return [];
    let list = source.map((e: any) => {
      const overrides = localOverrides.get(e.id);
      return overrides ? { ...e, ...overrides } : e;
    });
    if (hotOnly) list = list.filter((e: any) => e.isHot || (e.accessScore ?? 0) >= 0.55);
    if (hideBillionaires) {
      list = list.filter((e: any) => {
        const hasDirectContact = !!(e.email || e.phone);
        const isUltraRich = (e.estimatedNetWorth ?? 0) > 500_000_000;
        return hasDirectContact || !isUltraRich;
      });
    }
    if (viewMode === "all") list = list.filter((e: any) => !e.isHidden);
    if (viewMode === "starred") list = list.filter((e: any) => e.isStarred !== false);
    return list;
  }, [rawEntities, hotOnly, hideBillionaires, viewMode, localOverrides]);

  // Accumulate pages into allEntities (must be after rawEntities + entities + isSpecialFilter are declared)
  useEffect(() => {
    if (isMockMode()) {
      setAllEntities(entities as any[]);
      setHasMore(false);
      return;
    }
    if (isLoadingEntities || rawEntities === undefined) return;
    const pageItems = entities as any[];
    setAllEntities(prev => {
      if (page === 0) return pageItems;
      const seen = new Set(prev.map((e: any) => e.id));
      const fresh = pageItems.filter((e: any) => !seen.has(e.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    setHasMore(!isSpecialFilter && (rawEntities as any[]).length >= 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawEntities, isLoadingEntities, entities]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingEntities || !hasMore || isSpecialFilter) return;
    setPage(p => p + 1);
  }, [isLoadingEntities, hasMore, isSpecialFilter]);

  const handleDesktopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) handleLoadMore();
  };

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) handleLoadMore();
  };

  const [diggingId, setDiggingId] = useState<number | null>(null);
  const handleDigEntity = async (id: number) => {
    if (diggingId != null) return;
    setDiggingId(id);
    try {
      const launched = await launchAtlasPipeline({
        singleTargetId: id,
        discoveryFirst: false,
        researchLimit: 1,
        runResearch: true,
        researchDepth: "standard",
        targetCount: 1,
      });
      if (!launched.ok) throw new Error(launched.message || "Dig failed to start");
      // Fire-and-forget: operator can watch Reactor; refresh list shortly
      setTimeout(() => { void refetch(); setDiggingId(null); }, 8_000);
    } catch (e) {
      console.warn("dig entity failed", e);
      setDiggingId(null);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this entity from the ledger? This cannot be undone.")) {
      deleteEntity.mutate(
        { id },
        {
          onSuccess: () => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            refetch();
          },
        },
      );
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected entit${ids.length === 1 ? "y" : "ies"} from the ledger? This cannot be undone.`)) {
      return;
    }
    setBulkBusy(true);
    try {
      const r = await fetch("/api/entities/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(err.error || `Delete failed (${r.status})`);
        return;
      }
      setSelectedIds(new Set());
      refetch();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handlePurgeAll = async () => {
    if (purgePhrase.trim() !== "DELETE ALL ENTITIES") return;
    setPurgeBusy(true);
    try {
      const r = await fetch("/api/entities/purge-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE ALL ENTITIES" }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(data.error || `Purge failed (${r.status})`);
        return;
      }
      setPurgeOpen(false);
      setPurgePhrase("");
      setSelectedIds(new Set());
      refetch();
      alert(`Removed ${data.deleted ?? 0} entities from the ledger.`);
    } catch (e: any) {
      alert(e?.message || "Purge failed");
    } finally {
      setPurgeBusy(false);
    }
  };

  const openAddModal = (prefill?: Partial<AddEntityForm>) => {
    setAddForm(prefill ? { ...EMPTY_FORM, ...prefill } : EMPTY_FORM);
    setShowAddModal(true);
  };

  const handleAddEntity = () => {
    if (!addForm.name.trim()) return;
    const body: Record<string, unknown> = { name: addForm.name.trim(), type: addForm.type };
    if (addForm.nationality.trim()) body.nationality = addForm.nationality.trim();
    if (addForm.estimatedNetWorth) body.estimatedNetWorth = parseFloat(addForm.estimatedNetWorth);
    if (addForm.knownResidences.trim()) body.knownResidences = addForm.knownResidences.trim();
    if (addForm.phone.trim()) body.phone = addForm.phone.trim();
    if (addForm.email.trim()) body.email = addForm.email.trim();
    if (addForm.contactMethod.trim()) body.contactMethod = addForm.contactMethod.trim();
    if (addForm.notes.trim()) body.notes = addForm.notes.trim();
    if (addForm.sourceRegistries.trim()) {
      body.sourceRegistries = JSON.stringify(
        addForm.sourceRegistries.split(",").map((s) => s.trim()).filter(Boolean),
      );
    }
    createEntity.mutate({ data: body as any }, {
      onSuccess: () => { setShowAddModal(false); setAddForm(EMPTY_FORM); refetch(); },
    });
  };

  const handleRegistrySearch = async () => {
    if (!registryQuery.trim()) return;
    setIsSearching(true); setRegistryError(null); setRegistryResults([]); setSearchedOnce(true);
    try {
      const resp = await fetch("/api/registry-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: registryQuery.trim(), registry: registrySource, limit: 15 }),
      });
      const data = await readApiJson(resp);
      if (!resp.ok) throw new Error(data.error ?? "Registry search failed.");
      setRegistryResults(data.results ?? []);
    } catch (err: any) {
      setRegistryError(err.message ?? "Registry search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleIngestResult = (r: RegistryResult) => {
    let regsStr = "";
    try { regsStr = JSON.parse(r.sourceRegistries ?? "[]").join(", "); }
    catch { regsStr = r.sourceRegistries ?? ""; }
    openAddModal({
      name: r.name,
      type: r.type === "Corporation" ? "Corporation" : r.type === "Gatekeeper" ? "Gatekeeper" : "HNWI",
      nationality: r.nationality ?? "",
      knownResidences: r.knownResidences ?? "",
      notes: r.notes ?? "",
      sourceRegistries: regsStr,
    });
  };

  // Unified display list: hotOnly loads 500 at once (client-side), everything else accumulates via infinite scroll
  const rawDisplayEntities = isMockMode() ? entities : (isSpecialFilter ? entities : allEntities);
  // Collapse exact-name duplicates in the list (keep first / richest row). Full merge is Duplicate review.
  const displayEntities = (() => {
    const seen = new Map<string, any>();
    for (const e of rawDisplayEntities ?? []) {
      const key = `${String(e?.name ?? "").trim().toLowerCase()}|${String(e?.type ?? "")}`;
      if (!key.startsWith("|") && seen.has(key)) continue;
      if (!key.startsWith("|")) seen.set(key, e);
      else seen.set(`id:${e?.id}`, e);
    }
    return Array.from(seen.values());
  })();
  // Dev mock bypasses network loading/error states
  const showLoading = isMockMode() ? false : isLoadingEntities;
  const showError = isMockMode() ? false : isEntitiesError;
  const coldEmptyDesk =
    !showLoading &&
    !showError &&
    (displayEntities?.length ?? 0) === 0 &&
    !(searchTerm || "").trim() &&
    !hotOnly &&
    !anyContactFilter;

  // Fragment root — desktop / mobile / modals close independently (Vite-safe).
  // tip-marker: entities-ledger-fragment-shell-2026-08-25
  return (
    <>
      {/* ── Desktop ── */}
      <div className="hidden md:flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden">
        {/* Active filter banner */}
        {(hotOnly || anyContactFilter) && (
          <div className={cn(
            "flex items-center justify-between px-4 py-2 border-b text-xs font-mono flex-shrink-0",
            hotOnly ? "bg-[#9CFF1A]/10 border-[#9CFF1A]/35 text-[#d4ff8a]" : "bg-white/[0.04] border-[#2a2a2a] text-muted-foreground"
          )}>
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 shrink-0" />
              <span className="font-bold uppercase tracking-wider">
                {hotOnly ? "Hot Leads only"
                  : contactRichness === "verified"
                    ? (minConfidence > 0 ? `Verified contacts · conf ≥ ${minConfidence}` : "Verified contacts only")
                    : contactRichness === "direct"
                      ? (minConfidence > 0 ? `Direct contacts · conf ≥ ${minConfidence}` : "Direct personal contacts")
                      : contactRichness === "any"
                        ? (minConfidence > 0 ? `Has contact · conf ≥ ${minConfidence}` : "Has contact data")
                        : `Confidence ≥ ${minConfidence}`}
              </span>
              <span className="opacity-60">— {entities.length} shown</span>
            </div>
            <button
              onClick={() => { setHotOnly(false); setContactRichness(null); setMinConfidence(0); }}
              className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" /> Clear filter
            </button>
          </div>
        )}
        <div className="px-4 pt-3 flex-shrink-0 space-y-2">
          <ScoreboardStrip />
          <button
            type="button"
            data-testid="rehydrate-thin-cards"
            className="text-[10px] font-mono uppercase tracking-wider text-[#9CFF1A]/80 hover:text-[#9CFF1A] border border-[#9CFF1A]/20 rounded-lg px-2.5 py-1.5"
            onClick={async () => {
              try {
                const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
                const r = await fetch(`${base}/api/entities/rehydrate-contacts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ limit: 80 }),
                });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                await refetch();
              } catch (e) {
                console.warn("rehydrate thin cards failed", e);
              }
            }}
          >
            Rehydrate cards from evidence
          </button>
        </div>
        {/* Header toolbar */}
        <div className="flex flex-col gap-2 border-b border-[#9CFF1A]/12 bg-card/30 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Search and filter attributable people and companies</p>
            </div>
            <div className="hidden sm:block font-mono text-[10px] text-muted-foreground tabular-nums">
              Public surface · attributable first
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="flex items-center gap-2 w-full sm:flex-1 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-background/80 border border-[#9CFF1A]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:border-lime-400/40 focus-within:ring-1 focus-within:ring-lime-400/20">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden />
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search people or companies…"
              className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
              aria-label="Search entity ledger"
            />
            {searchTerm && <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear search"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>

          {/* Type filter */}
          {!coldEmptyDesk && (
          <div className="atlas-h-scroll flex items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-0.5 pr-6">
            {[null, ...ENTITY_TYPES].map((typeKey) => {
              const meta = typeKey ? entityMeta(typeKey) : null;
              const c = meta?.color ?? "#9CFF1A";
              const Icon = meta?.Icon;
              const active = typeFilter === typeKey;
              return (
                <button
                  key={typeKey ?? "all"}
                  onClick={() => setTypeFilter(typeKey)}
                  aria-pressed={active}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all"
                  style={{
                    backgroundColor: active ? (typeKey ? c : "#9CFF1A") : "#0d1219",
                    color: active ? "#0d1219" : "#a8a29e",
                    borderColor: active ? (typeKey ? c : "#9CFF1A") : "#2a2a2a",
                  }}
                >
                  {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
                  <span className="leading-none">{typeKey === "Corporation" ? "Company" : typeKey === "HNWI" ? "Person" : (typeKey ?? "All")}</span>
                </button>
              );
            })}
          </div>

          )}
          {/* View mode tabs */}
          <div className="flex items-center gap-0.5 border border-[#9CFF1A]/10 rounded-xl p-1 shrink-0 bg-card/40">
            {([
              { mode: "all",     label: "All",     icon: <Users2 className="w-3 h-3" /> },
              { mode: "starred", label: "Starred",  icon: <Star className="w-3 h-3" /> },
              { mode: "hidden",  label: "Hidden",   icon: <EyeOff className="w-3 h-3" /> },
            ] as const).map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex min-h-[32px] items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all"
                style={{
                  background: viewMode === mode ? "rgba(156,255,26,0.18)" : "rgba(12,12,12,0.9)",
                  color: viewMode === mode ? "#9CFF1A" : "#a8a29e",
                  borderRadius: "9999px",
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowRegistry(!showRegistry)}
            className={cn(
              "flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase tracking-wider transition-all sm:ml-2",
              showRegistry ? "bg-secondary/20 border-secondary text-secondary" : "border-[#9CFF1A]/12 text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe className="w-3 h-3" /> Live Intel
          </button>

          {entities && entities.length > 0 && (
            <button
              onClick={() => exportToCsv(entities)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#9CFF1A]/12 text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase tracking-wider transition-all"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}

          {!coldEmptyDesk && (
          <button
            type="button"
            onClick={() => { setPurgeOpen(true); setPurgePhrase(""); }}
            className="flex items-center gap-1.5 rounded-lg border border-rose-400/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-300/90 transition-all hover:border-rose-400/50 hover:bg-rose-500/10"
            title="Delete every entity in the ledger"
          >
            <Trash2 className="h-3 w-3" /> Clear ledger
          </button>
          )}

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#9CFF1A]/12 bg-transparent text-muted-foreground hover:bg-muted font-mono text-[10px] uppercase tracking-wider transition-colors ml-auto"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

{!coldEmptyDesk && (
        <div
          className="flex items-center gap-1.5 px-4 py-2 border-b border-[#9CFF1A]/08 bg-card/10 flex-shrink-0 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
          data-filter-band="route-quality"
        >
          {/* Contact richness + confidence + hot filter row */}
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest shrink-0">Route</span>
          {/* "All" pill — resets richness filter */}
          <button
            onClick={() => setContactRichness(null)}
            className="shrink-0 h-7 px-2.5 rounded-md text-[10px] font-mono border transition-all whitespace-nowrap"
            style={{
              background: contactRichness === null ? "rgba(100,116,139,0.2)" : "rgba(15,23,42,0.55)",
              color: contactRichness === null ? "#94A3B8" : "hsl(var(--muted-foreground))",
              borderColor: contactRichness === null ? "rgba(100,116,139,0.4)" : "hsl(var(--border))",
            }}
          >
            All
          </button>
          {RICHNESS_TIERS.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setContactRichness(contactRichness === value ? null : value)}
              className="shrink-0 h-7 px-2.5 rounded-md text-[10px] font-mono border transition-all whitespace-nowrap"
              style={{
                background: contactRichness === value ? color + "28" : "rgba(15,23,42,0.55)",
                color: contactRichness === value ? color : "hsl(var(--muted-foreground))",
                borderColor: contactRichness === value ? color + "60" : "hsl(var(--border))",
              }}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest shrink-0">Quality ≥</span>
          {CONFIDENCE_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => setMinConfidence(minConfidence === step ? 0 : step)}
              className="shrink-0 h-7 px-2.5 rounded-md text-[10px] font-mono border transition-all whitespace-nowrap"
              style={{
                background: minConfidence === step ? "rgba(245,158,11,0.2)" : "rgba(15,23,42,0.55)",
                color: minConfidence === step ? "#9CFF1A" : "hsl(var(--muted-foreground))",
                borderColor: minConfidence === step ? "rgba(245,158,11,0.4)" : "hsl(var(--border))",
              }}
            >
              {step}+
            </button>
          ))}
          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
          <button
            onClick={() => setHotOnly(!hotOnly)}
            className="inline-flex shrink-0 h-7 items-center justify-center gap-1 px-2.5 rounded-md text-[10px] font-mono border transition-all whitespace-nowrap"
            style={{
              background: hotOnly ? "rgba(245,158,11,0.22)" : "rgba(15,23,42,0.55)",
              color: hotOnly ? "#FBBF24" : "hsl(var(--muted-foreground))",
              borderColor: hotOnly ? "rgba(245,158,11,0.5)" : "hsl(var(--border))",
            }}
            aria-pressed={hotOnly}
            title="Show priority leads only"
          >
            <Flame className="w-3 h-3 shrink-0" aria-hidden />
            <span className="leading-none">Hot</span>
          </button>
          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
          <button
            onClick={() => setHideBillionaires(!hideBillionaires)}
            title="Hide ultra-wealthy ($500M+) with no direct contact (Thiel, Icahn tier — practically unreachable)"
            className="shrink-0 h-7 px-2.5 rounded-md text-[10px] font-mono border transition-all whitespace-nowrap"
            style={{
              background: hideBillionaires ? "rgba(168,85,247,0.12)" : "transparent",
              color: hideBillionaires ? "#A855F7" : "hsl(var(--muted-foreground))",
              borderColor: hideBillionaires ? "rgba(168,85,247,0.4)" : "hsl(var(--border))",
            }}
          >
            {hideBillionaires ? "[X] " : ""}No Billionaires
          </button>
        </div>
)}

        {/* Live Intel slide-over sidebar */}
        <div className={cn(
          "fixed top-0 right-0 h-full w-[min(380px,100vw)] bg-card border-l border-[#9CFF1A]/12 shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out",
          showRegistry ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#9CFF1A]/12 bg-card/80 backdrop-blur-sm flex-shrink-0">
            <span className="text-xs font-mono text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Live Registry Query
            </span>
            <button onClick={() => setShowRegistry(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              OpenCorporates · Companies House · SEC EDGAR · BRREG · ARES · BODACC
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-background border border-[#9CFF1A]/12 focus-within:border-secondary/60 transition-colors">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text" value={registryQuery} onChange={(e) => setRegistryQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegistrySearch()}
                  placeholder="Search people, companies, or filings…"
                  className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={registrySource} onChange={(e) => setRegistrySource(e.target.value as any)}
                  className="flex-1 bg-background border border-[#9CFF1A]/12 rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-secondary/60"
                >
                  <option value="opencorporates">OpenCorporates</option>
                  <option value="companies-house">Companies House UK</option>
                   <option value="sec-edgar">SEC EDGAR</option>
                   <option value="brreg">BRREG Norway</option>
                   <option value="ares-czechia">ARES Czechia</option>
                   <option value="bodacc-france">BODACC France</option>
                </select>
                <button
                  onClick={handleRegistrySearch} disabled={isSearching}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded font-mono text-xs uppercase tracking-wider hover:bg-secondary/90 disabled:opacity-50 flex items-center gap-2 flex-shrink-0 max-w-full truncate"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>
            </div>

            {registryError && (
              <div className="text-xs font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{registryError}</div>
            )}
            {registryResults.length > 0 && (
              <div className="border border-[#9CFF1A]/12 rounded overflow-hidden">
                {registryResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-[#9CFF1A]/12 last:border-b-0 hover:bg-muted/20">
                    <div>
                      <div className="text-xs font-mono font-bold text-foreground">{r.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{r.nationality} · {r.type}</div>
                    </div>
                    <button
                      onClick={() => handleIngestResult(r)}
                      className="text-[10px] font-mono text-primary hover:underline px-2 py-1 border border-primary/30 rounded flex-shrink-0 ml-2"
                    >
                      + Ingest
                    </button>
                  </div>
                ))}
              </div>
            )}
            {registryResults.length === 0 && !isSearching && !registryError && (
              <div className="flex-1 border border-[#9CFF1A]/10 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center">
                <Globe className="w-8 h-8 text-muted-foreground/20 mb-3" />
                <p className="text-xs font-mono text-muted-foreground/60 leading-relaxed">
                  Connect to global registries to instantly ingest entity data, directors, and proxy connections.
                </p>
              </div>
            )}
            {searchedOnce && !isSearching && registryResults.length === 0 && !registryError && (
              <div className="text-xs font-mono text-muted-foreground">No results found.</div>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-[#9CFF1A]/25 bg-[#9CFF1A]/5 px-4">
            <span className="font-mono text-[10px] font-bold text-[#d4ff8a]">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkExportCsv}
              className="atlas-pressable flex items-center gap-1 rounded border border-[#9CFF1A]/20 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-stone-400 hover:text-stone-100"
            >
              <Download className="h-2.5 w-2.5" /> CSV
            </button>
            <button
              onClick={handleBulkMcts}
              className="atlas-pressable flex items-center gap-1 rounded border border-[#9CFF1A]/40 bg-[#9CFF1A]/15 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-[#9CFF1A] hover:bg-[#9CFF1A]/25"
            >
              <TargetIcon className="h-2.5 w-2.5" /> Research
            </button>
            <button
              onClick={() => void handleBulkDelete()}
              disabled={bulkBusy}
              className="atlas-pressable flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/10 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-2.5 w-2.5" /> {bulkBusy ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 font-mono text-[11px] uppercase tracking-wider text-stone-500 hover:text-stone-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Entity table */}
        <div className="flex-1 overflow-auto" onScroll={handleDesktopScroll}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card/90 backdrop-blur-sm border-b border-[#9CFF1A]/12">
                <th className="px-3 py-3 w-8">
                  <button
                    onClick={() => toggleSelectAll(entities ?? [])}
                    className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    title="Select all"
                  >
                    {entities && selectedIds.size === entities.length && entities.length > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      : <Square className="w-3.5 h-3.5" />}
                  </button>
                </th>
                {["Name", "Type", "Country", "Contact quality", "Reachability", "How to reach", "Signal"].map((h) => (
                  <th key={h} className={cn(
                    "px-4 py-3 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap",
                    h === "Entity signal" ? "text-right" : "text-left"
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {displayEntities?.map((entity: any) => {
                const typeColor = entityMeta(entity.type).color;
                const isSelected = selectedIds.has(entity.id);
                return (
                  <tr key={entity.id} className={cn(
                    "group hover:bg-muted/20 transition-colors",
                    entity.isHot && "bg-[#9CFF1A]/5",
                    isSelected && "bg-primary/5 hover:bg-primary/8",
                  )}>
                    <td className="px-3 py-3 w-8">
                      <button
                        onClick={() => toggleSelect(entity.id)}
                        className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          : <Square className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {entity.isHot && <ShieldAlert className="w-3.5 h-3.5 text-[#9CFF1A] flex-shrink-0" />}
                        {entity.cookedAt && (
                          <span title={`Fully cooked — all enrichment phases complete (${new Date(entity.cookedAt).toLocaleDateString()})`}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#9CFF1A] flex-shrink-0" />
                          </span>
                        )}
                         <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground whitespace-nowrap">{formatEntityName(entity.name)}</div>
                           <div className="mt-1 max-w-[260px] truncate text-[10px] leading-4 text-muted-foreground/65" title={entityWorkSummary(entity) ?? undefined}>
                             {entityWorkSummary(entity) ?? entityFindingsSummary(entity)}
                           </div>
                          {entity.linkedinHeadline && (
                            <div className="text-[10px] text-muted-foreground/55 font-mono truncate max-w-[200px]" title={entity.linkedinHeadline}>
                              {entity.linkedinHeadline}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1.5 w-max whitespace-nowrap"
                        style={{ color: typeColor, backgroundColor: typeColor + "18" }}
                      >
                        <EntityTypeMark type={entity.type} compact />
                      </span>
                    </td>
                    <td className="px-4 py-3"><NationalityCell nationality={entity.nationality} /></td>
                    <td className="px-4 py-3">
                      {entity.type === "Corporation" || entity.type === "Corp" || entity.type === "Trust" ? (
                        <span
                          className="text-[11px] font-mono font-bold uppercase tracking-wide px-1.5 py-1 rounded border text-[#d4ff8a] border-[#9CFF1A]/30 bg-[#9CFF1A]/10 whitespace-nowrap"
                          title="Organization evidence — this is not a personal contact confidence score"
                        >
                          Org route
                        </span>
                      ) : (
                        <ConfidenceBadge score={entity.contactConfidence} />
                      )}
                    </td>
                    <td className="px-4 py-3"><AccessScoreBadge score={entity.accessScore} /></td>
                    <td className="px-4 py-3 text-xs max-w-[240px]">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const vectors = entityReachVectors(entity);
                          if (vectors.length === 0) return <span className="text-muted-foreground/40 font-mono text-[11px] italic">—</span>;
                          return vectors.map((v, i) => (
                            <ReachChip key={`${v.kind}-${v.label}-${i}`} kind={v.kind} label={v.label} href={v.href} title={v.title} />
                          ));
                        })()}
                        {entity.contactOutcome && OUTCOME_BADGES[entity.contactOutcome] && (
                          <span
                            className="text-[11px] font-mono px-1.5 py-0.5 rounded w-max"
                            style={{
                              color: OUTCOME_BADGES[entity.contactOutcome].color,
                              background: OUTCOME_BADGES[entity.contactOutcome].color + "18",
                            }}
                          >
                            {OUTCOME_BADGES[entity.contactOutcome].label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[10px] font-mono text-muted-foreground">
                      {entity.type === "HNWI" && entity.estimatedNetWorth != null
                        ? formatCurrency(entity.estimatedNetWorth)
                        : entityMetric(entity)}
                    </td>
                    <td className="px-4 py-3 pr-6 sm:pr-8 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleDigEntity(entity.id)}
                          disabled={diggingId != null}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                          title="Dig contacts (Atlas free dig)"
                          data-testid={`button-dig-entity-${entity.id}`}
                        >
                          {diggingId === entity.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <TargetIcon className="w-3.5 h-3.5" />}
                        </button>

                        <Link
                          href={`/profile/${entity.id}`}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Apex Profile Card"
                        >
                          <IdCard className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/graph?entity=${entity.id}`}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="View network"
                        >
                          <Network className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/research?entity=${entity.id}`}
                          className="p-1.5 text-muted-foreground hover:text-secondary transition-colors"
                          title="Hybrid Research"
                        >
                          <TargetIcon className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleToggleStar(entity)}
                          className="p-1.5 transition-colors"
                          title={entity.isStarred ? "Unstar" : "Star"}
                          style={{ color: entity.isStarred ? "#9CFF1A" : undefined }}
                        >
                          <Star className={cn("w-3.5 h-3.5", entity.isStarred ? "fill-[#9CFF1A] text-[#9CFF1A]" : "text-muted-foreground hover:text-[#d4ff8a]")} />
                        </button>
                        <button
                          onClick={() => handleToggleHide(entity)}
                          className="p-1.5 text-muted-foreground hover:text-lime-400 transition-colors"
                          title={entity.isHidden ? "Unhide" : "Hide from ledger"}
                        >
                          {entity.isHidden ? <Eye className="w-3.5 h-3.5 text-lime-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(entity.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!displayEntities || displayEntities.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Database className="w-8 h-8 mb-3 opacity-20" />
                      <div className="text-sm font-semibold text-foreground mb-1">
                        {searchTerm.trim() ? `No profiles match “${searchTerm.trim()}”` : "No profiles found"}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {searchTerm.trim()
                          ? "Try a shorter name, clear search, or use Search to look across public registries."
                          : "Run research from the Reactor or import from Data Sources to build the ledger."}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {searchTerm.trim() && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="rounded-lg border border-[#9CFF1A]/12 px-3 py-1.5 text-xs hover:border-primary/40"
                          >
                            Clear search
                          </button>
                        )}
                        <Link href="/search" className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
                          Open Search
                        </Link>
                        <Link href="/reactor" className="rounded-lg border border-[#9CFF1A]/12 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                          Reactor
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: count + load indicator + export */}
        <div className="border-t border-[#9CFF1A]/12 px-4 py-2 flex items-center justify-between bg-card/30 flex-shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">
            {displayEntities.length} shown
            {!isSpecialFilter && hasMore && " · scroll to load more"}
            {!isSpecialFilter && !hasMore && displayEntities.length > 0 && " · all loaded"}
            {minConfidence > 0 && ` · conf ≥ ${minConfidence}`}
            {typeFilter && ` · ${typeFilter}`}
          </span>
          <div className="flex items-center gap-3">
            {showLoading && page > 0 && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <button
              onClick={() => exportToCsv(displayEntities ?? [])}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ── Mobile ── */}
      <div className="flex md:hidden flex-col h-full overflow-hidden min-w-0">
        {/* Mobile active filter banner */}
        {(hotOnly || anyContactFilter) && (
          <div className={cn(
            "flex items-center justify-between px-3 py-2 border-b text-xs font-mono flex-shrink-0",
            hotOnly ? "bg-[#9CFF1A]/10 border-[#9CFF1A]/35 text-[#d4ff8a]" : "bg-white/[0.04] border-[#2a2a2a] text-muted-foreground"
          )}>
            <span className="font-bold uppercase tracking-wider truncate">
              {hotOnly ? "Hot Leads only"
                : contactRichness === "verified"
                  ? (minConfidence > 0 ? `Verified · conf ≥ ${minConfidence}` : "Verified contacts")
                  : contactRichness === "direct"
                    ? (minConfidence > 0 ? `Direct · conf ≥ ${minConfidence}` : "Direct contacts")
                    : contactRichness === "any"
                      ? (minConfidence > 0 ? `Has contact · conf ≥ ${minConfidence}` : "Has contact")
                      : `Confidence ≥ ${minConfidence}`} — {entities.length} shown
            </span>
            <button onClick={() => { setHotOnly(false); setContactRichness(null); setMinConfidence(0); }} className="flex items-center gap-1 ml-2 shrink-0 opacity-70">
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
        <div className="px-3 py-2 border-b border-[#9CFF1A]/12 bg-card/30 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-background border border-[#9CFF1A]/12">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search people or companies…"
              className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {searchTerm && <button onClick={() => setSearchTerm("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
        </div>
        {/* Mobile filters — hidden on cold empty desk so empty state can breathe */}
        {!(
          !showLoading &&
          !showError &&
          displayEntities.length === 0 &&
          !(searchTerm || "").trim() &&
          !hotOnly &&
          !anyContactFilter
        ) && (
        <>
        {/* Mobile view mode + filter chips */}
        <div className="flex md:hidden flex-col border-b border-[#9CFF1A]/12 bg-card/30 shrink-0">
          {/* View mode row */}
          <div className="atlas-h-scroll flex items-center gap-1.5 px-3 py-2 pr-10 border-b border-[#9CFF1A]/10 overflow-x-auto overscroll-x-contain touch-pan-x" style={{ scrollbarWidth: "thin" }}>
            {([
              { mode: "all",     label: "All",     color: "#9CFF1A" },
              { mode: "starred", label: "★ Starred", color: "#9CFF1A" },
              { mode: "hidden",  label: "◌ Hidden",  color: "#9CA3AF" },
            ] as const).map(({ mode, label, color }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="shrink-0 h-7 px-3 rounded text-[11px] font-mono border transition-colors"
                style={{
                  background: viewMode === mode ? (mode === "all" ? "#9CFF1A" : color + "22") : "transparent",
                  color: viewMode === mode ? (mode === "all" ? "#111827" : color) : "hsl(var(--muted-foreground))",
                  borderColor: viewMode === mode ? (mode === "all" ? "#9CFF1A" : color + "50") : "hsl(var(--border))",
                  fontWeight: viewMode === mode ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Type filter chips */}
          <div className="atlas-h-scroll flex items-center gap-2 px-3 py-2 pr-10 overflow-x-auto overscroll-x-contain touch-pan-x" style={{ scrollbarWidth: "thin" }}>
            {[
              { label: "All entities", value: null },
              ...ENTITY_TYPES.map((value) => ({ label: value === "Corporation" ? "Company" : value === "HNWI" ? "Person" : value, value })),
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "inline-flex shrink-0 h-8 items-center justify-center px-3 rounded-lg text-[11px] font-mono border transition-colors",
                  typeFilter === value
                    ? "bg-[#9CFF1A] text-[#111827] border-[#9CFF1A] font-semibold"
                    : "bg-[#0d1219]/80 text-muted-foreground border-[#9CFF1A]/12"
                )}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setHotOnly(!hotOnly)}
              className={cn(
                "inline-flex shrink-0 h-8 items-center justify-center gap-1 px-3 rounded-lg text-[11px] font-mono border transition-colors",
                hotOnly ? "bg-[#9CFF1A]/15 text-[#d4ff8a] border-[#9CFF1A]/40" : "bg-card text-muted-foreground border-[#9CFF1A]/12"
              )}
              aria-pressed={hotOnly}
              title="Show priority leads only"
            >
              <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="leading-none">Hot</span>
            </button>
          </div>
          {/* Contact richness + confidence chips */}
          <div className="flex items-center gap-2 px-3 pb-2 pr-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">
              Route
            </span>
            {RICHNESS_TIERS.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setContactRichness(contactRichness === value ? null : value)}
                className="shrink-0 h-7 px-2.5 rounded text-[10px] font-mono border transition-colors"
                style={{
                  background: contactRichness === value ? color + "28" : "rgba(15,23,42,0.6)",
                  color: contactRichness === value ? color : "hsl(var(--muted-foreground))",
                  borderColor: contactRichness === value ? color + "60" : "hsl(var(--border))",
                }}
              >
                {label}
              </button>
            ))}
            <div className="w-px h-4 bg-border/60 shrink-0" />
            {CONFIDENCE_STEPS.map((step) => (
              <button
                key={step}
                onClick={() => setMinConfidence(minConfidence === step ? 0 : step)}
                className="shrink-0 h-7 px-2.5 rounded text-[10px] font-mono border transition-colors"
                style={{
                  background: minConfidence === step ? "rgba(245,158,11,0.22)" : "rgba(15,23,42,0.6)",
                  color: minConfidence === step ? "#9CFF1A" : "hsl(var(--muted-foreground))",
                  borderColor: minConfidence === step ? "rgba(245,158,11,0.4)" : "hsl(var(--border))",
                }}
              >
                {step}+
              </button>
            ))}
          </div>
        </div>


        </>
        )}
        {/* Mobile bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-[#9CFF1A]/25 bg-[#9CFF1A]/5 px-3 py-2">
            <span className="flex-shrink-0 font-mono text-xs font-bold text-[#d4ff8a] max-w-full truncate">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkExportCsv}
              className="atlas-pressable flex items-center gap-1 rounded border border-[#9CFF1A]/20 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400"
            >
              <Download className="h-3 w-3" /> CSV
            </button>
            <button
              onClick={() => void handleBulkDelete()}
              disabled={bulkBusy}
              className="atlas-pressable flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-200 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> {bulkBusy ? "…" : "Delete"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 font-mono text-[10px] text-stone-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto" onScroll={handleMobileScroll}>
          {showLoading && page === 0 && <MobileLedgerState kind="loading" />}
          {!showLoading && showError && <MobileLedgerState kind="unavailable" />}
          {!showError && displayEntities.map((entity: any) => (
            <MobileEntityCard
              key={entity.id}
              entity={entity}
              selected={selectedIds.has(entity.id)}
              isExpanded={mobileSelectedEntity?.id === entity.id}
              onToggleExpand={() => setMobileSelectedEntity(mobileSelectedEntity?.id === entity.id ? null : entity)}
              onToggleSelect={(e) => { e.stopPropagation(); toggleSelect(entity.id); }}
              onToggleStar={handleToggleStar}
              onToggleHide={handleToggleHide}
              onDelete={handleDelete}
            />
          ))}
          {!showLoading && !showError && displayEntities.length === 0 && (
            <MobileLedgerState kind="empty" searchTerm={searchTerm} onClearSearch={() => setSearchTerm("")} />
          )}
          {showLoading && page > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB — skip on cold empty so empty CTAs are the focus */}
      {!(
        !showLoading &&
        !showError &&
        displayEntities.length === 0 &&
        !(searchTerm || "").trim() &&
        !hotOnly &&
        !anyContactFilter
      ) && (
      <button
        onClick={() => openAddModal()}
        className="fixed bottom-6 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-40 md:hidden"
        style={{ backgroundColor: "#9CFF1A", boxShadow: "0 0 20px rgba(156,255,26,0.4)" }}
        aria-label="Add entity"
      >
        <Plus className="w-5 h-5 text-black" />
      </button>
      )}

      {/* Add entity modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="w-full max-w-[480px] bg-card border-l border-[#9CFF1A]/12 flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
            <div className="p-5 border-b border-[#9CFF1A]/12 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-foreground">New Intelligence Target</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">Register entity in classified registry</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded bg-muted border border-[#9CFF1A]/12">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: "Full Name *", field: "name", placeholder: "e.g. James Worthington III" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type="text" value={(addForm as any)[field]} placeholder={placeholder}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-[#9CFF1A]/12 rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Classification *</label>
                <select value={addForm.type} onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value as EntityType }))}
                  className="w-full bg-background border border-[#9CFF1A]/12 rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                  <option value="HNWI">HNWI — High Net Worth Individual</option>
                  <option value="Corporation">Corporation — Company / Shell</option>
                  <option value="Trust">Trust — Offshore / Fiduciary</option>
                  <option value="Gatekeeper">Gatekeeper — Contact / Introducer</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Nationality", field: "nationality", placeholder: "e.g. British" },
                  { label: addForm.type === "HNWI" ? "Estimated wealth (USD)" : entityMeta(addForm.type).metricLabel, field: "estimatedNetWorth", placeholder: addForm.type === "HNWI" ? "e.g. 50000000" : "Optional numeric signal" },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                    <input type={field === "estimatedNetWorth" ? "number" : "text"} value={(addForm as any)[field]} placeholder={placeholder}
                      onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-background border border-[#9CFF1A]/12 rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                  </div>
                ))}
              </div>
              {[
                { label: "Known Residences", field: "knownResidences", placeholder: "London, UK / Monaco / Dubai" },
                { label: "Contact Method", field: "contactMethod", placeholder: "Personal WhatsApp / Family Office / Gatekeeper…" },
                { label: "Phone", field: "phone", placeholder: "+44 7..." },
                { label: "Email", field: "email", placeholder: "private@..." },
                { label: "Source Registries", field: "sourceRegistries", placeholder: "Companies House, OpenCorporates, FAA…" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                  <input type="text" value={(addForm as any)[field]} placeholder={placeholder}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-[#9CFF1A]/12 rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Intelligence Notes</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4} placeholder="Background, approach angles, personal context, seasonal windows…"
                  className="w-full bg-background border border-[#9CFF1A]/12 rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none" />
              </div>
            </div>

            <div className="p-5 border-t border-[#9CFF1A]/12 flex items-center justify-between flex-shrink-0 bg-muted/20">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-muted text-muted-foreground border border-[#9CFF1A]/12 rounded font-mono text-sm hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={handleAddEntity} disabled={!addForm.name.trim() || createEntity.isPending}
                className="px-5 py-2 bg-primary text-primary-foreground rounded font-mono text-sm uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {createEntity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Register Entity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge entire ledger — double confirmation */}
      {purgeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="purge-ledger-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-[#0d1219] p-5 shadow-2xl">
            <h2 id="purge-ledger-title" className="font-display text-lg font-semibold text-stone-100">
              Clear entire ledger?
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              This permanently deletes <span className="font-semibold text-stone-200">all</span> stored entities
              from the database. Profiles, contacts, and related ledger rows will be gone. This cannot be undone.
            </p>
            <p className="mt-3 font-mono text-[11px] text-stone-500">
              Type <span className="text-rose-300">DELETE ALL ENTITIES</span> to confirm.
            </p>
            <input
              type="text"
              value={purgePhrase}
              onChange={(e) => setPurgePhrase(e.target.value)}
              autoFocus
              className="mt-2 w-full rounded-xl border border-[#9CFF1A]/20 bg-[#111827] px-3 py-2.5 font-mono text-sm text-stone-100 outline-none focus:border-rose-400/50"
              placeholder="DELETE ALL ENTITIES"
              aria-label="Confirmation phrase"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setPurgeOpen(false); setPurgePhrase(""); }}
                className="atlas-outline-btn atlas-pressable min-h-[44px] rounded-xl px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgePhrase.trim() !== "DELETE ALL ENTITIES" || purgeBusy}
                onClick={() => void handlePurgeAll()}
                className="atlas-pressable min-h-[44px] rounded-xl border border-rose-400/50 bg-rose-500/20 px-4 text-xs font-bold text-rose-100 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {purgeBusy ? "Purging…" : "Delete all entities"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
