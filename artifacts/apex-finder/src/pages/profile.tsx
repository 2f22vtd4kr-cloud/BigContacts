import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  useGetEntity,
  useListAssets,
  useListRelationships,
  useListResearchSessions,
  useRunResearch,
  useGeneratePitch,
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
} from "lucide-react";
import { cn, formatCurrency, ScoreBadge } from "@/lib/utils";
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

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  HNWI:        <UserCheck className="w-3.5 h-3.5" />,
  Corporation: <Building2 className="w-3.5 h-3.5" />,
  Trust:       <Briefcase className="w-3.5 h-3.5" />,
  Gatekeeper:  <Shield className="w-3.5 h-3.5" />,
};

const ASSET_COLORS: Record<string, string> = {
  Aviation:     "#3B82F6",
  RealEstate:   "#10B981",
  Marine:       "#06B6D4",
  PrivateClub:  "#A855F7",
};

const CRM_COLORS: Record<string, string> = {
  "New Lead":        "text-primary bg-primary/10 border-primary/30",
  "In Research":     "text-secondary bg-secondary/10 border-secondary/30",
  "Pitch Generated": "text-amber-400 bg-amber-400/10 border-amber-400/30",
  Contacted:         "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "In Negotiation":  "text-purple-400 bg-purple-400/10 border-purple-400/30",
  Closed:            "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const CAT_COLORS: Record<string, string> = {
  Identity: "text-primary bg-primary/10",
  Financial: "text-emerald-400 bg-emerald-400/10",
  Network:  "text-blue-400 bg-blue-400/10",
  Asset:    "text-secondary bg-secondary/10",
  Registry: "text-amber-400 bg-amber-400/10",
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

function buildLedger(entity: any, assets: any[], relationships: any[]): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  let srcRegs: string[] = [];
  try { srcRegs = JSON.parse(entity.sourceRegistries ?? "[]"); } catch {}
  const primarySrc = srcRegs[0] ?? "Manual Entry";
  const hasRegistry = srcRegs.length > 0;

  if (entity.name)             entries.push({ id: "name",  category: "Identity",  dataPoint: "Full Name",         value: entity.name,              source: primarySrc,   verified: hasRegistry });
  if (entity.nationality)      entries.push({ id: "nat",   category: "Identity",  dataPoint: "Nationality",       value: entity.nationality,       source: primarySrc,   verified: hasRegistry });
  if (entity.knownResidences)  entries.push({ id: "res",   category: "Identity",  dataPoint: "Known Residences",  value: entity.knownResidences,   source: primarySrc,   verified: hasRegistry });
  if (entity.contactMethod)    entries.push({ id: "cm",    category: "Identity",  dataPoint: "Contact Vector",    value: entity.contactMethod,     source: "Internal",   verified: false });
  if (entity.phone)            entries.push({ id: "phone", category: "Identity",  dataPoint: "Phone",             value: entity.phone,             source: "Internal",   verified: false });
  if (entity.email)            entries.push({ id: "email", category: "Identity",  dataPoint: "Email",             value: entity.email,             source: "Internal",   verified: false });
  if (entity.estimatedNetWorth != null)
    entries.push({ id: "nw", category: "Financial", dataPoint: "Est. Net Worth / AUM", value: formatCurrency(entity.estimatedNetWorth), source: primarySrc, verified: hasRegistry });

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
  if (role === "GATEKEEPER") return <Shield className="w-3 h-3 text-amber-500" />;
  if (role === "ASSET")      return <GitBranch className="w-3 h-3 text-secondary" />;
  return <ChevronRight className="w-3 h-3 text-muted-foreground" />;
}

function roleStyle(role: string) {
  if (role === "TARGET")     return "border-primary/40 bg-primary/5 text-primary";
  if (role === "GATEKEEPER") return "border-amber-500/40 bg-amber-500/5 text-amber-400";
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
        {badge && <span className="text-[10px] font-mono text-muted-foreground">{badge}</span>}
        {action}
      </div>
    </div>
  );
}

function ConfidenceBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const barCls = score >= 75 ? "bg-primary" : score >= 50 ? "bg-amber-500" : score >= 25 ? "bg-orange-600" : "bg-muted-foreground/30";
  const txtCls = score >= 75 ? "text-primary" : score >= 50 ? "text-amber-500" : "text-muted-foreground";
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

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap", CAT_COLORS[category] ?? "text-muted-foreground bg-muted")}>
      {category}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApexProfile() {
  const params = useParams<{ id: string }>();
  const entityId = parseInt(params.id ?? "0", 10);

  const { data: entity, isLoading, refetch: refetchEntity } = useGetEntity(entityId);
  const { data: assets = []       } = useListAssets({ entityId });
  const { data: relationships = [], refetch: refetchRelationships } = useListRelationships({ entityId });
  const { data: sessions = [],  refetch: refetchSessions } = useListResearchSessions({ entityId, limit: 10 });

  const runResearch       = useRunResearch();
  const generatePitch     = useGeneratePitch();
  const createRelationship = useCreateRelationship();
  const deleteRelationship = useDeleteRelationship();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pitchingId, setPitchingId]   = useState<number | null>(null);
  const [pitchExpanded, setPitchExpanded] = useState(false);
  const [isEnriching, setIsEnriching]     = useState(false);
  const [enrichError, setEnrichError]     = useState<string | null>(null);
  const [enrichDone, setEnrichDone]       = useState(false);
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
      .then((r) => r.json())
      .then((d) => { setOccrpData(d.aleph ?? null); })
      .catch(() => {})
      .finally(() => setOccrpLoading(false));
    setSkyLoading(true);
    fetch(`${base}/api/entities/${entityId}/opensky`)
      .then((r) => r.json())
      .then((d) => { setSkyFlights(d.flights ?? []); })
      .catch(() => {})
      .finally(() => setSkyLoading(false));
  }, [entityId]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="font-mono text-sm text-muted-foreground">Entity not found.</p>
        <Link href="/entities" className="text-xs font-mono text-primary hover:underline">← Back to Ledger</Link>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const typeColor  = TYPE_COLORS[entity.type] ?? "#64748B";
  let srcRegs: string[] = [];
  try { srcRegs = JSON.parse((entity as any).sourceRegistries ?? "[]"); } catch {}

  const geoAssets  = (assets as any[]).filter((a) => a.latitude != null && a.longitude != null);
  const confidence = computeConfidence(entity, assets as any[], relationships as any[]);
  const ledger     = buildLedger(entity, assets as any[], relationships as any[]);

  const mapCenter: [number, number] = geoAssets.length > 0
    ? [
        geoAssets.reduce((s: number, a: any) => s + a.latitude,  0) / geoAssets.length,
        geoAssets.reduce((s: number, a: any) => s + a.longitude, 0) / geoAssets.length,
      ]
    : [20, 0];

  const selectedSession = (sessions as any[])[selectedIdx] ?? null;
  let winningPath: PathStep[] = [];
  let mctsSteps:   any[]      = [];
  let pitchData:   any[]      = [];
  try { winningPath = selectedSession ? JSON.parse(selectedSession.winningPath ?? "[]") : []; } catch {}
  try { mctsSteps   = selectedSession ? JSON.parse(selectedSession.mctsSteps   ?? "[]") : []; } catch {}
  try { pitchData   = selectedSession?.generatedPitch ? JSON.parse(selectedSession.generatedPitch) : []; } catch {}

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRunResearch = () => {
    runResearch.mutate(
      { data: { entityId, depth: 4 } },
      { onSuccess: () => { refetchSessions(); setSelectedIdx(0); } },
    );
  };

  const handleGeneratePitch = (sid: number) => {
    setPitchingId(sid);
    generatePitch.mutate(
      { id: sid },
      {
        onSuccess: () => { setPitchingId(null); setPitchExpanded(true); refetchSessions(); },
        onError:   () => setPitchingId(null),
      },
    );
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichError(null);
    setEnrichDone(false);
    try {
      const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/ingest/companies-house-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds: [entityId], batchSize: 1 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Request failed");
      const { jobId } = data;
      let attempts = 0;
      const poll = async () => {
        if (attempts > 30) { setIsEnriching(false); setEnrichError("Timed out"); return; }
        attempts++;
        try {
          const jr = await fetch(`${base}/api/ingest/job/${jobId}`);
          const job = await jr.json();
          if (job.status === "done") {
            setIsEnriching(false); setEnrichDone(true); refetchEntity(); return;
          }
          if (job.status === "failed") {
            setIsEnriching(false); setEnrichError(job.message ?? "Enrichment failed"); return;
          }
        } catch { /* ignore poll errors */ }
        setTimeout(poll, 2_000);
      };
      setTimeout(poll, 2_000);
    } catch (err: any) {
      setIsEnriching(false);
      setEnrichError(err.message ?? "Enrichment failed");
    }
  };

  // ── Relationship handlers ──────────────────────────────────────────────────

  const handleRelSearch = async (q: string) => {
    setRelSearchQ(q);
    if (!q.trim()) { setRelSearchResults([]); return; }
    try {
      const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/entities?search=${encodeURIComponent(q)}&limit=20`);
      const d = await r.json();
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
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card/60 px-4 md:px-6 py-4">
        <div className="flex items-start gap-3 md:gap-4">
          <Link
            href="/entities"
            className="mt-0.5 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {(entity as any).isHot && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                  <ShieldAlert className="w-3 h-3" /> Hot Lead
                </span>
              )}
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                Apex Profile Card
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-none mb-2">
              {entity.name}
            </h1>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1"
                style={{ color: typeColor, backgroundColor: typeColor + "1A" }}
              >
                {TYPE_ICONS[entity.type]} {entity.type}
              </span>
              {(entity as any).nationality && (
                <span className="text-xs text-muted-foreground font-mono">{(entity as any).nationality}</span>
              )}
              {(entity as any).estimatedNetWorth && (
                <span className="text-xs font-mono text-foreground">{formatCurrency((entity as any).estimatedNetWorth)}</span>
              )}
              {srcRegs.slice(0, 3).map((r) => (
                <span key={r} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <ScoreBadge score={entity.bayesianScore} />
            <div className="flex items-center gap-1.5">
              <Link
                href={`/graph?entity=${entity.id}`}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase tracking-wider transition-colors"
                title="Network Graph"
              >
                <Network className="w-3 h-3" /> <span className="hidden sm:inline">Graph</span>
              </Link>
              <Link
                href={`/research?entity=${entity.id}`}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase tracking-wider transition-colors"
                title="MCTS Terminal"
              >
                <TargetIcon className="w-3 h-3" /> <span className="hidden sm:inline">MCTS</span>
              </Link>
              <Link
                href="/crm"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase tracking-wider transition-colors"
                title="Pipeline CRM"
              >
                <KanbanSquare className="w-3 h-3" /> <span className="hidden sm:inline">CRM</span>
              </Link>
              <button
                onClick={() => setAddRelOpen(true)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors"
                title="Add Connection"
              >
                <Link2 className="w-3 h-3" /> <span className="hidden sm:inline">Connect</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Direct Contact Bar (always visible) ──────────────────────────── */}
      {(() => {
        const e = entity as any;
        const hasContact = !!(e.email || e.phone || e.linkedinUrl);
        const conf =
          (e.email    ? 40 : 0) +
          (e.phone    ? 30 : 0) +
          (e.linkedinUrl ? 20 : 0) +
          (e.knownResidences && e.knownResidences !== "[]" ? 10 : 0);
        const confCls =
          conf >= 60 ? "text-primary border-primary/30 bg-primary/10"
          : conf >= 30 ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
          : "text-muted-foreground border-border bg-muted/20";
        return (
          <div className={cn("flex-shrink-0 border-b border-border px-4 md:px-6 py-3", hasContact && "bg-primary/5")}>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-widest whitespace-nowrap">Direct Contact Vectors</span>
                <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap", confCls)}>
                  {conf}% confidence
                </span>
              </div>
              <button
                onClick={handleEnrich}
                disabled={isEnriching}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isEnriching ? "Enriching…" : enrichDone ? "Re-enrich" : "Enrich"}
              </button>
            </div>
            {hasContact ? (
              <div className="flex items-center gap-2 flex-wrap">
                {e.email && (
                  <a href={`mailto:${e.email}`} className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/10 text-primary font-mono text-xs hover:bg-primary/20 transition-colors min-w-0 max-w-[220px] sm:max-w-none">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{e.email}</span>
                  </a>
                )}
                {e.phone && (
                  <a href={`tel:${e.phone}`} className="flex items-center gap-2 px-3 py-1.5 rounded border border-secondary/30 bg-secondary/10 text-secondary font-mono text-xs hover:bg-secondary/20 transition-colors">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {e.phone}
                  </a>
                )}
                {e.linkedinUrl && (
                  <a href={e.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded border border-blue-400/30 bg-blue-400/10 text-blue-400 font-mono text-xs hover:bg-blue-400/20 transition-colors">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn Profile
                  </a>
                )}
                {e.contactMethod && (
                  <span className="px-2.5 py-1.5 rounded border border-border text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                    Preferred: {e.contactMethod}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs font-mono text-muted-foreground/50 italic">
                {isEnriching
                  ? "Querying Companies House officer records…"
                  : enrichDone
                  ? "Enrichment complete — no public contact data found for this entity."
                  : "No direct contact data. Click Enrich to query Companies House officer records."}
              </p>
            )}
            {enrichError && (
              <p className="text-xs font-mono text-red-400 mt-1.5">{enrichError}</p>
            )}
          </div>
        );
      })()}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Row 1: Mini-map + Confidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* ── Asset Mini-Map ──────────────────────────────────────────── */}
          <div className="border border-border rounded-lg overflow-hidden bg-card/30 flex flex-col">
            <SectionHeader
              icon={<MapPin className="w-3.5 h-3.5" />}
              title="Asset Footprint"
              badge={`${geoAssets.length} geolocated`}
            />
            <div className="relative flex-1" style={{ minHeight: "300px", height: "300px" }}>
              {geoAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40 px-4 text-center">
                  <MapPin className="w-8 h-8 opacity-20" />
                  <p className="text-xs font-mono">No geolocated assets</p>
                  <p className="text-[10px] font-mono leading-relaxed">
                    Run the FAA or HNWI ingestor to populate asset coordinates for this entity.
                  </p>
                </div>
              ) : (
                <MapContainer
                  center={mapCenter}
                  zoom={geoAssets.length > 1 ? 3 : 5}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
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
                            <div className="text-muted-foreground text-[10px]">{asset.category} · {asset.jurisdiction}</div>
                            {asset.estimatedValue != null && (
                              <div className="text-xs font-mono">{formatCurrency(asset.estimatedValue)}</div>
                            )}
                            {asset.address && <div className="text-[10px] text-muted-foreground">{asset.address}</div>}
                            {asset.sourceRegistry && (
                              <div className="text-[9px] opacity-50 mt-1 pt-1 border-t border-border">{asset.sourceRegistry}</div>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
            {/* Legend */}
            {geoAssets.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-card/40 flex-wrap">
                {Object.entries(ASSET_COLORS).map(([cat, color]) => {
                  const n = geoAssets.filter((a: any) => a.category === cat).length;
                  if (n === 0) return null;
                  return (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-mono text-muted-foreground">{cat} ({n})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Confidence Breakdown ────────────────────────────────────── */}
          <div className="border border-border rounded-lg bg-card/30 flex flex-col">
            <SectionHeader
              icon={<BarChart2 className="w-3.5 h-3.5" />}
              title="Confidence Breakdown"
            />
            <div className="flex-1 p-4 flex flex-col gap-4">
              {/* Overall ring */}
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
                      confidence.overall >= 75 ? "text-primary" : confidence.overall >= 50 ? "text-amber-500" : "text-muted-foreground"
                    )}>
                      {confidence.overall}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-mono font-bold text-foreground mb-1">Overall Confidence</div>
                  <div className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                    {confidence.overall >= 75
                      ? "High-confidence target. Multiple registry verifications confirmed."
                      : confidence.overall >= 50
                      ? "Moderate confidence. Additional verification recommended before outreach."
                      : "Low confidence. Expand data sources and run registry search first."}
                  </div>
                </div>
              </div>

              {/* Category bars */}
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

        {/* Row 1.5: Intelligence Signals — OCCRP Adverse Media + OpenSky Live Flights */}
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
                    {/* Sanctions / watchlist flag */}
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
                    {/* Dataset list */}
                    {occrpData.datasets?.length > 0 && (
                      <div>
                        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                          Aleph Datasets ({occrpData.datasets.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {occrpData.datasets.slice(0, 8).map((d: string) => (
                            <span key={d} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                              {d.replace(/_/g, " ")}
                            </span>
                          ))}
                          {occrpData.datasets.length > 8 && (
                            <span className="text-[9px] font-mono text-muted-foreground">+{occrpData.datasets.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Aleph link */}
                    {occrpData.url && (
                      <a
                        href={occrpData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary hover:underline"
                      >
                        <Globe className="w-3 h-3" /> View on OCCRP Aleph
                      </a>
                    )}
                    {occrpData.enrichedAt && (
                      <p className="text-[9px] font-mono text-muted-foreground/50">
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
                          <span className="text-[10px] font-mono text-blue-400 flex-shrink-0 border border-blue-400/30 bg-blue-400/10 px-1.5 py-0.5 rounded">
                            {flight.identifier}
                          </span>
                        </div>
                        {flight.opensky && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {flight.opensky.altitudeFt != null && (
                              <div>
                                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Altitude</div>
                                <div className="text-xs font-mono text-foreground">{flight.opensky.altitudeFt.toLocaleString()} ft</div>
                              </div>
                            )}
                            {flight.opensky.speedKnots != null && (
                              <div>
                                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Speed</div>
                                <div className="text-xs font-mono text-foreground">{flight.opensky.speedKnots} kts</div>
                              </div>
                            )}
                            {flight.opensky.originCountry && (
                              <div>
                                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Origin</div>
                                <div className="text-xs font-mono text-foreground">{flight.opensky.originCountry}</div>
                              </div>
                            )}
                            {flight.opensky.onGround != null && (
                              <div>
                                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Status</div>
                                <div className={cn("text-xs font-mono", flight.opensky.onGround ? "text-muted-foreground" : "text-primary")}>
                                  {flight.opensky.onGround ? "On ground" : "Airborne ✈"}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {flight.lastActivityDate && (
                          <p className="text-[9px] font-mono text-muted-foreground/50">
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

        {/* Row 2: Source Ledger */}
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-card/30">
                    {["Category", "Data Point", "Value", "Source Registry", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <CategoryBadge category={entry.category} />
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {entry.dataPoint}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-foreground max-w-xs">
                        <span className="truncate block" title={entry.value}>{entry.value}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-muted-foreground/70 whitespace-nowrap max-w-[200px]">
                        <span className="truncate block" title={entry.source}>{entry.source}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {entry.verified ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> Registry
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground/40">Unverified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row 2.5: Connections */}
        <div className="border border-border rounded-lg bg-card/30">
          <SectionHeader
            icon={<Link2 className="w-3.5 h-3.5" />}
            title="Connections"
            badge={`${(relationships as any[]).length} linked`}
            action={
              <button
                onClick={() => setAddRelOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            }
          />
          {(relationships as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground/40">
              <Network className="w-8 h-8 opacity-20" />
              <p className="text-xs font-mono">No connections yet</p>
              <p className="text-[10px] font-mono text-center max-w-xs leading-relaxed">
                Click "Add" to link this entity to another, or run Auto-detect from Data Sources to surface co-ownership signals.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-card/30">
                    {["Target", "Type", "Relationship", "Strength", ""].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
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
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
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
                          <span className="text-[10px] font-mono text-muted-foreground">{((rel.strength ?? 0.5) * 100).toFixed(0)}%</span>
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

        {/* Row 3: Outreach Strategy Panel */}
        <div className="border border-border rounded-lg bg-card/30">
          <SectionHeader
            icon={<Route className="w-3.5 h-3.5" />}
            title="Outreach Strategy"
            badge={(sessions as any[]).length > 0 ? `${(sessions as any[]).length} session${(sessions as any[]).length !== 1 ? "s" : ""}` : undefined}
            action={
              <button
                onClick={handleRunResearch}
                disabled={runResearch.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] uppercase tracking-wider hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {runResearch.isPending
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Play className="w-3 h-3" />}
                {runResearch.isPending ? "Computing…" : "Run MCTS"}
              </button>
            }
          />

          {/* No sessions */}
          {(sessions as any[]).length === 0 && !runResearch.isPending && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground/40">
              <TargetIcon className="w-10 h-10 opacity-20" />
              <p className="text-sm font-mono">No research sessions yet</p>
              <p className="text-[11px] font-mono text-center max-w-sm leading-relaxed">
                Run an MCTS analysis to compute the optimal approach path, gatekeeper mapping,
                and personalized outreach sequence for this entity.
              </p>
            </div>
          )}

          {/* Computing state */}
          {runResearch.isPending && (
            <div className="flex items-center justify-center py-12 gap-3 text-primary/60">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">Running MCTS path computation…</span>
            </div>
          )}

          {/* Sessions present */}
          {!runResearch.isPending && (sessions as any[]).length > 0 && (
            <div className="p-4 md:p-6 space-y-6">

              {/* Session selector */}
              {(sessions as any[]).length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Session:</span>
                  {(sessions as any[]).slice(0, 6).map((s: any, i: number) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedIdx(i); setPitchExpanded(false); }}
                      className={cn(
                        "px-2.5 py-1 rounded border font-mono text-[10px] uppercase transition-colors",
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

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn(
                      "text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase",
                      CRM_COLORS[selectedSession.crmStatus] ?? "text-muted-foreground border-border",
                    )}>
                      {selectedSession.crmStatus}
                    </span>
                    {selectedSession.pathScore != null && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Path score: <span className="text-foreground font-bold">{(selectedSession.pathScore * 100).toFixed(0)}%</span>
                      </span>
                    )}
                    {selectedSession.bayesianScoreAtRuntime != null && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Bayesian: <span className="text-foreground font-bold">{(selectedSession.bayesianScoreAtRuntime * 100).toFixed(0)}</span>
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(selectedSession.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Winning path chain */}
                  {winningPath.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
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
                                <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">{step.role}</span>
                              </div>
                              <span className="font-semibold text-[11px] leading-tight">{step.label}</span>
                              {step.contactMethod && (
                                <span className="text-[9px] opacity-50 leading-tight">{step.contactMethod}</span>
                              )}
                              {step.actionRequired && (
                                <span className="text-[9px] opacity-70 leading-tight italic">{step.actionRequired}</span>
                              )}
                            </div>
                            {i < winningPath.length - 1 && (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mx-1 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MCTS steps table */}
                  {mctsSteps.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                        {mctsSteps.length} MCTS Iterations
                      </div>
                      <div className="border border-border/50 rounded overflow-hidden">
                        <div className="grid grid-cols-4 border-b border-border/50 bg-card/60">
                          {["Step", "Action", "Registry", "UCT Score"].map((h) => (
                            <div key={h} className="px-3 py-1.5 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                              {h}
                            </div>
                          ))}
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-border/30">
                          {mctsSteps.map((step: any, i: number) => (
                            <div key={i} className="grid grid-cols-4 hover:bg-muted/10">
                              <div className="px-3 py-2 text-[10px] font-mono text-muted-foreground">{step.step}</div>
                              <div className="px-3 py-2 text-[10px] font-mono text-foreground">{step.action}</div>
                              <div className="px-3 py-2 text-[10px] font-mono text-secondary/80">{step.registry}</div>
                              <div className="px-3 py-2 text-[10px] font-mono text-amber-400">{step.uctScore?.toFixed(3) ?? "—"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pitch section */}
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-card/60 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-mono font-bold text-foreground uppercase tracking-widest">
                          Outreach Sequence
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedSession.generatedPitch && (
                          <button
                            onClick={() => setPitchExpanded(!pitchExpanded)}
                            className="text-[10px] font-mono text-primary hover:underline"
                          >
                            {pitchExpanded ? "Collapse" : "Expand"}
                          </button>
                        )}
                        {!selectedSession.generatedPitch && (
                          <button
                            onClick={() => handleGeneratePitch(selectedSession.id)}
                            disabled={pitchingId === selectedSession.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase tracking-wider hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                          >
                            {pitchingId === selectedSession.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Sparkles className="w-3 h-3" />}
                            Generate Sequence
                          </button>
                        )}
                      </div>
                    </div>

                    {!selectedSession.generatedPitch && pitchingId !== selectedSession.id && (
                      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground/40">
                        <Sparkles className="w-4 h-4 opacity-20" />
                        <p className="text-xs font-mono">
                          Generate a personalized multi-step outreach sequence from this MCTS winning path
                        </p>
                      </div>
                    )}

                    {pitchingId === selectedSession.id && (
                      <div className="flex items-center justify-center py-8 gap-2 text-amber-400/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <p className="text-xs font-mono">Generating outreach sequence…</p>
                      </div>
                    )}

                    {selectedSession.generatedPitch && !pitchExpanded && (
                      <div className="px-4 py-3 flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-mono">
                          Outreach sequence generated · {pitchData.length || "—"} messages
                        </span>
                        <button onClick={() => setPitchExpanded(true)} className="text-xs font-mono text-primary hover:underline ml-1">
                          View →
                        </button>
                      </div>
                    )}

                    {selectedSession.generatedPitch && pitchExpanded && pitchData.length > 0 && (
                      <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
                        {pitchData.map((msg: any, i: number) => (
                          <div key={i} className="px-4 py-3.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                                {msg.channel ?? `Step ${i + 1}`}
                              </span>
                              {msg.subject && (
                                <span className="text-[10px] font-mono text-foreground/80">{msg.subject}</span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap">
                              {msg.body ?? msg.message ?? JSON.stringify(msg)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedSession.generatedPitch && pitchExpanded && pitchData.length === 0 && (
                      <div className="px-4 py-4">
                        <pre className="text-xs font-mono text-foreground/70 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                          {selectedSession.generatedPitch}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Target Type</label>
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
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Target {relTargetType}</label>
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
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Relationship Type</label>
            <select value={relType} onChange={(e) => setRelType(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono text-foreground focus:border-primary/50 focus:outline-none">
              {["KNOWS","OWNS","CONTROLS","ASSOCIATES_WITH","EMPLOYED_BY","DIRECTS","FAMILY_OF"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Strength</label>
              <span className="text-[10px] font-mono text-foreground font-bold">{(relStrength * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0.1} max={1.0} step={0.05} value={relStrength}
              onChange={(e) => setRelStrength(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>Weak</span><span>Strong</span></div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
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
