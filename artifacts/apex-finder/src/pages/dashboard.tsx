import { useGetDashboardStats, useGetMapData, useGetHotLeads } from "@workspace/api-client-react";
import {
  ShieldAlert, MapPin, Database, ChevronRight, Activity, AlertTriangle,
  Globe, Radio, Zap, Users, Play, Loader2, CheckCircle2, XCircle, RefreshCw,
  Mail, Phone,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { formatCurrency, ScoreBadge } from "@/lib/utils";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function createCustomIcon(category: string) {
  let colorClass = "marker-blue";
  if (category === "RealEstate") colorClass = "marker-emerald";
  else if (category === "Marine") colorClass = "marker-amber";
  else if (category === "Aviation") colorClass = "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]";
  return L.divIcon({
    className: "bg-transparent",
    html: `<div class="w-3 h-3 rounded-full ${colorClass} border border-background"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function MapInvalidator({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => map.invalidateSize(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [active, map]);
  return null;
}

function getTypeBadgeStyles(type: string) {
  const t = type?.toLowerCase() || "";
  if (t.includes("hnwi") || t.includes("person")) return "text-violet-400 border-violet-400/20 bg-violet-400/10";
  if (t.includes("corp") || t.includes("company")) return "text-blue-400 border-blue-400/20 bg-blue-400/10";
  if (t.includes("trust")) return "text-amber-400 border-amber-400/20 bg-amber-400/10";
  if (t.includes("american")) return "text-rose-400 border-rose-400/20 bg-rose-400/10";
  return "text-muted-foreground border-border bg-card";
}

// ── Ingestion Engine Panel ────────────────────────────────────────────────────

interface JobState {
  jobId?: string;
  status: "idle" | "queued" | "running" | "done" | "failed";
  progress: number;
  inserted: number;
  skipped: number;
  errors: number;
  message: string;
  log: string[];
  dedupCount: number;
}

const EMPTY_JOB: JobState = {
  status: "idle", progress: 0, inserted: 0, skipped: 0, errors: 0,
  message: "", log: [], dedupCount: 0,
};

interface IngestionPanelProps {
  onComplete: () => void;
  source?: "western-hnwi" | "faa";
  autoStart?: "western-hnwi" | "faa";
}

function IngestionPanel({ onComplete, source = "western-hnwi", autoStart }: IngestionPanelProps) {
  const [job, setJob] = useState<JobState>(EMPTY_JOB);
  const [targetCount, setTargetCount] = useState(5000);
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartedRef = useRef(false);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const resp = await fetch(`/api/ingest/job/${jobId}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setJob((prev) => ({
        ...prev,
        jobId,
        status: data.status,
        progress: data.progress ?? 0,
        inserted: data.inserted ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? 0,
        message: data.message ?? "",
        log: data.log ?? [],
        dedupCount: data.dedupCount ?? 0,
      }));
      if (data.status === "done" || data.status === "failed") {
        stopPolling();
        onComplete();
      }
    } catch { /* non-fatal */ }
  }, [onComplete]);

  const startIngestion = async (overrideSource?: "western-hnwi" | "faa") => {
    const activeSource = overrideSource ?? source;
    setJob({ ...EMPTY_JOB, status: "queued", message: "Starting…" });
    try {
      const endpoint = activeSource === "faa" ? "/api/ingest/faa" : "/api/ingest/western-hnwi";
      const body = activeSource === "faa"
        ? { maxRecords: targetCount }
        : { targetCount };
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setJob((p) => ({ ...p, status: "failed", message: data.error ?? "Failed to start" }));
        return;
      }
      const { jobId } = data;
      setJob((p) => ({ ...p, jobId, status: "running", message: "Running…" }));
      stopPolling();
      pollRef.current = setInterval(() => pollJob(jobId), 1500);
    } catch (err: any) {
      setJob((p) => ({ ...p, status: "failed", message: err.message ?? "Error" }));
    }
  };

  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startIngestion(autoStart);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => () => stopPolling(), []);

  const isRunning = job.status === "queued" || job.status === "running";
  const isDone = job.status === "done";
  const isFailed = job.status === "failed";

  return (
    <div className="border-t border-border bg-card/30 px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary truncate">
            {source === "faa" ? "FAA Aircraft Registry" : "Western HNWI Engine"}
          </span>
          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
          {isFailed && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isDone && (
            <span className="text-[10px] font-mono text-emerald-500 whitespace-nowrap">
              +{job.inserted.toLocaleString()}
            </span>
          )}
          {job.dedupCount > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
              {job.dedupCount.toLocaleString()} deduped
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Target selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-[10px] font-mono text-muted-foreground">TARGET</span>
          <select
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            disabled={isRunning}
            className="bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary disabled:opacity-50 flex-1 sm:flex-none"
          >
            <option value={500}>500</option>
            <option value={1000}>1,000</option>
            <option value={5000}>5,000</option>
            <option value={10000}>10,000</option>
            <option value={25000}>25,000</option>
            <option value={50000}>50,000</option>
          </select>
        </div>

        {/* Launch button */}
        <button
          onClick={() => startIngestion()}
          disabled={isRunning}
          className={cn(
            "flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-all w-full sm:w-auto",
            isRunning
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isRunning ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Play className="w-3 h-3 shrink-0" />}
          <span className="truncate">{isRunning ? "Running…" : "Ingest"}</span>
        </button>

        {/* Progress bar */}
        {(isRunning || isDone) && (
          <div className="w-full sm:flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
              {job.progress}%
            </span>
          </div>
        )}

        {/* Status message */}
        {job.message && !isRunning && (
          <span className={cn("text-[10px] font-mono truncate w-full sm:w-auto", isFailed ? "text-destructive" : "text-muted-foreground")}>
            {job.message}
          </span>
        )}

        {/* Log toggle */}
        {job.log.length > 0 && (
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline whitespace-nowrap"
          >
            {showLog ? "hide log" : "log"}
          </button>
        )}
      </div>

      {/* Live log */}
      {showLog && job.log.length > 0 && (
        <div className="mt-2 bg-background border border-border rounded p-2 max-h-24 overflow-y-auto">
          {job.log.map((line, i) => (
            <div key={i} className="text-[10px] font-mono text-muted-foreground leading-5">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onIngest }: { onIngest: (mode: "western-hnwi" | "faa") => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Database className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-lg font-bold font-mono text-foreground mb-2 uppercase tracking-widest">
        Database Empty
      </h2>
      <p className="text-sm text-muted-foreground font-mono max-w-md mb-2">
        No synthetic data. All records must come from real public registries.
      </p>
      <p className="text-xs text-muted-foreground/60 font-mono max-w-md mb-8">
        Choose a source to begin ingesting verified public registry data.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-xl">
        <button
          onClick={() => onIngest("faa")}
          className="flex flex-col items-start gap-2 p-4 border border-border rounded-lg bg-card/50 hover:border-primary hover:bg-card transition-all text-left group min-w-0"
        >
          <div className="flex items-center gap-2 text-primary w-full">
            <Globe className="w-4 h-4 shrink-0" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider truncate">FAA Aircraft Registry</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            Ingest real US private jet &amp; helicopter owners from the FAA Releasable Aircraft Database.
            Turbine-powered aircraft = highest HNWI signal.
          </p>
          <div className="text-[10px] font-mono text-primary/60 group-hover:text-primary transition-colors mt-auto pt-2 truncate w-full">
            ~70MB · daily updated · 30k+ records →
          </div>
        </button>

        <button
          onClick={() => onIngest("western-hnwi")}
          className="flex flex-col items-start gap-2 p-4 border border-border rounded-lg bg-card/50 hover:border-primary hover:bg-card transition-all text-left group min-w-0"
        >
          <div className="flex items-center gap-2 text-primary w-full">
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider truncate">Western HNWI Engine</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            Harvest real individuals from SEC EDGAR (SC 13D/G, DEF 14A), UK Companies House, and BRREG Norway.
          </p>
          <div className="text-[10px] font-mono text-primary/60 group-hover:text-primary transition-colors mt-auto pt-2 truncate w-full">
            Live API · no download · beneficial owners →
          </div>
        </button>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/40 mt-8 max-w-xs">
        COMPLIANCE: All data from public registries only. Source attribution included on every record.
      </p>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-border border-b border-border sticky top-0 z-20">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center py-3 px-2 bg-card/50 backdrop-blur-md min-w-0">
            <div className="h-3 w-16 bg-[#1E2332] animate-pulse rounded mb-2" />
            <div className="h-6 w-20 bg-[#1E2332] animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;
  const s = stats as any;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-border border-b border-border sticky top-0 z-20">
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <Database className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Entities</span>
        </span>
        <span className="text-lg font-bold text-foreground truncate">{s.totalEntities?.toLocaleString()}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Assets</span>
        </span>
        <span className="text-lg font-bold text-foreground truncate">{s.totalAssets?.toLocaleString()}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <span className="truncate">W-HNWIs</span>
        </span>
        <span className="text-lg font-bold text-blue-400 truncate">
          {(s.westernHnwiCount ?? 0).toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <Activity className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Signal Avg</span>
        </span>
        <span className="text-lg font-bold text-primary truncate">
          {((s.avgBayesianScore ?? 0) * 100).toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-amber-500 uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Hot Leads</span>
        </span>
        <span className="text-lg font-bold text-amber-500 truncate">{s.hotLeadsCount?.toLocaleString()}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Contactable</span>
        </span>
        <span className="text-lg font-bold text-emerald-400 truncate">{(s.contactableCount ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 px-2 bg-card/90 backdrop-blur-md min-w-0">
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-wide mb-1 flex items-center gap-1.5 truncate">
          <Phone className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Enriched %</span>
        </span>
        <span className="text-lg font-bold text-cyan-400 truncate">
          {(s.enrichmentCoverage ?? 0).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ── Wealth Tier Bar (F3) ──────────────────────────────────────────────────────
function WealthTierBar() {
  const { data: stats, isLoading } = useGetDashboardStats();
  
  if (isLoading) {
    return (
      <div className="px-3 py-2 border-b border-border bg-card/30 flex items-center gap-3">
        <div className="h-2.5 w-24 bg-[#1E2332] animate-pulse rounded hidden sm:block" />
        <div className="flex h-1.5 rounded-full flex-1 gap-px bg-[#1E2332] animate-pulse" />
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap flex-shrink-0">
          <div className="h-2.5 w-16 bg-[#1E2332] animate-pulse rounded" />
          <div className="h-2.5 w-16 bg-[#1E2332] animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const s = stats as any;
  const tiers = s?.wealthTiers;
  if (!tiers || (tiers.ultraHnw + tiers.veryHnw + tiers.hnw + tiers.unknown) === 0) return null;
  const total = tiers.ultraHnw + tiers.veryHnw + tiers.hnw + tiers.unknown;
  const pct = (n: number) => total > 0 ? Math.max((n / total) * 100, n > 0 ? 1 : 0) : 0;
  const segments = [
    { label: "Ultra >$100M", val: tiers.ultraHnw, cls: "bg-violet-500", textCls: "text-violet-400" },
    { label: "Very $30–100M", val: tiers.veryHnw,  cls: "bg-primary",   textCls: "text-primary" },
    { label: "HNW $4–30M",    val: tiers.hnw,      cls: "bg-amber-500", textCls: "text-amber-400" },
    { label: "Unknown",        val: tiers.unknown,   cls: "bg-muted/60",  textCls: "text-muted-foreground" },
  ];
  return (
    <div className="px-3 py-2 border-b border-border bg-card/30 flex items-center gap-3 min-w-0">
      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap hidden sm:block shrink-0">Wealth Tiers</span>
      <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
        {segments.map((seg) => (
          <div key={seg.label} className={cn("h-full transition-all duration-700", seg.cls)} style={{ width: `${pct(seg.val)}%` }} />
        ))}
      </div>
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap shrink-0">
        {segments.filter(s => s.val > 0).map((seg) => (
          <span key={seg.label} className={cn("text-[9px] font-mono whitespace-nowrap", seg.textCls)}>
            {seg.label.split(" ")[0]}: {seg.val.toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: mapData, isLoading: isLoadingMap } = useGetMapData();
  const { data: hotLeads, refetch: refetchLeads, isLoading: isLoadingLeads } = useGetHotLeads({ limit: 10 });
  const { data: stats, refetch: refetchStats, isLoading: isLoadingStats } = useGetDashboardStats();
  const [mobileTab, setMobileTab] = useState<"map" | "signals">("signals");
  const [ingestionSource, setIngestionSource] = useState<"western-hnwi" | "faa">("western-hnwi");

  const s = stats as any;
  const isEmpty = s != null && (s.totalEntities ?? 0) === 0 && !isLoadingStats;

  const handleIngestionComplete = useCallback(() => {
    // Refresh stats and hot leads after ingestion finishes
    setTimeout(() => { refetchStats(); refetchLeads(); }, 1_000);
  }, [refetchStats, refetchLeads]);

  const handleEmptyStateIngest = useCallback((mode: "western-hnwi" | "faa") => {
    setIngestionSource(mode);
  }, []);

  // ── Empty state (no real data yet) ───────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <StatsBar />
        <WealthTierBar />
        <EmptyState onIngest={handleEmptyStateIngest} />
        <IngestionPanel
          onComplete={handleIngestionComplete}
          source={ingestionSource}
          autoStart={ingestionSource}
        />
      </div>
    );
  }

  const mapHasData = Array.isArray(mapData) && mapData.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <StatsBar />
      <WealthTierBar />

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left: global asset map */}
        <div className="flex-1 relative">
          {isLoadingMap ? (
            <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-[#0B0F19]">
              <div className="w-16 h-16 rounded-full bg-[#1E2332] animate-pulse flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <div className="h-4 w-48 bg-[#1E2332] animate-pulse rounded mb-2" />
              <div className="h-3 w-64 bg-[#1E2332] animate-pulse rounded" />
            </div>
          ) : !mapHasData ? (
            <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-[#0B0F19]">
              <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-mono text-muted-foreground">Awaiting geospatial points</p>
              <p className="text-xs font-mono text-muted-foreground/50 mt-1">Map will render when data is available</p>
            </div>
          ) : (
            <>
              <MapContainer
                center={[30, 10]}
                zoom={2}
                style={{ height: "100%", width: "100%", minHeight: "300px", background: "#0B0F19" }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {mapData.map((point: any) => (
                  <Marker
                    key={point.id}
                    position={[point.latitude, point.longitude]}
                    icon={createCustomIcon(point.category)}
                  >
                    <Popup className="apex-popup">
                      <div className="text-xs font-mono bg-card text-foreground p-2 rounded min-w-[200px]">
                        <div className="font-bold text-primary mb-1 truncate">{point.identifier}</div>
                        <div className="text-muted-foreground truncate">{point.category} · {point.jurisdiction}</div>
                        {point.ownerName && <div className="mt-1 text-foreground/80 truncate">↳ {point.ownerName}</div>}
                        {point.estimatedValue && (
                          <div className="text-primary mt-1">{formatCurrency(point.estimatedValue)}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Map legend */}
              <div className="absolute bottom-6 left-4 bg-card/90 border border-border rounded-lg px-3 py-2 backdrop-blur-sm z-[1000]">
                <div className="flex items-center gap-4">
                  {[
                    { label: "Real Estate", color: "#10B981" },
                    { label: "Marine",      color: "#F59E0B" },
                    { label: "Aviation",    color: "#A855F7" },
                    { label: "Other",       color: "#3B82F6" },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-mono text-muted-foreground truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: signals + ingestion engine */}
        <div className="w-[340px] xl:w-[400px] border-l border-border bg-card/20 flex flex-col overflow-hidden shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground truncate">
                Live Signals
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              LIVE
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoadingLeads ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 mr-3">
                      <div className="h-4 w-3/4 bg-[#1E2332] animate-pulse rounded mb-2" />
                      <div className="h-3 w-1/2 bg-[#1E2332] animate-pulse rounded" />
                    </div>
                    <div className="h-5 w-8 bg-[#1E2332] animate-pulse rounded shrink-0" />
                  </div>
                  <div className="h-8 w-full bg-[#1E2332] animate-pulse rounded" />
                </div>
              ))
            ) : hotLeads?.map((lead: any) => (
              <div key={lead.entityId} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-sm">
                      {lead.entityName}
                    </h3>
                    <div className="text-xs font-mono mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded border text-[9px] uppercase whitespace-nowrap", getTypeBadgeStyles(lead.entityType))}>
                        {lead.entityType}
                      </span>
                      <span className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] uppercase text-muted-foreground whitespace-nowrap">
                        {lead.nationality || "Unk"}
                      </span>
                      {(lead.contactEmail || lead.email) && (
                        <span className="flex items-center gap-0.5 text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                          <Mail className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-mono">EMAIL</span>
                        </span>
                      )}
                      {(lead.contactPhone || lead.phone) && (
                        <span className="flex items-center gap-0.5 text-cyan-400 border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                          <Phone className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-mono">PHONE</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ScoreBadge score={lead.bayesianScore} />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-2.5 flex items-center justify-between">
                  <span>Net Worth: <span className="text-foreground">{formatCurrency(lead.estimatedNetWorth)}</span></span>
                  <span>Assets: <span className="text-foreground">{lead.assetCount}</span></span>
                </div>

                <div className="bg-background rounded p-2 text-xs font-mono border border-border truncate">
                  <span className="text-primary mr-2">SIGNAL:</span>
                  <span className="text-foreground/80">{lead.signal}</span>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <Link
                    href={`/profile/${lead.entityId}`}
                    className="text-xs font-mono text-muted-foreground flex items-center hover:text-primary transition-colors"
                  >
                    Profile <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Link>
                  <Link
                    href={`/graph?entity=${lead.entityId}`}
                    className="text-xs font-mono text-primary flex items-center hover:underline"
                  >
                    Network <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}

            {!isLoadingLeads && (!hotLeads || hotLeads.length === 0) && (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
                <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-3">
                  <ShieldAlert className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-mono text-muted-foreground">No active signals detected.</p>
                <p className="text-xs font-mono text-muted-foreground/50 mt-1">Start ingestion to generate signals.</p>
              </div>
            )}
          </div>

          {/* Ingestion engine */}
          <IngestionPanel onComplete={handleIngestionComplete} />
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["signals", "map"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors",
                mobileTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground",
              )}
            >
              {tab === "signals" ? "Live Signals" : "Asset Map"}
            </button>
          ))}
        </div>

        {/* Signals tab */}
        <div className={cn("flex-1 overflow-y-auto flex flex-col", mobileTab !== "signals" && "hidden")}>
          <div className="flex-1 divide-y divide-border">
            {isLoadingLeads ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-4 w-2/3 bg-[#1E2332] animate-pulse rounded mb-2" />
                  <div className="h-3 w-1/3 bg-[#1E2332] animate-pulse rounded mb-3" />
                  <div className="h-8 w-full bg-[#1E2332] animate-pulse rounded" />
                </div>
              ))
            ) : hotLeads?.map((lead: any) => (
              <div key={lead.entityId} className="p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">{lead.entityName}</h3>
                    <div className="text-xs font-mono mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded border text-[9px] uppercase whitespace-nowrap", getTypeBadgeStyles(lead.entityType))}>
                        {lead.entityType}
                      </span>
                      <span className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] uppercase text-muted-foreground whitespace-nowrap">
                        {lead.nationality || "Unk"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ScoreBadge score={lead.bayesianScore} />
                  </div>
                </div>
                <div className="bg-background rounded p-2 text-xs font-mono border border-border truncate mt-3">
                  <span className="text-primary mr-2">SIGNAL:</span>
                  <span className="text-foreground/80">{lead.signal}</span>
                </div>
              </div>
            ))}
            {!isLoadingLeads && (!hotLeads || hotLeads.length === 0) && (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
                <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-3">
                  <ShieldAlert className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-mono text-muted-foreground">No active signals detected.</p>
              </div>
            )}
          </div>
          <IngestionPanel onComplete={handleIngestionComplete} />
        </div>

        {/* Map tab — only mount when active so Leaflet gets a real container size */}
        <div className={cn("flex-1 relative bg-[#0B0F19]", mobileTab !== "map" && "hidden")}>
          {mobileTab === "map" && (
            isLoadingMap ? (
              <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#1E2332] animate-pulse flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-muted-foreground/30" />
                </div>
              </div>
            ) : !mapHasData ? (
              <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-mono text-muted-foreground">Awaiting geospatial points</p>
              </div>
            ) : (
              <MapContainer
                center={[30, 10]} zoom={2}
                style={{ height: "100%", width: "100%", minHeight: "300px", background: "#0B0F19" }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
                {mapData.map((point: any) => (
                  <Marker key={point.id} position={[point.latitude, point.longitude]} icon={createCustomIcon(point.category)}>
                    <Popup>
                      <div className="text-xs font-mono p-1">
                        <div className="font-bold truncate">{point.identifier}</div>
                        <div className="text-muted-foreground truncate">{point.category}</div>
                        {point.ownerName && <div className="truncate">↳ {point.ownerName}</div>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )
          )}
        </div>
      </div>
    </div>
  );
}
