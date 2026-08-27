import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  useGetEntity,
  useListAssets,
  useListRelationships,
  useListResearchSessions,
  useCreateRelationship,
  useDeleteRelationship,
} from "@workspace/api-client-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft,
  Network,
  Target as TargetIcon,
  KanbanSquare,
  ShieldAlert,
  MapPin,
  BarChart2,
  Loader2,
  Play,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Shield,
  GitBranch,
  Building2,
  UserCheck,
  Briefcase,
  Globe,
  AlertCircle,
  FileText,
  Layers,
  Route,
  Target,
  Plus,
  Trash2,
  Link2,
  Send,
  Twitter,
  Instagram,
  Mail,
  Phone,
  Crosshair, Flame, RefreshCw,
} from "lucide-react";
import { cn, entityFindingsSummary, entityWorkSummary, formatCurrency, formatEntityName, AccessScoreBadge, ConfidenceBadge, NationalityCell, ScoreBadge } from "@/lib/utils";
import { ContactSurface } from "@/components/contact-surface";
import { isMockMode, MOCK_ENTITIES } from "@/lib/dev-mock-data";
import { entityMeta, EntityTypeMark, entityMetric } from "@/lib/entity-taxonomy";
import { readApiJson } from "@/lib/api-json";
import { launchAtlasPipeline } from "@/lib/launch-atlas";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type PathStep = {
  vertexId: string;
  label: string;
  nodeType: string;
  role: "TARGET" | "GATEKEEPER" | "INTERMEDIARY" | "ASSET";
  contactMethod?: string;
  registry?: string;
  actionRequired?: string;
};

interface LedgerEntry {
  id: string;
  category: "Identity" | "Financial" | "Network" | "Asset" | "Registry";
  dataPoint: string;
  value: string;
  source: string;
  verified: boolean;
}

interface ConfidenceScores {
  identity: number;
  financial: number;
  network: number;
  registry: number;
  asset: number;
  overall: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, string> = {
  Aviation:     "#3B82F6",
  RealEstate:   "#10B981",
  Marine:       "#06B6D4",
  PrivateClub:  "#A855F7",
};

const CAT_COLORS: Record<string, string> = {
  Identity: "text-primary bg-primary/10",
  Financial: "text-lime-400 bg-lime-400/10",
  Network:  "text-[#9CFF1A] bg-[#9CFF1A]/10",
  Asset:    "text-secondary bg-secondary/10",
  Registry: "text-[#9CFF1A] bg-[#9CFF1A]/10",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeConfidence(entity: any, assets: any[], relationships: any[]): ConfidenceScores {
  const idFields = [entity.nationality, entity.knownResidences, entity.contactMethod, entity.phone || entity.email, entity.linkedinUrl];
  const identity = Math.round((idFields.filter(Boolean).length / idFields.length) * 100);

  const hasNW = entity.estimatedNetWorth != null;
  const assetsWithVal = assets.filter((a) => a.estimatedValue != null).length;
  const financial = Math.min(Math.round((hasNW ? 40 : 0) + Math.min(assetsWithVal * 15, 60)), 100);

  const network = Math.min(relationships.length * 12, 100);

  let srcRegs: string[] = [];
  try { srcRegs = JSON.parse(entity.sourceRegistries ?? "[]"); } catch {}
  const assetSrcs = new Set(assets.map((a) => a.sourceRegistry).filter(Boolean));
  const registry = Math.min(new Set([...srcRegs, ...assetSrcs]).size * 20, 100);

  const asset = assets.length === 0 ? 0
    : Math.round((assets.filter((a) => a.sourceRegistry).length / assets.length) * 100);

  const overall = Math.round(identity * 0.2 + financial * 0.25 + network * 0.2 + registry * 0.2 + asset * 0.15);
  return { identity, financial, network, registry, asset, overall };
}

/** Strip URL prefix from a stored social handle — returns bare handle only (no @ prefix, no URL). */
function cleanHandle(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url
    .replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com|instagram\.com|t\.me)\//, "")
    .replace(/\/$/, "")
    .replace(/^@/, "")
    .trim();
  return s && !s.startsWith("http") ? s : null;
}

/** True when the email looks like a Cloudflare-obfuscated or placeholder address — never display these. */
function isProtectedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lc = email.toLowerCase();
  return lc.includes("protected") || lc === "[email protected]" || lc.startsWith("javascript:");
}

function buildLedger(entity: any, assets: any[], relationships: any[]): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  let srcRegs: string[] = [];
  try { srcRegs = JSON.parse(entity.sourceRegistries ?? "[]"); } catch {}
  const primarySrc = srcRegs[0] ?? "Manual Entry";
  const hasRegistry = srcRegs.length > 0;

  if (entity.name)             entries.push({ id: "name",  category: "Identity",  dataPoint: "Full Name",         value: entity.name,              source: primarySrc,   verified: hasRegistry });
  if (entity.nationality)      entries.push({ id: "nat",   category: "Identity",  dataPoint: "Nationality",       value: entity.nationality,       source: primarySrc,   verified: hasRegistry });
  if (entity.knownResidences)  entries.push({ id: "res",   category: "Identity",  dataPoint: "Known Residences",  value: entity.knownResidences,   source: primarySrc,   verified: hasRegistry });
  if (entity.contactMethod)    entries.push({ id: "cm",    category: "Identity",  dataPoint: "Contact Method",    value: entity.contactMethod,     source: "Internal",   verified: false });
  if (entity.phone)            entries.push({ id: "phone", category: "Identity",  dataPoint: "Phone",             value: entity.phone,             source: "Internal",   verified: false });
  if (entity.email)            entries.push({ id: "email", category: "Identity",  dataPoint: "Email",             value: entity.email,             source: "Internal",   verified: false });
  if (entity.estimatedNetWorth != null)
    entries.push({ id: "nw", category: "Financial", dataPoint: entityMeta(entity.type).metricLabel, value: entity.type === "HNWI" ? formatCurrency(entity.estimatedNetWorth) : entityMetric(entity), source: primarySrc, verified: hasRegistry });

  for (const reg of srcRegs) {
    entries.push({ id: `reg-${reg}`, category: "Registry", dataPoint: "Registry Presence", value: reg, source: reg, verified: true });
  }
  for (const asset of assets) {
    entries.push({
      id: `asset-${asset.id}`,
      category: "Asset",
      dataPoint: asset.category,
      value: `${asset.identifier} · ${asset.jurisdiction}`,
      source: asset.sourceRegistry ?? "Unverified",
      verified: !!asset.sourceRegistry,
    });
  }
  for (const rel of relationships) {
    entries.push({
      id: `rel-${rel.id}`,
      category: "Network",
      dataPoint: rel.relationshipType,
      value: rel.targetName ?? `Entity #${rel.targetId}`,
      source: rel.notes?.substring(0, 40) ?? "Internal",
      verified: false,
    });
  }
  return entries;
}

function roleIcon(role: string) {
  if (role === "TARGET")     return <Target className="w-3 h-3 text-primary" />;
  if (role === "GATEKEEPER") return <Shield className="w-3 h-3 text-[#9CFF1A]" />;
  if (role === "ASSET")      return <GitBranch className="w-3 h-3 text-secondary" />;
  return <ChevronRight className="w-3 h-3 text-muted-foreground" />;
}

function roleStyle(role: string) {
  if (role === "TARGET")     return "border-primary/40 bg-primary/5 text-primary";
  if (role === "GATEKEEPER") return "border-[#9CFF1A]/40 bg-[#9CFF1A]/5 text-[#9CFF1A]";
  if (role === "ASSET")      return "border-secondary/30 bg-secondary/5 text-secondary";
  return "border-border bg-muted/10 text-muted-foreground";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, badge, action }: {
  icon: React.ReactNode; title: string; badge?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/60 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] font-mono font-bold text-foreground uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        {badge && <span className="text-[12px] font-mono text-muted-foreground">{badge}</span>}
        {action}
      </div>
    </div>
  );
}

function ConfidenceBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const barCls = score >= 75 ? "bg-primary" : score >= 50 ? "bg-[#9CFF1A]" : score >= 25 ? "bg-lime-600" : "bg-muted-foreground/30";
  const txtCls = score >= 75 ? "text-primary" : score >= 50 ? "text-[#9CFF1A]" : "text-muted-foreground";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">{icon} {label}</div>
        <span className={cn("text-[11px] font-mono font-bold", txtCls)}>{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", barCls)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// E1: Profile Completeness — 10-field progress indicator surfaced on every profile
function ProfileCompleteness({ entity, assets, relationships, sessions }: {
  entity: any; assets: any[]; relationships: any[]; sessions: any[];
}) {
  const metricEvidenceDone =
    entity.type === "HNWI"
      ? entity.estimatedNetWorth != null
      : entity.type === "Corporation"
        ? relationships.length >= 1 || !!entity.sourceRegistries
        : entity.type === "Trust"
          ? assets.length >= 1 || !!entity.sourceRegistries
          : !!(entity.email || entity.phone || entity.contactOutcome || entity.contactMethod);
  const fields = [
    { key: "name",        label: "Name",         done: !!entity.name },
    { key: "type",        label: "Type",         done: !!entity.type },
    { key: "nationality", label: "Nationality",  done: !!entity.nationality },
    { key: "metric",      label: entityMeta(entity.type).metricLabel,    done: metricEvidenceDone },
    { key: "email",       label: "Email",        done: !!(entity.email ?? entity.contactEmail) },
    { key: "phone",       label: "Phone",        done: !!(entity.phone ?? entity.contactPhone) },
    { key: "linkedin",    label: "LinkedIn",     done: !!entity.linkedinUrl },
    { key: "asset",       label: "Asset on file", done: assets.length >= 1 },
    { key: "rel",         label: "Connection",   done: relationships.length >= 1 },
    { key: "session",     label: "Research",     done: sessions.length >= 1 },
  ];
  const completed = fields.filter((f) => f.done).length;
  const pct       = Math.round((completed / fields.length) * 100);
  const barCls    = pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-[#9CFF1A]" : "bg-lime-600";
  const txtCls    = pct >= 80 ? "text-primary" : pct >= 50 ? "text-[#9CFF1A]" : "text-lime-400";

  return (
    <div className="border-b border-border px-4 md:px-6 py-3 bg-card/20 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono font-bold text-muted-foreground/70 uppercase tracking-widest">Profile completeness</span>
        <span className={cn("text-[12px] font-mono font-bold", txtCls)}>
          {pct}% · {completed}/{fields.length}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-2.5">
        <div className={cn("h-full rounded-full transition-all duration-700", barCls)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {fields.map((f) => (
          <span
            key={f.key}
            className={cn(
              "text-[12px] font-mono px-2 py-0.5 rounded border transition-colors",
              f.done
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/40 bg-muted/10 text-muted-foreground/30 opacity-40"
            )}
          >
            {f.done ? "[X] " : "[ ] "}{f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn("text-[11px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap", CAT_COLORS[category] ?? "text-muted-foreground bg-muted")}>
      {category}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApexProfile() {
  const params = useParams<{ id: string }>();
  const entityId = parseInt(params.id ?? "0", 10);

  const {
    data: entityFromApi,
    isLoading,
    isFetching,
    isError,
    isFetched,
    refetch: refetchEntity,
  } = useGetEntity(entityId);
  const mockEntity = isMockMode()
    ? (MOCK_ENTITIES.find((e) => e.id === entityId) ?? MOCK_ENTITIES[0])
    : null;
  const entity = mockEntity
    ? ({
        ...mockEntity,
        metadata: null,
        isHot: (mockEntity.accessScore ?? 0) >= 0.55,
        contactEmail: mockEntity.email,
        contactPhone: mockEntity.phone,
      } as any)
    : entityFromApi;

  const { data: assets = []       } = useListAssets({ entityId });
  const { data: relationships = [], refetch: refetchRelationships } = useListRelationships({ entityId });
  const { data: sessions = [],  refetch: refetchSessions } = useListResearchSessions({ entityId, limit: 10 });

  const createRelationship = useCreateRelationship();
  const deleteRelationship = useDeleteRelationship();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isEnriching, setIsEnriching]     = useState(false);
  const [enrichError, setEnrichError]     = useState<string | null>(null);
  const [enrichDone, setEnrichDone]       = useState(false);
  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"assets" | "network" | "research">("assets");
  const TAB_LABELS: Record<string, string> = { assets: "Assets & sources", network: "Network", research: "Research history" };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("apex-mobile-context", {
      detail: TAB_LABELS[activeTab],
    }));
  }, [activeTab]);

  // ── Contact evidence / rejection state ────────────────────────────────────
  const [showContactEvidence, setShowContactEvidence] = useState(false);
  const [contactEvidenceKey, setContactEvidenceKey] = useState(0);
  const [rejectStep, setRejectStep] = useState<Record<string, number>>({});
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [contactEvidence, setContactEvidence] = useState<Array<{
    id: number;
    vectorType: string;
    value: string;
    source: string;
    sourceUrl: string | null;
    extractionMethod: string | null;
    validationStatus: string;
    sourceReliability: number;
    directnessScore: number;
    independentCorroboration: number;
    observedAt: string;
  }>>([]);
  const [contactEvidenceLoading, setContactEvidenceLoading] = useState(false);
  const baseUrl = (import.meta as any).env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    setContactEvidenceLoading(true);
    fetch(`${baseUrl}/api/entities/${entityId}/contact-evidence`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load evidence");
        return readApiJson(response) as Promise<{ evidence?: typeof contactEvidence }>;
      })
      .then((data) => {
        if (cancelled) return;
        const rows = data.evidence ?? [];
        setContactEvidence(rows);
        // Open audit when bag has routes but card columns look empty — surface, don't hide.
        const cardThin = !(entity as any)?.phone && !(entity as any)?.email && !(entity as any)?.linkedinUrl;
        if (rows.length > 0 && cardThin) setShowContactEvidence(true);
      })
      .catch(() => {
        if (!cancelled) setContactEvidence([]);
      })
      .finally(() => {
        if (!cancelled) setContactEvidenceLoading(false);
      });
    return () => { cancelled = true; };
  }, [entityId, baseUrl, contactEvidenceKey, entity]);

  const handleRejectContact = async (field: string) => {
    const step = rejectStep[field] ?? 0;
    if (step < 1) { setRejectStep(prev => ({ ...prev, [field]: 1 })); return; }
    if (step < 2) { setRejectStep(prev => ({ ...prev, [field]: 2 })); return; }
    setRejectLoading(true); setRejectError(null);
    try {
      const resp = await fetch(`${baseUrl}/api/entities/${entityId}/reject-contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      if (!resp.ok) throw new Error("Request failed");
      setShowContactEvidence(false); setRejectStep({});
      await refetchEntity();
      // Auto-trigger enrichment pipeline to search for a replacement contact
      handleEnrich();
    } catch { setRejectError("Could not remove that contact — try again"); }
    finally { setRejectLoading(false); }
  };
  // ── Relationship modal ─────────────────────────────────────────────────────
  const [addRelOpen, setAddRelOpen]             = useState(false);
  const [relTargetType, setRelTargetType]       = useState<"Entity" | "Asset">("Entity");
  const [relTargetId, setRelTargetId]           = useState<number | null>(null);
  const [relTargetName, setRelTargetName]       = useState("");
  const [relType, setRelType]                   = useState("KNOWS");
  const [relStrength, setRelStrength]           = useState(0.5);
  const [relNotes, setRelNotes]                 = useState("");
  const [relSaving, setRelSaving]               = useState(false);
  const [relError, setRelError]                 = useState<string | null>(null);
  const [relSearchQ, setRelSearchQ]             = useState("");
  const [relSearchResults, setRelSearchResults] = useState<{ id: number; name: string }[]>([]);
  const [deletingRelId, setDeletingRelId]       = useState<number | null>(null);

  // ── OCCRP adverse-media state ──────────────────────────────────────────────
  const [occrpData, setOccrpData]         = useState<any>(null);
  const [occrpLoading, setOccrpLoading]   = useState(false);

  // ── OpenSky live-flights state ─────────────────────────────────────────────
  const [skyFlights, setSkyFlights]       = useState<any[]>([]);
  const [skyLoading, setSkyLoading]       = useState(false);

  useEffect(() => {
    if (!entityId) return;
    const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
    setOccrpLoading(true);
    fetch(`${base}/api/entities/${entityId}/occrp`)
      .then((r) => (r.ok ? readApiJson(r) : Promise.reject(new Error(String(r.status)))))
      .then((d) => { setOccrpData(d.aleph ?? null); })
      .catch(() => { setOccrpData(null); })
      .finally(() => setOccrpLoading(false));
    setSkyLoading(true);
    fetch(`${base}/api/entities/${entityId}/opensky`)
      .then((r) => (r.ok ? readApiJson(r) : Promise.reject(new Error(String(r.status)))))
      .then((d) => { setSkyFlights(d.flights ?? []); })
      .catch(() => { setSkyFlights([]); })
      .finally(() => setSkyLoading(false));
  }, [entityId]);

  // ── Loading / error states ─────────────────────────────────────────────────
  // Only show "not found" after a settled failure. Anything else → loading.
  // (Prevents the flash of error while the profile request is still open.)
  const settledMiss =
    !mockEntity &&
    entityId > 0 &&
    isFetched &&
    !isLoading &&
    !isFetching &&
    !entityFromApi &&
    isError;

  if (entityId <= 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
        <p className="font-mono text-sm text-muted-foreground">No profile selected.</p>
        <Link href="/profiles" className="text-xs font-mono text-primary hover:underline">← Back to Ledger</Link>
      </div>
    );
  }

  if (!entity && !settledMiss) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4" data-testid="profile-loading">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Loading profile…
        </p>
        <p className="text-[11px] text-stone-500">Fetching public records for this person</p>
      </div>
    );
  }
  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4" data-testid="profile-not-found">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="font-mono text-sm text-muted-foreground">Entity not found.</p>
        <Link href="/profiles" className="text-xs font-mono text-primary hover:underline">← Back to Ledger</Link>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const typeColor  = entityMeta(entity.type).color;
  let srcRegs: string[] = [];
  try { srcRegs = JSON.parse((entity as any).sourceRegistries ?? "[]"); } catch {}

  const geoAssets  = (assets as any[]).filter((a) => a.latitude != null && a.longitude != null);
  const confidence = computeConfidence(entity, assets as any[], relationships as any[]);
  const ledger     = buildLedger(entity, assets as any[], relationships as any[]);

  // Human-readable primary wealth source for display
  const primaryWealthSource = (() => {
    const reg = srcRegs[0] ?? "";
    if (/edgar|sec/i.test(reg)) {
      return reg.toLowerCase().includes("13") ? "SEC EDGAR — beneficial owner (13D/G filing)" : "SEC EDGAR — board director / exec (DEF 14A)";
    }
    if (/faa/i.test(reg)) {
      const jets = (assets as any[]).filter((a: any) => a.category === "Aviation");
      return jets.length > 1 ? `FAA aircraft owner · ${jets.length} aircraft` : "FAA aircraft owner";
    }
    if (/land.?reg|hmlr/i.test(reg)) {
      const props = (assets as any[]).filter((a: any) => a.category === "RealEstate");
      return props.length > 1 ? `UK Land Registry · ${props.length} properties £1M+` : "UK Land Registry · property £1M+";
    }
    if (/brreg/i.test(reg))           return "BRREG — Norwegian company director";
    if (/companies.?house/i.test(reg)) return "Companies House — UK company director";
    if (/bodacc|france/i.test(reg))   return "BODACC — French company director";
    if (/ares|czech/i.test(reg))      return "ARES — Czech company director";
    // Don't surface internal pipeline labels as a "wealth source"
    if (reg && !/^(web.?discovery|broad.?discovery|ai.?osint|deep.?web|in.?house|web.?enricher|manual)$/i.test(reg)) return reg;
    return null;
  })();

  const profileWorkSummary = entityWorkSummary(entity);
  const profileFindings = entityFindingsSummary({
    ...entity,
    assetCount: (assets as any[]).length,
    assetCategories: (assets as any[]).map((asset: any) => asset.category),
  });
  const mapCenter: [number, number] = geoAssets.length > 0
    ? [
        geoAssets.reduce((s: number, a: any) => s + a.latitude,  0) / geoAssets.length,
        geoAssets.reduce((s: number, a: any) => s + a.longitude, 0) / geoAssets.length,
      ]
    : [20, 0];

  const selectedSession = (sessions as any[])[selectedIdx] ?? null;
  let winningPath: PathStep[] = [];
  let mctsSteps:   any[]      = [];
  try { winningPath = selectedSession ? JSON.parse(selectedSession.winningPath ?? "[]") : []; } catch {}
  try { mctsSteps   = selectedSession ? JSON.parse(selectedSession.mctsSteps   ?? "[]") : []; } catch {}

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Primary dig: free Atlas single-target contact research (not legacy MCTS-only path). */
  const handleRunResearch = async () => {
    if (!entityId) return;
    setIsEnriching(true);
    setEnrichError(null);
    setEnrichDone(false);
    try {
      const launched = await launchAtlasPipeline({
        singleTargetId: Number(entityId),
        discoveryFirst: false,
        researchLimit: 1,
        runResearch: true,
        researchDepth: "standard",
        targetCount: 1,
      });
      if (!launched.ok) {
        throw new Error(launched.message || "Failed to start dig");
      }
      // Poll atlas-status until idle (or timeout ~7 min)
      let attempts = 0;
      const poll = async () => {
        if (attempts > 90) {
          setIsEnriching(false);
          setEnrichError("Timed out waiting for Atlas dig.");
          refetchEntity();
          setContactEvidenceKey((k) => k + 1);
          return;
        }
        attempts++;
        try {
          const sr = await fetch(`${baseUrl}/api/ingest/atlas-status`);
          const st = await readApiJson(sr);
          const running = st?.status === "running" || st?.status === "paused";
          if (!running) {
            setIsEnriching(false);
            setEnrichDone(true);
            refetchEntity();
            refetchSessions();
            setContactEvidenceKey((k) => k + 1);
            setSelectedIdx(0);
            return;
          }
        } catch { /* transient */ }
        setTimeout(poll, 4_000);
      };
      setTimeout(poll, 3_000);
    } catch (err: any) {
      setIsEnriching(false);
      setEnrichError(err?.message ?? "Dig failed — try again");
    }
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichError(null);
    setEnrichDone(false);
    try {
      const r = await fetch(`${baseUrl}/api/ingest/web-osint-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds: [Number(entityId)], batchSize: 1, force: true }),
      });
      const data = await readApiJson(r);
      if (!r.ok) throw new Error(data.error ?? "Request failed");
      const { jobId } = data;
      if (!jobId) {
        // Entity already fully enriched — just refresh
        setIsEnriching(false);
        setEnrichDone(true);
        refetchEntity();
        setContactEvidenceKey(k => k + 1);
        return;
      }
      let attempts = 0;
      const poll = async () => {
        if (attempts > 40) { setIsEnriching(false); setEnrichError("Timed out waiting for research to finish."); return; }
        attempts++;
        try {
          const jr = await fetch(`${baseUrl}/api/ingest/job/${jobId}`);
          const job = await readApiJson(jr);
          if (job.status === "done") {
            setIsEnriching(false);
            setEnrichDone(true);
            refetchEntity();
            setContactEvidenceKey(k => k + 1); // re-fetch evidence panel
            return;
          }
          if (job.status === "failed" || job.status === "error" || job.status === "cancelled") {
            setIsEnriching(false);
            setEnrichError(job.message ?? "Finished — no new public contacts found.");
            return;
          }
        } catch { /* ignore transient poll errors */ }
        setTimeout(poll, 2_000);
      };
      setTimeout(poll, 2_000);
    } catch (err: any) {
      setIsEnriching(false);
      setEnrichError(err.message ?? "Research failed — try again");
    }
  };

  /** Promote durable contact_evidence onto the card (no new dig). */
  const handleRehydrateContacts = async () => {
    if (!entityId) return;
    setIsEnriching(true);
    setEnrichError(null);
    try {
      const r = await fetch(`${baseUrl}/api/entities/rehydrate-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      const data = await readApiJson(r);
      if (!r.ok) throw new Error(data.error ?? data.message ?? "Rehydrate failed");
      setEnrichDone(true);
      refetchEntity();
      setContactEvidenceKey((k) => k + 1);
    } catch (err: any) {
      setEnrichError(err.message ?? "Rehydrate failed");
    } finally {
      setIsEnriching(false);
    }
  };

  /** Bounded secondary surface expand — never invents Personal contacts. */
  const handleRefreshSurface = async () => {
    setIsEnriching(true);
    setEnrichError(null);
    try {
      const r = await fetch(`${baseUrl}/api/entities/${entityId}/refresh-surface`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await readApiJson(r);
      if (!r.ok) throw new Error(data.error ?? data.message ?? "Refresh surface failed");
      setEnrichDone(true);
      refetchEntity();
      setContactEvidenceKey((k) => k + 1);
    } catch (err: any) {
      setEnrichError(err.message ?? "Refresh surface failed");
    } finally {
      setIsEnriching(false);
    }
  };

  // ── Relationship handlers ──────────────────────────────────────────────────

  const handleRelSearch = async (q: string) => {
    setRelSearchQ(q);
    if (!q.trim()) { setRelSearchResults([]); return; }
    try {
      const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/entities?search=${encodeURIComponent(q)}&limit=20`);
      const d = await readApiJson(r);
      const list: any[] = Array.isArray(d) ? d : (d.entities ?? []);
      setRelSearchResults(list.map((e: any) => ({ id: e.id, name: e.name })));
    } catch { setRelSearchResults([]); }
  };

  const handleSaveRelationship = () => {
    if (!relTargetId) { setRelError("Please select a target"); return; }
    setRelSaving(true);
    setRelError(null);
    createRelationship.mutate(
      { data: { sourceEntityId: entityId, targetId: relTargetId, targetType: relTargetType, relationshipType: relType, strength: relStrength, notes: relNotes || undefined } },
      {
        onSuccess: () => {
          setRelSaving(false);
          setAddRelOpen(false);
          setRelTargetId(null); setRelTargetName(""); setRelType("KNOWS"); setRelStrength(0.5);
          setRelNotes(""); setRelSearchQ(""); setRelSearchResults([]);
          refetchRelationships();
        },
        onError: (err: any) => { setRelSaving(false); setRelError(err?.message ?? "Failed to save"); },
      }
    );
  };

  const handleDeleteRelationship = (id: number) => {
    setDeletingRelId(id);
    deleteRelationship.mutate(
      { id },
      {
        onSuccess: () => { setDeletingRelId(null); refetchRelationships(); },
        onError:   () => setDeletingRelId(null),
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full overflow-visible">

      {/* ── Desktop Header ────────────────────────────────────────────── */}
      <div className="hidden md:block flex-shrink-0 border-b border-border bg-card/60 px-4 md:px-6 py-4">
        <div className="flex items-start gap-3 md:gap-4">
          <Link
            href="/profiles"
            aria-label="Back to entity ledger"
            className="mt-0.5 p-1.5 min-h-[40px] min-w-[36px] inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1 flex-wrap">
              {(entity as any).isHot && (
                <span className="flex items-center gap-1 text-[12px] font-mono font-bold text-[#9CFF1A] uppercase tracking-widest">
                  <ShieldAlert className="w-3 h-3" /> Hot Lead
                </span>
              )}
              <span className="text-[12px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Profile card
                <span className="opacity-50"> · {TAB_LABELS[activeTab] ?? activeTab}</span>
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-none mb-2">
              {formatEntityName(entity.name)}
            </h1>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[12px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1"
                style={{ color: typeColor, backgroundColor: typeColor + "1A" }}
              >
                <EntityTypeMark type={entity.type} compact />
              </span>
              {(entity as any).linkedinHeadline && (
                <span className="text-[12px] font-mono text-muted-foreground/80 flex items-center gap-1 px-2 py-0.5 rounded bg-muted/40 border border-border/50 max-w-[280px] truncate" title={(entity as any).linkedinHeadline}>
                  <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
                  {(entity as any).linkedinHeadline}
                </span>
              )}
              {(entity as any).nationality && (
                <span className="text-xs"><NationalityCell nationality={(entity as any).nationality} /></span>
              )}
              {(entity as any).estimatedNetWorth && (
                <span className="text-xs font-mono text-foreground">{formatCurrency((entity as any).estimatedNetWorth)}</span>
              )}
              {srcRegs.filter(r => !/^(web[-.]?discovery|broad[-.]?discovery|ai[-.]?osint|deep[-.]?web|in[-.]?house|web[-.]?enricher|manual|live[-.]?source)$/i.test(r)).slice(0, 3).map((r) => (
                <span key={r} className="text-[11px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                  {r}
                </span>
              ))}
            </div>
             <div className="mt-3 grid max-w-3xl gap-2 sm:grid-cols-2">
               <div className="rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-primary/75">What they do</div>
                 <p className="mt-1 text-[11px] leading-5 text-foreground/80">
                    {profileWorkSummary ?? "No documented role or activity is recorded yet."}
                 </p>
               </div>
               <div className="rounded-lg border border-secondary/15 bg-secondary/[0.035] px-3 py-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-secondary/80">What we found</div>
                 <p className="mt-1 text-[11px] leading-5 text-foreground/80">
                    {profileFindings}
                 </p>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-0.5">
                <ConfidenceBadge score={typeof (entity as any).contactConfidence === "number" ? (entity as any).contactConfidence : confidence.overall} />
                <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest">Quality</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <AccessScoreBadge score={entity.accessScore} />
                <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest">Reach</span>
              </div>
              {primaryWealthSource && (
                <div className="flex flex-col items-start gap-0.5 max-w-[140px]">
                  <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest">Wealth source</span>
                  <span className="text-[11px] font-mono text-foreground/80 leading-tight">{primaryWealthSource}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/network?entity=${entity.id}`}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground font-mono text-[12px] uppercase tracking-wider transition-colors"
                title="Network Graph"
              >
                <Network className="w-3 h-3" /> <span className="hidden sm:inline">Graph</span>
              </Link>
              <button
                type="button"
                data-testid="button-refresh-surface"
                onClick={handleRefreshSurface}
                disabled={isEnriching}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground font-mono text-[12px] uppercase tracking-wider transition-colors disabled:opacity-50"
                title="Refresh public surface (secondary expand — never invents Personal)"
              >
                {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span className="hidden sm:inline">Refresh surface</span>
              </button>
              <button
                type="button"
                onClick={handleRunResearch}
                disabled={isEnriching}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-mono text-[12px] uppercase tracking-wider transition-colors disabled:opacity-50"
                title="Free Atlas dig for public contact routes on this person"
                data-testid="button-dig-contacts"
              >
                {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <TargetIcon className="w-3 h-3" />}
                <span className="hidden sm:inline">{isEnriching ? "Digging…" : "Dig contacts"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hero - md:hidden */}
      <div className="md:hidden bg-card border-b border-border flex-shrink-0">
        {/* Hero content */}
        <div className="px-4 pt-4 pb-4"><div className="flex items-center justify-between mb-2">
            <EntityTypeMark type={(entity as any).type} compact />
            {(entity as any).isHot && (
              <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-md bg-[#9CFF1A]/15 text-[#d4ff8a] border border-[#9CFF1A]/30">
                <Flame className="h-3 w-3 shrink-0" aria-hidden />
                <span className="leading-none">Hot</span>
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-bold text-foreground leading-tight mb-1">
            {formatEntityName(entity.name)}
          </h1>
          {((entity as any).nationality || (entity as any).knownResidences) && (
            <p className="text-[13px] text-muted-foreground flex flex-wrap items-center gap-1.5">
              {(entity as any).nationality && <NationalityCell nationality={(entity as any).nationality} />}
              {(entity as any).knownResidences && (
                <span className="text-muted-foreground/80">· {(entity as any).knownResidences.split(",")[0]?.trim()}</span>
              )}
            </p>
          )}
           <div className="mt-3 space-y-2">
             <div className="rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2.5">
                <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-primary/75">What they do</div>
                <p className="mt-1 text-[11px] leading-5 text-foreground/80">{profileWorkSummary ?? "No documented role or activity is recorded yet."}</p>
             </div>
             <div className="rounded-lg border border-secondary/15 bg-secondary/[0.035] px-3 py-2.5">
                <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-secondary/80">What we found</div>
                <p className="mt-1 text-[11px] leading-5 text-foreground/80">{profileFindings}</p>
             </div>
           </div>
          {/* Score cards */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-xl border border-border/60 bg-background/80 p-2.5 flex flex-col">
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Contact quality</span>
              <span className="font-mono text-[20px] text-lime-200 font-bold leading-none mb-1">
                {typeof (entity as any).contactConfidence === "number" ? `${(entity as any).contactConfidence}` : "—"}
              </span>
              <span className="text-[12px] text-muted-foreground leading-tight">
                {((entity as any).contactConfidence ?? 0) >= 85 ? "Confirmed"
                  : ((entity as any).contactConfidence ?? 0) >= 60 ? "Solid evidence"
                  : ((entity as any).contactConfidence ?? 0) >= 30 ? "Partial evidence"
                  : ((entity as any).contactConfidence ?? 0) > 0 ? "Thin evidence"
                  : "No evidence"}
              </span>
            </div>
            <div className="flex-1 rounded-xl border border-border/60 bg-background/80 p-2.5 flex flex-col">
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Reachability</span>
              <span className="font-mono text-[20px] text-lime-200 font-bold leading-none mb-1">
                {entity.accessScore != null ? Math.round(entity.accessScore * 100) : "—"}
              </span>
              <span className="text-[12px] text-muted-foreground leading-tight">
                {(entity.accessScore ?? 0) >= 0.85 ? "Direct path"
                  : (entity.accessScore ?? 0) >= 0.6 ? "Easy to reach"
                  : (entity.accessScore ?? 0) >= 0.3 ? "Possible"
                  : (entity.accessScore ?? 0) > 0 ? "Hard to reach"
                  : "No path"}
              </span>
            </div>
            <div className="flex-1 bg-background rounded border border-border/50 p-2.5 flex flex-col">
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{entityMeta(entity.type).metricLabel}</span>
              {(entity as any).estimatedNetWorth != null ? (
                <span className="font-mono text-[17px] font-bold text-primary leading-none mb-1">
                {entity.type === "HNWI" ? formatCurrency((entity as any).estimatedNetWorth) : entityMetric(entity)}
                </span>
              ) : (
                <span className="font-mono text-[12px] font-semibold text-foreground/60 leading-snug mb-1 italic">
                  {primaryWealthSource ?? "In Discovery"}
                </span>
              )}
              {(entity as any).estimatedNetWorth != null && primaryWealthSource && (
                <span className="text-[11px] text-muted-foreground leading-tight">{primaryWealthSource}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Ownership / control resolution ─────────────────────────────────── */}
      {(() => {
        const e = entity as any;
        let meta: Record<string, any> = {};
        try { meta = JSON.parse(e.metadata ?? "{}"); } catch {}
        const resolutions = Array.isArray(meta.deepWebOwnerResolutions)
          ? meta.deepWebOwnerResolutions
          : [];
        const legacyPeople = Array.isArray(meta.deepWebPersonsDiscovered)
          ? meta.deepWebPersonsDiscovered
          : [];
        const summary = typeof meta.deepWebOwnershipSummary === "string"
          ? meta.deepWebOwnershipSummary
          : null;
        const sourceUrls = Array.isArray(meta.deepWebOwnershipSources)
          ? meta.deepWebOwnershipSources.filter((url: unknown): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
          : [];
        const people = resolutions.length > 0
          ? resolutions
          : legacyPeople.map((name: string) => ({
              name,
              role: "associated_person",
              ownershipStatus: "not_established",
              basis: null,
              sourceUrls: sourceUrls.slice(0, 2),
              instagram: null,
              twitter: null,
              linkedin: null,
              email: null,
            }));
        const isOrg = e.type === "Corporation" || e.type === "Trust";
        if (!isOrg && people.length === 0 && !summary) return null;
        const ownerCount = people.filter((person: any) =>
          person.role === "owner" || person.role === "beneficial_owner" || person.role === "controller",
        ).length;
        return (
          <section className="flex-shrink-0 border-b border-border px-4 md:px-6 py-4 bg-[#9CFF1A]/[0.03]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#9CFF1A] flex-shrink-0" />
                  <span className="text-[12px] font-mono font-bold text-[#9CFF1A] uppercase tracking-widest">
                    Ownership / Control
                  </span>
                  {ownerCount > 0 && (
                    <span className="text-[11px] font-mono text-lime-400/80 uppercase">
                      {ownerCount} supported {ownerCount === 1 ? "claim" : "claims"}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground/70 mt-1.5 leading-relaxed max-w-3xl">
                  Phase 0 resolves the people behind the entity first. Director, operator, founder, and owner are kept distinct; names remain review-only until independently confirmed.
                </p>
              </div>
              {sourceUrls[0] && (
                <a
                  href={sourceUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-[11px] font-mono text-[#9CFF1A]/80 hover:text-[#d4ff8a] underline underline-offset-2"
                >
                  Source↗
                </a>
              )}
            </div>
            <div className="rounded border border-[#9CFF1A]/15 bg-background/40 px-3 py-2.5 mb-3">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#9CFF1A]/60 mb-1">
                Phase 0 finding
              </div>
              <div className={cn(
                "text-xs font-mono leading-relaxed",
                summary && !/not established|not proven|unknown/i.test(summary)
                  ? "text-foreground/90"
                  : "text-muted-foreground/70",
              )}>
                {summary ?? "Ownership not established yet — run the owner-first enrichment pass."}
              </div>
            </div>
            {people.length === 0 ? (
              <div className="text-[12px] font-mono text-muted-foreground/60 italic">
                No named principals returned yet. The next Phase 0 pass will search owners, controllers, founders, operators, and officers separately.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {people.slice(0, 8).map((person: any, index: number) => {
                  const role = String(person.role ?? "associated_person").replaceAll("_", " ");
                  const status = String(person.ownershipStatus ?? "not_established").replaceAll("_", " ");
                  const isSupported = person.ownershipStatus === "confirmed" || person.ownershipStatus === "probable";
                  const urls = Array.isArray(person.sourceUrls)
                    ? person.sourceUrls.filter((url: unknown): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
                    : [];
                  return (
                    <div key={`${person.name}-${index}`} className="rounded border border-border/70 bg-background/50 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCheck className="w-3.5 h-3.5 text-[#9CFF1A]/80 flex-shrink-0" />
                          <span className="text-xs font-semibold text-foreground truncate">{person.name}</span>
                        </div>
                        <span className={cn(
                          "text-[11px] font-mono uppercase tracking-wider flex-shrink-0",
                          isSupported ? "text-lime-400" : "text-muted-foreground/65",
                        )}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-mono uppercase text-[#9CFF1A]/80">{role}</span>
                        {person.basis && (
                          <span className="text-[11px] text-muted-foreground/65 truncate max-w-full" title={person.basis}>
                            · {person.basis}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {person.instagram && <a href={person.instagram} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-pink-400 hover:underline">Instagram↗</a>}
                        {person.linkedin && <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#9CFF1A] hover:underline">LinkedIn↗</a>}
                        {person.twitter && <a href={person.twitter} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#9CFF1A] hover:underline">X↗</a>}
                        {urls.slice(0, 2).map((url: string) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#9CFF1A]/70 hover:underline truncate max-w-[180px]" title={url}>
                            Evidence↗
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })()}

      {/* ── Direct Contact Vectors (8-vector panel — H5) ───────────────────── */}
      {(() => {
        const e = entity as any;
        const hasContact = !!(
          e.email || e.phone || e.linkedinUrl || e.twitterHandle ||
          e.instagramHandle || e.telegramHandle || e.personalWebsite || e.foundationName
        );
        const dbConf = typeof e.contactConfidence === "number" ? e.contactConfidence : null;
        const conf = dbConf !== null ? dbConf :
          Math.min(100,
            (e.email && (e as any).emailConfidence >= 80 ? 35 : e.email ? 15 : 0) +
            (e.phone           ? 25 : 0) +
            (e.linkedinUrl     ? 20 : 0) +
            (e.foundationName  ? 20 : 0) +   // IRS 990 filing = high-confidence anchor
            (e.telegramHandle  ? 15 : 0) +
            (e.twitterHandle   ? 10 : 0) +
            (e.personalWebsite ? 10 : 0) +
            (e.instagramHandle ?  5 : 0)
          );
        const confCls =
          conf >= 60 ? "text-primary border-primary/30 bg-primary/10"
          : conf >= 30 ? "text-[#9CFF1A] border-[#9CFF1A]/30 bg-[#9CFF1A]/10"
          : "text-muted-foreground border-border bg-muted/20";
        return (
          <div className={cn("flex-shrink-0 border-b border-border px-4 md:px-6 py-3", hasContact && "bg-primary/5")}>
            <div className="flex items-center justify-between mb-2 gap-2">
               <span className="text-[11px] font-mono font-bold text-primary uppercase tracking-widest">How to reach them</span>
              <div className="flex items-center gap-1.5">
                <button
                    onClick={() => { setShowContactEvidence(v => !v); setRejectStep({}); setRejectError(null); }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded border font-mono text-[12px] uppercase tracking-wider transition-colors",
                      showContactEvidence
                        ? "border-[#9CFF1A]/40 text-[#9CFF1A] bg-[#9CFF1A]/10"
                        : "border-border text-muted-foreground hover:text-[#9CFF1A] hover:border-[#9CFF1A]/40"
                    )}
                  >
                    {showContactEvidence ? "▴ Evidence" : "▾ Evidence"}
                  </button>
              </div>
            </div>
            <>
              <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5" data-testid="profile-reach-provenance">
                <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-1.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider text-lime-200">
                  REACH
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] font-mono uppercase tracking-wider text-stone-400">
                  attributable preferred
                </span>
                {typeof (entity as any).contactConfidence === "number" && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] font-mono tabular-nums text-stone-400">
                    conf {(entity as any).contactConfidence}%
                  </span>
                )}
              </div>
              <div className="w-full min-w-0">
                <ContactSurface
                  contacts={(entity as { contacts?: unknown[] }).contacts as never}
                  phone={e.phone}
                  email={e.email && !isProtectedEmail(e.email) ? e.email : null}
                  linkedinUrl={e.linkedinUrl}
                  phoneSource={(entity as { phoneSource?: string }).phoneSource}
                  density="card"
                  evidenceCount={contactEvidence.length}
                  onRehydrate={handleRehydrateContacts}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {/* Twitter/X — REACH · social */}{/* Twitter/X — REACH · social */}
                {cleanHandle(e.twitterHandle) && (
                  <a href={`https://x.com/${cleanHandle(e.twitterHandle)}`} target="_blank" rel="noopener noreferrer"
                    title={e.twitterBio ?? `@${cleanHandle(e.twitterHandle)} on X/Twitter`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 text-[#9CFF1A] font-mono text-xs hover:bg-[#9CFF1A]/20 transition-colors">
                    <Twitter className="w-3.5 h-3.5 flex-shrink-0" />
                    @{cleanHandle(e.twitterHandle)}
                  </a>
                )}
                {/* Instagram */}
                {cleanHandle(e.instagramHandle) && (
                  <a href={`https://instagram.com/${cleanHandle(e.instagramHandle)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-pink-400/30 bg-pink-400/10 text-pink-400 font-mono text-xs hover:bg-pink-400/20 transition-colors">
                    <Instagram className="w-3.5 h-3.5 flex-shrink-0" />
                    @{cleanHandle(e.instagramHandle)}
                  </a>
                )}
                {/* Telegram */}
                {e.telegramHandle && (
                  <a href={`https://t.me/${e.telegramHandle}`} target="_blank" rel="noopener noreferrer"
                    title={e.telegramBio ?? `@${e.telegramHandle} on Telegram`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-lime-400/30 bg-lime-400/10 text-lime-400 font-mono text-xs hover:bg-lime-400/20 transition-colors">
                    <Send className="w-3.5 h-3.5 flex-shrink-0" />
                    t.me/{e.telegramHandle}
                  </a>
                )}
                {/* Personal website */}
                {e.personalWebsite && (
                  <a href={e.personalWebsite} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 text-[#9CFF1A] font-mono text-xs hover:bg-[#9CFF1A]/20 transition-colors max-w-[200px]">
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{e.personalWebsite.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                {/* Foundation / IRS 990 */}
                {e.foundationName && (
                  <a href={`https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(e.foundationName)}`}
                    target="_blank" rel="noopener noreferrer"
                    title={`IRS 990 filing: ${e.foundationName}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 text-[#9CFF1A] font-mono text-xs hover:bg-[#9CFF1A]/20 transition-colors max-w-[200px]">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{e.foundationName}</span>
                  </a>
                )}
              </div>
              </div>
              {!hasContact && !isEnriching && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleEnrich}
                    className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/15"
                  >
                    Run research
                  </button>
                  <button
                    type="button"
                    onClick={handleRehydrateContacts}
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Rehydrate from evidence
                  </button>
                  <Link
                    href="/reactor"
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Open Reactor
                  </Link>
                </div>
              )}
            </>
            {enrichError && (
              <p className="text-xs font-mono text-red-400 mt-1.5">{enrichError}</p>
            )}
            {/* ── Contact Evidence Panel ─────────────────────────────────── */}
            {showContactEvidence && (() => {
              const e2 = entity as any;

              // Parse enrichment sources stored in metadata
              let enrichSources: string[] = [];
              try {
                const m = JSON.parse(e2.metadata ?? "{}");
                enrichSources = Array.isArray(m.enrichmentSources) ? m.enrichmentSources : [];
              } catch {}
              const hasSrc = (tag: string) =>
                enrichSources.some(s => s.toLowerCase().includes(tag.toLowerCase()));

              // Human-readable registry name from sourceRegistries
              let srcRegs2: string[] = [];
              try { srcRegs2 = JSON.parse(e2.sourceRegistries ?? "[]"); } catch {}
              const primaryReg = srcRegs2[0] ?? "";
              const registryLabel = (() => {
                if (/faa/i.test(primaryReg))          return "the FAA Releasable Aircraft Database (a U.S. federal registry of aircraft owners)";
                if (/edgar|sec/i.test(primaryReg))    return "SEC EDGAR (U.S. securities filings identifying beneficial owners and executives)";
                if (/land.?reg|hmlr/i.test(primaryReg)) return "the UK Land Registry (property transaction records)";
                if (/brreg|norway/i.test(primaryReg)) return "Norway's official business registry (BRREG)";
                if (/companies.?house/i.test(primaryReg)) return "UK Companies House (official company filings)";
                if (/bodacc|france/i.test(primaryReg)) return "BODACC (France's official business gazette)";
                if (/ares|czech/i.test(primaryReg))   return "the Czech ARES business registry";
                return primaryReg || "a public registry";
              })();

              // Natural-language research narrative for each contact field.
              const explainContact = (field: string): React.ReactNode => {
                const pName = formatEntityName(e2.name || "This person");

                // Natural registry label (shorter than registryLabel)
                const regShort = (() => {
                  if (/faa/i.test(primaryReg))              return "the FAA aircraft registry";
                  if (/edgar|sec/i.test(primaryReg))        return "SEC EDGAR";
                  if (/land.?reg|hmlr/i.test(primaryReg))   return "the UK Land Registry";
                  if (/brreg|norway/i.test(primaryReg))     return "Norway's BRREG";
                  if (/companies.?house/i.test(primaryReg)) return "UK Companies House";
                  if (/bodacc|france/i.test(primaryReg))    return "France's BODACC";
                  if (/ares|czech/i.test(primaryReg))       return "the Czech ARES registry";
                  return primaryReg || "a public registry";
                })();

                // Map field → vectorType for evidence lookup
                const vectorTypeForField: Record<string, string> = {
                  email: "email", phone: "phone",
                  linkedinUrl: "social", twitterHandle: "social",
                  instagramHandle: "social", telegramHandle: "social",
                };
                const vt = vectorTypeForField[field] ?? null;
                const fieldValue = e2[field];
                const matchingEvidence = vt && fieldValue
                  ? contactEvidence.filter(ev => ev.vectorType === vt && ev.value === fieldValue)
                  : [];
                const primaryEvidence = matchingEvidence.find(ev => ev.sourceUrl) ?? matchingEvidence[0] ?? null;

                const evidenceBadge = primaryEvidence ? (
                  <span className="block mb-1.5 text-[11px] font-mono">
                    <span className="text-[#9CFF1A]/60 uppercase tracking-wider">Source: </span>
                    {primaryEvidence.sourceUrl ? (
                      <a href={primaryEvidence.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[#9CFF1A] hover:underline" title={primaryEvidence.sourceUrl}>
                        {primaryEvidence.source}↗
                      </a>
                    ) : (
                      <span className="text-muted-foreground/70">{primaryEvidence.source}</span>
                    )}
                    {primaryEvidence.extractionMethod && !/guess|pattern|domain.gues/i.test(primaryEvidence.extractionMethod) && (
                      <span className="text-muted-foreground/40"> · {primaryEvidence.extractionMethod}</span>
                    )}
                    <span className="text-muted-foreground/30"> · observed {new Date(primaryEvidence.observedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                  </span>
                ) : null;

                if (field === "email") {
                  const steps: string[] = [];
                  // Step 1: anchor — the registry record that identified this person
                  steps.push(`We identified ${pName} through ${regShort} — a mandatory public filing that gave us their confirmed legal name${/edgar|sec/i.test(primaryReg) ? ", address, and company affiliation" : ""}.`);
                  // Step 2: domain path
                  const fromPP = hasSrc("propublica") || hasSrc("ProPublica");
                  const fromDomain = hasSrc("domain") || hasSrc("Domain");
                  const fromSMTP = hasSrc("smtp") || hasSrc("SMTP");
                  const fromWikidata = hasSrc("wikidata") || hasSrc("Wikidata");
                  const fromDDG = hasSrc("ddg") || hasSrc("DDG") || hasSrc("duckduckgo");
                  if (fromPP) {
                    steps.push("We then searched IRS Form 990 filings — the annual tax return every U.S. nonprofit must make public — and found an associated foundation. That filing disclosed the organisation's domain.");
                  }
                  if (fromDomain) {
                    steps.push("We identified a domain associated with them or their organisation and located a candidate email address from public records tied to that domain.");
                  }
                  if (fromSMTP) {
                    steps.push("We then did a mailbox check: a passive handshake with the mail server that confirms whether an inbox exists — nothing is sent, no email is received on the other end. The address shown is the one that came back as live.");
                  }
                  if (fromWikidata) steps.push("This address is also listed in their public Wikidata record, which corroborates it.");
                  if (fromDDG) steps.push("A web search for their name and known affiliations also surfaced this address.");
                  if (steps.length === 1) {
                    const rawMethod = primaryEvidence?.extractionMethod ?? "";
                    const safeMethod = /guess|pattern|domain.gues/i.test(rawMethod)
                      ? "cross-referencing known domains and organisational affiliations"
                      : (rawMethod || primaryEvidence?.source || null);
                    steps.push(safeMethod
                      ? `The address was surfaced from public records associated with their name and known organisations (via ${safeMethod}).`
                      : "The address was surfaced from public records associated with their name and known organisations.");
                  }
                  steps.push("If this looks like a shared company inbox (info@, press@, contact@) rather than a personal address, flag it as incorrect — we'll search for a better one.");
                  return <>{evidenceBadge}<>{steps.map((s, i) => <span key={i}>{i > 0 && " "}{s}</span>)}</></>;
                }

                if (field === "phone") {
                  const steps: string[] = [];
                  steps.push(`We found ${pName} in ${regShort}, which anchored the name and jurisdiction.`);
                  if (hasSrc("rdap") || hasSrc("RDAP") || hasSrc("whois") || hasSrc("WHOIS")) {
                    steps.push("We located a domain registered to them or their company, then looked it up in the public WHOIS/RDAP record — that's essentially a registrant directory, and this number was listed as the contact. One caveat: WHOIS data sometimes reflects whoever managed the domain registration rather than the person themselves, so it's worth a quick sanity-check.");
                  }
                  if (hasSrc("propublica") || hasSrc("ProPublica")) {
                    steps.push("This number also appears in a publicly filed IRS Form 990 for a nonprofit linked to them.");
                  }
                  if (hasSrc("companieshouse") || hasSrc("CompaniesHouse")) {
                    steps.push("It was also listed in UK Companies House filings for a company they're connected to.");
                  }
                  if (hasSrc("brreg") || hasSrc("BRREG")) {
                    steps.push("It appears in Norway's BRREG registry under a company they're associated with.");
                  }
                  if (steps.length === 1) {
                    steps.push(primaryEvidence
                      ? `Number surfaced via ${primaryEvidence.extractionMethod ?? primaryEvidence.source}.`
                      : "Surfaced from a public record linked to their name or registered organisation.");
                  }
                  return <>{evidenceBadge}<>{steps.map((s, i) => <span key={i}>{i > 0 && " "}{s}</span>)}</></>;
                }

                if (field === "linkedinUrl") {
                  return (
                    <>{evidenceBadge}
                    {`We found ${pName} in ${regShort}, then searched LinkedIn for a profile matching their name, location, and known affiliations. The profile shown here is the closest match. We haven't verified it's definitively them — take 30 seconds to check the photo, job history, and connections before reaching out.`}
                    </>
                  );
                }

                if (field === "twitterHandle" || field === "instagramHandle") {
                  const net = field === "twitterHandle" ? "Twitter/X" : "Instagram";
                  return (
                    <>{evidenceBadge}
                    {`We found ${pName} in ${regShort}, then searched ${net} for accounts whose name and bio matched. The handle shown is our best match — accounts with common names can be ambiguous, so check the profile's content, location, and recent activity before treating this as confirmed.`}
                    </>
                  );
                }

                if (field === "telegramHandle") {
                  return (
                    <>{evidenceBadge}
                    {`We found ${pName} in ${regShort}, then searched public Telegram directories for a matching account. Telegram handles can change hands, so look at the account's bio, history, and activity before reaching out.`}
                    </>
                  );
                }

                if (field === "personalWebsite") {
                  const steps: string[] = [];
                  steps.push(`We identified ${pName} through ${regShort}.`);
                  if (hasSrc("dns") || hasSrc("DNS") || hasSrc("probe")) {
                    steps.push("We found a domain that appeared to belong to them and confirmed it's live and resolving via DNS lookup.");
                  }
                  if (hasSrc("ProPublica-Website") || hasSrc("propublica")) {
                    steps.push("The site is also listed as the organisation's website in a publicly filed IRS Form 990.");
                  }
                  if (hasSrc("Wikidata-Website") || hasSrc("wikidata")) {
                    steps.push("The domain is linked to them directly in their Wikidata public record.");
                  }
                  if (steps.length === 1) steps.push("Confirmed active through public records.");
                  return <>{evidenceBadge}<>{steps.map((s, i) => <span key={i}>{i > 0 && " "}{s}</span>)}</></>;
                }

                if (field === "foundationName") {
                  return (
                    <>{evidenceBadge}
                    {`${pName} is listed as an officer, director, or trustee of this foundation in an IRS Form 990 — the annual tax return every U.S. nonprofit is required to file publicly. This isn't inferred; it's a government-filed document.`}
                    </>
                  );
                }

                if (field === "contactMethod") {
                  return <>{"This was entered manually — either by you or imported from a research session. The enrichment pipeline didn't generate it."}</>;
                }

                return <>{evidenceBadge}{`${pName} is in ${regShort}. This value was surfaced from public records linked to their name and registry entry.`}</>;
              };

              const cFields = [
                { field: "email",           label: "Email",      value: e2.email },
                { field: "phone",           label: "Phone",      value: e2.phone },
                { field: "linkedinUrl",     label: "LinkedIn",   value: e2.linkedinUrl },
                { field: "twitterHandle",   label: "Twitter/X",  value: e2.twitterHandle },
                { field: "instagramHandle", label: "Instagram",  value: e2.instagramHandle },
                { field: "telegramHandle",  label: "Telegram",   value: e2.telegramHandle },
                { field: "personalWebsite", label: "Website",    value: e2.personalWebsite },
                { field: "foundationName",  label: "Foundation", value: e2.foundationName },
              ].filter(f => !!f.value);

              return (
                <div className="mt-3 border border-[#9CFF1A]/20 rounded-lg bg-[#9CFF1A]/5 overflow-hidden">
                  {/* Panel header */}
                  <div className="px-3 py-2.5 border-b border-[#9CFF1A]/10">
                    <div className="text-[12px] font-mono font-semibold text-[#9CFF1A]/80 mb-0.5">
                      How we found these contacts
                    </div>
                    <div className="text-[12px] text-muted-foreground/60 leading-relaxed">
                      Each contact below includes a plain-English explanation of the research steps. If something looks wrong, flag it to remove it permanently.
                    </div>
                  </div>
                  <div className="px-3 py-2 border-b border-[#9CFF1A]/10">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1.5">
                      Persisted evidence audit
                    </div>
                    {contactEvidenceLoading ? (
                      <div className="text-[12px] font-mono text-muted-foreground">Loading evidence…</div>
                    ) : contactEvidence.length === 0 ? (
                      <div className="space-y-2 text-[12px] font-mono text-muted-foreground/70">
                        <p>No structured evidence rows on this card yet.</p>
                        <p className="text-muted-foreground/50">
                          Evidence is written when dig/enrichment finds public routes. If the dig already ran, use{" "}
                          <span className="text-[#9CFF1A]/80">Rehydrate from evidence</span> above or Launch a single-target dig.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {contactEvidence.map((item) => (
                          <div key={item.id} className="text-[12px] font-mono border-l border-[#9CFF1A]/20 pl-2 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[#d4ff8a]/80 uppercase w-14 flex-shrink-0">{item.vectorType}</span>
                              <span className={cn(
                                "uppercase text-[11px] flex-shrink-0",
                                item.validationStatus === "verified" ? "text-lime-400" :
                                  item.validationStatus === "rejected" ? "text-red-400" : "text-[#9CFF1A]/80",
                              )}>{item.validationStatus}</span>
                              <span className="text-foreground/80 truncate flex-1" title={item.value}>{item.value}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground/60">
                              {item.sourceUrl ? (
                                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-[#9CFF1A]/70 hover:text-[#9CFF1A] underline underline-offset-2 truncate max-w-[220px]"
                                  title={item.sourceUrl}>
                                  {item.source}↗
                                </a>
                              ) : (
                                <span>{item.source}</span>
                              )}
                              {item.extractionMethod && !/guess|pattern|domain.gues/i.test(item.extractionMethod) && (
                                <span className="text-muted-foreground/40">· {item.extractionMethod}</span>
                              )}
                              <span className="text-muted-foreground/30 ml-auto flex-shrink-0">
                                {new Date(item.observedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cFields.map(({ field, label, value }) => {
                    const step = rejectStep[field] ?? 0;
                    return (
                      <div key={field} className="px-3 py-3 border-b border-[#9CFF1A]/10 last:border-0">
                        {/* Contact type label + value + action button */}
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-mono uppercase tracking-widest text-[#9CFF1A]/50 mb-0.5">{label}</div>
                            <div className="text-[11px] font-mono font-semibold text-foreground break-all">{value}</div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap justify-end pt-0.5">
                            {step === 0 && (
                              <button onClick={() => handleRejectContact(field)}
                                className="text-[11px] font-mono px-2 py-1 rounded border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/50 transition-colors whitespace-nowrap">
                                Flag as incorrect
                              </button>
                            )}
                            {step === 1 && (<>
                              <span className="text-[11px] font-mono text-red-400 whitespace-nowrap">Remove this contact?</span>
                              <button onClick={() => handleRejectContact(field)} className="text-[11px] font-mono px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors">Yes, remove</button>
                              <button onClick={() => setRejectStep(prev => { const n = {...prev}; delete n[field]; return n; })} className="text-[11px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Keep it</button>
                            </>)}
                            {step === 2 && (<>
                              <span className="text-[11px] font-mono text-red-400 font-bold whitespace-nowrap">Permanently delete?</span>
                              <button onClick={() => handleRejectContact(field)} disabled={rejectLoading}
                                className="text-[11px] font-mono px-2 py-1 rounded bg-red-600/30 border border-red-600/50 text-red-300 hover:bg-red-600/40 disabled:opacity-40 transition-colors">
                                {rejectLoading ? "…" : "Yes, delete"}
                              </button>
                              <button onClick={() => setRejectStep({})} className="text-[11px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                            </>)}
                          </div>
                        </div>
                        {/* Plain-English research explanation */}
                        <div className="text-[12px] text-muted-foreground/55 leading-relaxed border-l-2 border-[#9CFF1A]/20 pl-2.5">
                          {explainContact(field)}
                        </div>
                      </div>
                    );
                  })}
                  {rejectError && <div className="px-3 py-2 text-[12px] font-mono text-red-400">{rejectError}</div>}
                  <div className="px-3 py-2 border-t border-[#9CFF1A]/10">
                    <span className="text-[11px] text-muted-foreground/40">Flagging a contact as incorrect automatically re-runs the research pipeline to search for a replacement.</span>
                    {isEnriching && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[11px] font-mono text-primary">Research pipeline running…</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── Why this person is in this database (always visible) ─────────── */}
      {(() => {
        const e = entity as any;
        let srcRegsLocal: string[] = [];
        try { srcRegsLocal = JSON.parse(e.sourceRegistries ?? "[]"); } catch {}
        const primaryReg = srcRegsLocal[0] ?? "";
        const pName = formatEntityName(e.name || "This person");
        const assetArr = assets as any[];

        const lines: string[] = [];
        if (/edgar|sec/i.test(primaryReg)) {
          const is13 = primaryReg.toLowerCase().includes("13");
          lines.push(is13
            ? `${pName} filed a beneficial ownership disclosure with the U.S. Securities and Exchange Commission (SEC EDGAR Form 13D or 13G). Anyone who controls more than 5% of a publicly traded company is legally required to file this — it's not optional, it's a federal requirement, and it's public record.`
            : `${pName} appears in executive compensation filings submitted to the U.S. Securities and Exchange Commission (SEC EDGAR DEF 14A). Board directors and named executives of public companies must file these annually — that's how we know they hold a senior role.`);
        } else if (/faa/i.test(primaryReg)) {
          const jets = assetArr.filter((a: any) => a.category === "Aviation");
          lines.push(`${pName} owns ${jets.length > 1 ? `${jets.length} aircraft` : "an aircraft"} registered with the FAA — the U.S. Federal Aviation Administration. Every private aircraft in the U.S. must be registered with the FAA, and that registry is public. Turbine aircraft (jets and large turboprops) cost millions to own and operate, which is why FAA ownership is one of our strongest wealth signals.`);
        } else if (/land.?reg|hmlr/i.test(primaryReg)) {
          const props = assetArr.filter((a: any) => a.category === "RealEstate");
          lines.push(`${pName} shows up in the UK Land Registry as the buyer or registered owner of ${props.length > 1 ? `${props.length} properties` : "a property"} above £1 million. Every property transaction in England and Wales is filed with the Land Registry — it's how the UK tracks real estate ownership, and it's freely accessible.`);
        } else if (/brreg/i.test(primaryReg)) {
          lines.push(`${pName} is listed in Norway's official business registry (BRREG) as a director or key officer. BRREG is the public record of every registered company in Norway — we cross-reference officer names with company turnover data to identify high-net-worth individuals.`);
        } else if (/companies.?house/i.test(primaryReg)) {
          lines.push(`${pName} appears in UK Companies House as a director or person of significant control. Companies House is the UK's official register of companies and their officers — anyone with >25% ownership or voting control must be listed. That's the statutory basis for their inclusion here.`);
         } else if (/^manual$/i.test(primaryReg)) {
           lines.push(`${pName} is a manually created research record. No public registry or asset evidence is recorded yet.`);
         } else if (primaryReg) {
          lines.push(`${pName} appears in ${primaryReg} — a public registry we monitor for high-net-worth individuals and significant asset holders.`);
        }
        if (e.estimatedNetWorth != null) {
          lines.push(`Estimated net worth or AUM: ${formatCurrency(e.estimatedNetWorth)}.`);
        }
        if (assetArr.length > 0) {
          const cats = [...new Set(assetArr.map((a: any) => a.category))];
          lines.push(`Registered assets on file: ${assetArr.length} (${cats.join(", ")}).`);
        }

        if (!lines.length) return null;
        return (
          <div className="flex-shrink-0 border-b border-border px-4 md:px-6 py-3 bg-muted/20">
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1.5">
              Why {pName} is in this database
            </div>
            <p className="text-[11px] text-muted-foreground/75 leading-relaxed">
              {lines.join(" ")}
            </p>
          </div>
        );
      })()}

      {/* ── Profile Completeness (E1) ─────────────────────────────────────── */}
      <ProfileCompleteness
        entity={entity}
        assets={assets as any[]}
        relationships={relationships as any[]}
        sessions={sessions as any[]}
      />

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card/60 px-4 md:px-6 sticky top-0 md:static z-10">
        <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {([
            { id: "assets"   as const, label: "Assets & Sources", mobileLabel: "Assets", icon: <Layers    className="w-3.5 h-3.5" /> },
            { id: "network"  as const, label: "Network",          mobileLabel: "Network", icon: <Network   className="w-3.5 h-3.5" /> },
            { id: "research" as const, label: "Research history", mobileLabel: "Research", icon: <Route     className="w-3.5 h-3.5" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-3 min-h-[44px] font-mono text-[12px] sm:text-[11px] uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.icon}
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* ═══ ASSETS & SOURCES TAB ════════════════════════════════════════ */}
        {activeTab === "assets" && <>

          {/* Row 1: Mini-map + Confidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

            {/* ── Asset Mini-Map ──────────────────────────────────────────── */}
            <div className="border border-border rounded-lg overflow-hidden bg-card/30 flex flex-col">
              <SectionHeader
                icon={<MapPin className="w-3.5 h-3.5" />}
                title="Asset Footprint"
                badge={`${geoAssets.length} geolocated`}
              />
              <div className="relative flex-1" style={{ minHeight: "320px" }}>
                {geoAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40 px-4 text-center" style={{ minHeight: "320px" }}>
                    <MapPin className="w-8 h-8 opacity-20" />
                    <p className="text-xs font-mono">
                      {(assets as any[]).length > 0 ? "Assets on file, but no map coordinates yet" : "No assets on file yet"}
                    </p>
                    <p className="text-[12px] font-mono leading-relaxed">
                      {(assets as any[]).length > 0
                        ? `${(assets as any[]).length} asset${(assets as any[]).length !== 1 ? "s" : ""} recorded — see list below`
                        : "Assets appear after the AI enrichment pipeline completes."}
                    </p>
                  </div>
                ) : (
                  <MapContainer
                    center={mapCenter}
                    zoom={geoAssets.length > 1 ? 3 : 5}
                    style={{ height: "clamp(320px, 46vh, 520px)", width: "100%" }}
                    scrollWheelZoom={true}
                    touchZoom={true}
                    className="z-0"
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {geoAssets.map((asset: any) => {
                      const color = ASSET_COLORS[asset.category] ?? "#64748B";
                      return (
                        <CircleMarker
                          key={asset.id}
                          center={[asset.latitude, asset.longitude]}
                          radius={9}
                          pathOptions={{
                            fillColor: color,
                            fillOpacity: 0.85,
                            color: color,
                            weight: 2,
                            opacity: 0.9,
                          }}
                        >
                          <Popup>
                            <div className="space-y-0.5 min-w-[140px]">
                              <div className="font-bold text-xs">{asset.identifier}</div>
                              <div className="text-muted-foreground text-[12px]">{asset.category} · {asset.jurisdiction}</div>
                              {asset.estimatedValue != null && (
                                <div className="text-xs font-mono">{formatCurrency(asset.estimatedValue)}</div>
                              )}
                              {asset.address && <div className="text-[12px] text-muted-foreground">{asset.address}</div>}
                              {asset.sourceRegistry && (
                                <div className="text-[11px] opacity-50 mt-1 pt-1 border-t border-border">{asset.sourceRegistry}</div>
                              )}
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                )}
              </div>
              {geoAssets.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-card/40 flex-wrap">
                  {Object.entries(ASSET_COLORS).map(([cat, color]) => {
                    const n = geoAssets.filter((a: any) => a.category === cat).length;
                    if (n === 0) return null;
                    return (
                      <div key={cat} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[12px] font-mono text-muted-foreground">{cat} ({n})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Profile Depth ───────────────────────────────────────────── */}
            <div className="border border-border rounded-lg bg-card/30 flex flex-col">
              <SectionHeader
                icon={<BarChart2 className="w-3.5 h-3.5" />}
                title="Profile Depth"
              />
              <div className="flex-1 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/20" />
                      <circle
                        cx="32" cy="32" r="26" fill="none" strokeWidth="7"
                        stroke={confidence.overall >= 75 ? "var(--color-primary)" : confidence.overall >= 50 ? "#F59E0B" : "#6B7280"}
                        strokeDasharray={`${(confidence.overall / 100) * 163.4} 163.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        confidence.overall >= 75 ? "text-primary" : confidence.overall >= 50 ? "text-[#9CFF1A]" : "text-muted-foreground"
                      )}>
                        {confidence.overall}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-mono font-bold text-foreground mb-1">Overall Confidence</div>
                    <div className="text-[12px] font-mono text-muted-foreground leading-relaxed">
                      {confidence.overall >= 75
                        ? "High-confidence target. Multiple registry verifications confirmed."
                        : confidence.overall >= 50
                        ? "Moderate confidence. Additional attribution verification recommended before access assessment."
                        : "Low confidence. Expand data sources and run registry search first."}
                    </div>
                  </div>
                </div>
                <div className="space-y-3.5 flex-1">
                  <ConfidenceBar label="Identity"  score={confidence.identity}  icon={<UserCheck className="w-3 h-3" />} />
                  <ConfidenceBar label="Financial" score={confidence.financial} icon={<Layers   className="w-3 h-3" />} />
                  <ConfidenceBar label="Network"   score={confidence.network}   icon={<Network  className="w-3 h-3" />} />
                  <ConfidenceBar label="Registry"  score={confidence.registry}  icon={<Globe    className="w-3 h-3" />} />
                  <ConfidenceBar label="Assets"    score={confidence.asset}     icon={<MapPin   className="w-3 h-3" />} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 1.3: All Assets List — always visible when assets exist */}
          {(assets as any[]).length > 0 && (
            <div className="border border-border rounded-lg bg-card/30 overflow-hidden">
              <SectionHeader
                icon={<Layers className="w-3.5 h-3.5" />}
                title="Registered Assets"
                badge={`${(assets as any[]).length} total`}
              />
              <div className="divide-y divide-border/40">
                {(assets as any[]).map((asset: any) => {
                  const color = (ASSET_COLORS as Record<string, string>)[asset.category] ?? "#64748B";
                  return (
                    <div key={asset.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-medium text-foreground">{asset.identifier}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">{asset.category}</span>
                        </div>
                        {asset.description && (
                          <p className="text-[12px] font-mono text-muted-foreground/70 truncate mt-0.5">{asset.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <div className="text-[12px] font-mono text-muted-foreground">{asset.jurisdiction}</div>
                        {asset.estimatedValue != null && (
                          <div className="text-[12px] font-mono text-primary">{formatCurrency(asset.estimatedValue)}</div>
                        )}
                        {(asset.latitude != null) && (
                          <div className="text-[11px] font-mono text-muted-foreground/50">📍 mapped</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 1.5: Intelligence Signals */}
          {(occrpData || skyFlights.length > 0 || occrpLoading || skyLoading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

              {/* ── OCCRP Adverse Media ──────────────────────────────────────── */}
              <div className="border border-border rounded-lg bg-card/30 flex flex-col">
                <SectionHeader
                  icon={<AlertCircle className="w-3.5 h-3.5" />}
                  title="Adverse Media"
                  badge={occrpData ? (occrpData.datasets?.length > 0 ? `${occrpData.datasets.length} datasets` : "No flags") : undefined}
                />
                <div className="p-4">
                  {occrpLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Querying OCCRP Aleph…
                    </div>
                  ) : occrpData ? (
                    <div className="space-y-3">
                      {(() => {
                        const SANCTIONS_RE = /sanction|watchlist|ofac|interpol|fatf|pep|oligarch/i;
                        const flagged = occrpData.datasets?.some((d: string) => SANCTIONS_RE.test(d));
                        return (
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono font-bold",
                            flagged
                              ? "border-red-500/40 bg-red-500/10 text-red-400"
                              : "border-primary/30 bg-primary/5 text-primary"
                          )}>
                            {flagged
                              ? <><AlertCircle className="w-3.5 h-3.5" /> SANCTIONS / WATCHLIST HIT</>
                              : <><CheckCircle2 className="w-3.5 h-3.5" /> No sanctions flags found</>}
                          </div>
                        );
                      })()}
                      {occrpData.datasets?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                            Aleph Datasets ({occrpData.datasets.length})
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {occrpData.datasets.slice(0, 8).map((d: string) => (
                              <span key={d} className="text-[11px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                                {d.replace(/_/g, " ")}
                              </span>
                            ))}
                            {occrpData.datasets.length > 8 && (
                              <span className="text-[11px] font-mono text-muted-foreground">+{occrpData.datasets.length - 8} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      {occrpData.url && (
                        <a href={occrpData.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-mono text-primary hover:underline">
                          <Globe className="w-3 h-3" /> View on OCCRP Aleph
                        </a>
                      )}
                      {occrpData.enrichedAt && (
                        <p className="text-[11px] font-mono text-muted-foreground/50">
                          Last enriched: {new Date(occrpData.enrichedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground/50 italic">
                      No OCCRP Aleph data — run the OCCRP enrichment job from Data Sources.
                    </p>
                  )}
                </div>
              </div>

              {/* ── OpenSky Live Flights ──────────────────────────────────────── */}
              <div className="border border-border rounded-lg bg-card/30 flex flex-col">
                <SectionHeader
                  icon={<Route className="w-3.5 h-3.5" />}
                  title="Live Flight Intel"
                  badge={skyFlights.length > 0 ? `${skyFlights.length} aircraft tracked` : undefined}
                />
                <div className="p-4">
                  {skyLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Querying OpenSky…
                    </div>
                  ) : skyFlights.length > 0 ? (
                    <div className="space-y-3">
                      {skyFlights.map((flight: any) => (
                        <div key={flight.id} className="border border-border rounded p-3 bg-muted/10 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-mono font-bold text-foreground truncate">{flight.name}</span>
                            <span className="text-[12px] font-mono text-[#9CFF1A] flex-shrink-0 border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 px-1.5 py-0.5 rounded">
                              {flight.identifier}
                            </span>
                          </div>
                          {flight.opensky && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {flight.opensky.altitudeFt != null && (
                                <div>
                                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Altitude</div>
                                  <div className="text-xs font-mono text-foreground">{flight.opensky.altitudeFt.toLocaleString()} ft</div>
                                </div>
                              )}
                              {flight.opensky.speedKnots != null && (
                                <div>
                                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Speed</div>
                                  <div className="text-xs font-mono text-foreground">{flight.opensky.speedKnots} kts</div>
                                </div>
                              )}
                              {flight.opensky.originCountry && (
                                <div>
                                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Origin</div>
                                  <div className="text-xs font-mono text-foreground">{flight.opensky.originCountry}</div>
                                </div>
                              )}
                              {flight.opensky.onGround != null && (
                                <div>
                                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Status</div>
                                  <div className={cn("text-xs font-mono", flight.opensky.onGround ? "text-muted-foreground" : "text-primary")}>
                                    {flight.opensky.onGround ? "On ground" : "Airborne ✈"}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {flight.lastActivityDate && (
                            <p className="text-[11px] font-mono text-muted-foreground/50">
                              Last seen: {new Date(flight.lastActivityDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground/50 italic">
                      No live flight data — run the OpenSky enrichment job from Data Sources.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

        </>}

        {/* ═══ NETWORK TAB ════════════════════════════════════════════════ */}
        {activeTab === "network" && <>

          {/* Source Ledger */}
          <div className="border border-border rounded-lg bg-card/30">
            <SectionHeader
              icon={<FileText className="w-3.5 h-3.5" />}
              title="Source Ledger"
              badge={`${ledger.length} data points`}
            />
            {ledger.length === 0 ? (
              <div className="px-4 py-10 text-center text-muted-foreground/40 font-mono text-sm">
                No data points recorded for this entity.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-card/30">
                      {["Category", "Data Point", "Value", "Source Registry", "Status"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap"><CategoryBadge category={entry.category} /></td>
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{entry.dataPoint}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-foreground max-w-xs">
                          <span className="truncate block" title={entry.value}>{entry.value}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] font-mono text-muted-foreground/70 whitespace-nowrap max-w-[200px]">
                          <span className="truncate block" title={entry.source}>{entry.source}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {entry.verified ? (
                            <span className="flex items-center gap-1 text-[12px] font-mono text-primary">
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> Registry
                            </span>
                          ) : (
                            <span className="text-[12px] font-mono text-muted-foreground/40">Unverified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Connections */}
          <div className="border border-border rounded-lg bg-card/30">
            <SectionHeader
              icon={<Link2 className="w-3.5 h-3.5" />}
              title="Connections"
              badge={`${(relationships as any[]).length} linked`}
              action={
                <button
                  onClick={() => setAddRelOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-[12px] uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              }
            />
            {(relationships as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground px-4" data-testid="profile-network-empty">
                <Network className="w-8 h-8 opacity-30" aria-hidden />
                <p className="text-sm font-semibold text-foreground">No connections yet</p>
                <p className="text-[12px] text-center max-w-xs text-muted-foreground leading-relaxed">
                  Link related people, companies, or assets — or run research to discover them.
                </p>
                <p className="text-[12px] font-mono text-center max-w-xs leading-relaxed">
                  Click "Add" to link this entity to another, or run Auto-detect from Data Sources to surface co-ownership signals.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-card/30">
                      {["Target", "Type", "Relationship", "Strength", ""].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {(relationships as any[]).map((rel: any) => (
                      <tr key={rel.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-4 py-2.5">
                          {rel.targetType === "Entity" ? (
                            <Link href={`/profile/${rel.targetId}`} className="text-xs font-mono text-primary hover:underline">
                              {rel.targetName ?? `#${rel.targetId}`}
                            </Link>
                          ) : (
                            <span className="text-xs font-mono text-foreground/70">{rel.targetName ?? `Asset #${rel.targetId}`}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            {rel.targetType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-foreground/80">
                          {(rel.relationshipType as string).replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted/30 overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${(rel.strength ?? 0.5) * 100}%` }} />
                            </div>
                            <span className="text-[12px] font-mono text-muted-foreground">{((rel.strength ?? 0.5) * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteRelationship(rel.id)}
                            disabled={deletingRelId === rel.id}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all disabled:opacity-50"
                            title="Remove relationship"
                          >
                            {deletingRelId === rel.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>}

        {/* ═══ RESEARCH THREADS TAB ════════════════════════════════════════ */}
        {activeTab === "research" && (
          <div className="border border-border rounded-lg bg-card/30">
            <SectionHeader
              icon={<Route className="w-3.5 h-3.5" />}
              title="Research history"
              badge={(sessions as any[]).length > 0 ? `${(sessions as any[]).length} session${(sessions as any[]).length !== 1 ? "s" : ""}` : undefined}
              action={
                <button
                  type="button"
                  onClick={handleRunResearch}
                  disabled={isEnriching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[12px] uppercase tracking-wider hover:bg-primary/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isEnriching
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Play className="w-3 h-3" />}
                  {isEnriching ? "Digging…" : "Dig contacts"}
                </button>
              }
            />

            {(sessions as any[]).length === 0 && !isEnriching && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground px-4" data-testid="profile-research-empty">
                <TargetIcon className="w-10 h-10 opacity-30" aria-hidden />
                <p className="text-sm font-semibold text-foreground">No dig runs yet</p>
                <p className="text-[12px] text-center max-w-sm leading-relaxed text-muted-foreground">
                  Dig contacts runs free Atlas research on this person and promotes public routes onto the card.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleRunResearch}
                    disabled={isEnriching}
                    className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    Run research
                  </button>
                  <Link
                    href="/reactor"
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Open Reactor
                  </Link>
                </div>
              </div>
            )}

            {isEnriching && (
              <div className="flex items-center justify-center py-12 gap-3 text-primary/80">
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                <span className="text-sm">Searching public sources…</span>
              </div>
            )}

            {!isEnriching && (sessions as any[]).length > 0 && (
              <div className="p-4 md:p-6 space-y-6">

                {(sessions as any[]).length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-mono text-muted-foreground uppercase tracking-widest">Session:</span>
                    {(sessions as any[]).slice(0, 6).map((s: any, i: number) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedIdx(i); }}
                        className={cn(
                          "px-2.5 py-1 rounded border font-mono text-[12px] uppercase transition-colors",
                          selectedIdx === i
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        #{s.id} · {new Date(s.createdAt).toLocaleDateString()}
                      </button>
                    ))}
                  </div>
                )}

                {selectedSession && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={cn(
                        "text-[12px] font-mono font-bold px-2.5 py-1 rounded border uppercase",
                        "text-[#9CFF1A] bg-[#9CFF1A]/10 border-[#9CFF1A]/30",
                      )}>
                        Research Review
                      </span>
                      {selectedSession.pathScore != null && (
                        <span className="text-[12px] font-mono text-muted-foreground">
                          Path score: <span className="text-foreground font-bold">{(selectedSession.pathScore * 100).toFixed(0)}%</span>
                        </span>
                      )}
                      {selectedSession.bayesianScoreAtRuntime != null && (
                        <span className="text-[12px] font-mono text-muted-foreground">
                          Bayesian: <span className="text-foreground font-bold">{(selectedSession.bayesianScoreAtRuntime * 100).toFixed(0)}</span>
                        </span>
                      )}
                      <span className="text-[12px] font-mono text-muted-foreground">
                        {new Date(selectedSession.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {winningPath.length > 0 && (
                      <div>
                        <div className="text-[12px] font-mono text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Route className="w-3 h-3" /> Winning Path · {winningPath.length} Nodes
                        </div>
                        <div className="flex items-start gap-0 flex-wrap gap-y-2 overflow-x-auto pb-1">
                          {winningPath.map((step, i) => (
                            <div key={step.vertexId + i} className="flex items-center gap-0 flex-shrink-0">
                              <div className={cn(
                                "flex flex-col gap-0.5 px-3 py-2 rounded border font-mono min-w-[100px] max-w-[180px]",
                                roleStyle(step.role),
                              )}>
                                <div className="flex items-center gap-1">
                                  {roleIcon(step.role)}
                                  <span className="text-[11px] uppercase tracking-wider opacity-60 font-bold">{step.role}</span>
                                </div>
                                <span className="font-semibold text-[11px] leading-tight">{step.label}</span>
                                {step.contactMethod && <span className="text-[11px] opacity-50 leading-tight">{step.contactMethod}</span>}
                                {step.actionRequired && <span className="text-[11px] opacity-70 leading-tight italic">{step.actionRequired}</span>}
                              </div>
                              {i < winningPath.length - 1 && (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mx-1 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {mctsSteps.length > 0 && (
                      <div>
                        <div className="text-[12px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                          {mctsSteps.length} UCT Iterations
                        </div>
                        <div className="border border-border/50 rounded overflow-hidden">
                          <div className="grid grid-cols-4 border-b border-border/50 bg-card/60">
                            {["Step", "Action", "Registry", "UCT Score"].map((h) => (
                              <div key={h} className="px-3 py-1.5 text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{h}</div>
                            ))}
                          </div>
                          <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
                            {mctsSteps.map((step: any, i: number) => (
                              <div key={i} className="grid grid-cols-4 hover:bg-muted/10">
                                <div className="px-3 py-2 text-[12px] font-mono text-muted-foreground">{step.step}</div>
                                <div className="px-3 py-2 text-[12px] font-mono text-foreground">{step.action}</div>
                                <div className="px-3 py-2 text-[12px] font-mono text-secondary/80">{step.registry}</div>
                                <div className="px-3 py-2 text-[12px] font-mono text-[#9CFF1A]">{step.uctScore?.toFixed(3) ?? "—"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>
        )}


      </div>

      {/* Mobile Action Bar */}
      <div className="md:hidden shrink-0 h-[72px] bg-background border-t border-border px-4 flex items-center gap-3 z-20">
        <button
          onClick={handleEnrich}
          disabled={isEnriching}
          className="flex-1 h-[44px] bg-primary text-primary-foreground rounded font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          {isEnriching ? "Running…" : "Rerun Research"}
        </button>
        <Link
          href={`/graph?entity=${entity.id}`}
          className="w-[44px] h-[44px] shrink-0 bg-card border border-border text-foreground rounded flex items-center justify-center"
        >
          <Network className="w-5 h-5" />
        </Link>
      </div>

    {/* ── Add Relationship Dialog ─────────────────────────────────────────── */}
    <Dialog open={addRelOpen} onOpenChange={(o) => { setAddRelOpen(o); if (!o) { setRelError(null); setRelSearchResults([]); setRelTargetId(null); setRelTargetName(""); setRelSearchQ(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-widest uppercase flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Add Relationship
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-[12px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Target Type</label>
            <div className="flex gap-2">
              {(["Entity", "Asset"] as const).map((t) => (
                <button key={t}
                  onClick={() => { setRelTargetType(t); setRelTargetId(null); setRelTargetName(""); setRelSearchResults([]); setRelSearchQ(""); }}
                  className={cn("flex-1 py-1.5 rounded border font-mono text-[11px] uppercase tracking-wider transition-colors",
                    relTargetType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="relative">
            <label className="text-[12px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Target {relTargetType}</label>
            <input
              value={relTargetId ? relTargetName : relSearchQ}
              onChange={(e) => { setRelTargetId(null); setRelTargetName(""); handleRelSearch(e.target.value); }}
              placeholder={`Search ${relTargetType.toLowerCase()}s…`}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
            />
            {relSearchResults.length > 0 && !relTargetId && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded shadow-xl z-50 max-h-48 overflow-y-auto">
                {relSearchResults.map((r) => (
                  <button key={r.id} onClick={() => { setRelTargetId(r.id); setRelTargetName(r.name); setRelSearchResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm font-mono text-foreground hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                    {formatEntityName(r.name)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[12px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Relationship Type</label>
            <select value={relType} onChange={(e) => setRelType(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono text-foreground focus:border-primary/50 focus:outline-none">
              {["KNOWS","OWNS","CONTROLS","ASSOCIATES_WITH","EMPLOYED_BY","DIRECTS","FAMILY_OF"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-mono text-muted-foreground uppercase tracking-wider">Strength</label>
              <span className="text-[12px] font-mono text-foreground font-bold">{(relStrength * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0.1} max={1.0} step={0.05} value={relStrength}
              onChange={(e) => setRelStrength(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5"><span>Weak</span><span>Strong</span></div>
          </div>

          <div>
            <label className="text-[12px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
            <textarea value={relNotes} onChange={(e) => setRelNotes(e.target.value)} rows={2}
              placeholder="Source of this relationship, evidence…"
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none resize-none" />
          </div>

          {relError && <p className="text-xs font-mono text-red-400">{relError}</p>}
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <button className="px-4 py-2 rounded border border-border text-muted-foreground font-mono text-xs uppercase tracking-wider hover:text-foreground transition-colors">Cancel</button>
          </DialogClose>
          <button onClick={handleSaveRelationship} disabled={relSaving || !relTargetId}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary/20 border border-primary/40 text-primary font-mono text-xs uppercase tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {relSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {relSaving ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
