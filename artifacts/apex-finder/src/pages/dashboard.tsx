import { useGetDashboardStats, useGetMapData, useGetHotLeads } from "@workspace/api-client-react";
import {
  ShieldAlert, MapPin, Database, ChevronRight, Activity, AlertTriangle,
  Globe, Radio, Zap, Users, Play, Loader2, CheckCircle2, XCircle, RefreshCw,
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

function IngestionPanel({ onComplete }: { onComplete: () => void }) {
  const [job, setJob] = useState<JobState>(EMPTY_JOB);
  const [targetCount, setTargetCount] = useState(5000);
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startIngestion = async () => {
    setJob({ ...EMPTY_JOB, status: "queued", message: "Starting…" });
    try {
      const resp = await fetch("/api/ingest/western-hnwi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCount }),
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

  useEffect(() => () => stopPolling(), []);

  const isRunning = job.status === "queued" || job.status === "running";
  const isDone = job.status === "done";
  const isFailed = job.status === "failed";

  return (
    <div className="border-t border-border bg-card/30 px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">Western HNWI Engine</span>
          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {isFailed && <XCircle className="w-3.5 h-3.5 text-destructive" />}
        </div>
        <div className="flex items-center gap-2">
          {isDone && (
            <span className="text-[10px] font-mono text-emerald-500">
              +{job.inserted.toLocaleString()} records
            </span>
          )}
          {job.dedupCount > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {job.dedupCount.toLocaleString()} deduped
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Target selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">TARGET</span>
          <select
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            disabled={isRunning}
            className="bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
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
          onClick={startIngestion}
          disabled={isRunning}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-all",
            isRunning
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {isRunning ? "Running…" : "Ingest"}
        </button>

        {/* Progress bar */}
        {(isRunning || isDone) && (
          <div className="flex-1 flex items-center gap-2">
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
          <span className={cn("text-[10px] font-mono", isFailed ? "text-destructive" : "text-muted-foreground")}>
            {job.message}
          </span>
        )}

        {/* Log toggle */}
        {job.log.length > 0 && (
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline"
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

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats } = useGetDashboardStats();
  if (!stats) return null;
  const s = stats as any;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-20">
      <div className="flex flex-col px-4 py-3 border-r border-border border-b md:border-b-0">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <Database className="w-3 h-3 mr-1" /> Entities
        </span>
        <span className="text-xl md:text-2xl font-bold text-foreground">{s.totalEntities?.toLocaleString()}</span>
      </div>
      <div className="flex flex-col px-4 py-3 border-b md:border-b-0 md:border-r md:border-border">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <MapPin className="w-3 h-3 mr-1" /> Assets
        </span>
        <span className="text-xl md:text-2xl font-bold text-foreground">{s.totalAssets?.toLocaleString()}</span>
      </div>
      <div className="flex flex-col px-4 py-3 border-r border-border border-b md:border-b-0">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <Globe className="w-3 h-3 mr-1" /> Western HNWIs
        </span>
        <span className="text-xl md:text-2xl font-bold text-blue-400">
          {(s.westernHnwiCount ?? 0).toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col px-4 py-3 border-r border-border">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <Activity className="w-3 h-3 mr-1" /> Signal Avg
        </span>
        <span className="text-xl md:text-2xl font-bold text-primary">
          {((s.avgBayesianScore ?? 0) * 100).toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col px-4 py-3">
        <span className="text-[10px] md:text-xs font-mono text-amber-500 uppercase tracking-wider mb-1 flex items-center">
          <AlertTriangle className="w-3 h-3 mr-1" /> Hot Leads
        </span>
        <span className="text-xl md:text-2xl font-bold text-amber-500">{s.hotLeadsCount?.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: mapData } = useGetMapData();
  const { data: hotLeads, refetch: refetchLeads } = useGetHotLeads({ limit: 10 });
  const { refetch: refetchStats } = useGetDashboardStats();
  const [mobileTab, setMobileTab] = useState<"map" | "signals">("signals");

  const handleIngestionComplete = useCallback(() => {
    // Refresh stats and hot leads after ingestion finishes
    setTimeout(() => { refetchStats(); refetchLeads(); }, 500);
  }, [refetchStats, refetchLeads]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <StatsBar />

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left: global asset map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[30, 10]}
            zoom={2}
            style={{ height: "100%", width: "100%", background: "#0B0F19" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {mapData?.map((point: any) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
                icon={createCustomIcon(point.category)}
              >
                <Popup className="apex-popup">
                  <div className="text-xs font-mono bg-card text-foreground p-2 rounded min-w-[200px]">
                    <div className="font-bold text-primary mb-1">{point.identifier}</div>
                    <div className="text-muted-foreground">{point.category} · {point.jurisdiction}</div>
                    {point.ownerName && <div className="mt-1 text-foreground/80">↳ {point.ownerName}</div>}
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
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: signals + ingestion engine */}
        <div className="w-[340px] xl:w-[400px] border-l border-border bg-card/20 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">
                Live Signals
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              LIVE
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {hotLeads?.map((lead: any) => (
              <div key={lead.entityId} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-sm">
                      {lead.entityName}
                    </h3>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      {lead.entityType} · {lead.nationality || "Unknown"}
                    </div>
                  </div>
                  <ScoreBadge score={lead.bayesianScore} />
                </div>

                <div className="text-xs text-muted-foreground mb-2.5 flex items-center justify-between">
                  <span>Net Worth: <span className="text-foreground">{formatCurrency(lead.estimatedNetWorth)}</span></span>
                  <span>Assets: <span className="text-foreground">{lead.assetCount}</span></span>
                </div>

                <div className="bg-background rounded p-2 text-xs font-mono border border-border">
                  <span className="text-primary mr-2">SIGNAL:</span>
                  <span className="text-foreground/80">{lead.signal}</span>
                </div>

                <div className="mt-2.5 flex justify-end">
                  <Link
                    href={`/graph?entity=${lead.entityId}`}
                    className="text-xs font-mono text-primary flex items-center hover:underline"
                  >
                    View Network <ChevronRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            ))}

            {(!hotLeads || hotLeads.length === 0) && (
              <div className="text-center p-8 text-muted-foreground text-sm font-mono">
                No active signals detected.
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
        <div className={cn("flex-1 overflow-y-auto", mobileTab !== "signals" && "hidden")}>
          {hotLeads?.map((lead: any) => (
            <div key={lead.entityId} className="p-4 border-b border-border">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-sm text-foreground truncate">{lead.entityName}</h3>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    {lead.entityType} · {lead.nationality || "Unk"}
                  </div>
                </div>
                <ScoreBadge score={lead.bayesianScore} />
              </div>
              <div className="bg-background rounded p-2 text-xs font-mono border border-border">
                <span className="text-primary mr-2">SIGNAL:</span>
                <span className="text-foreground/80">{lead.signal}</span>
              </div>
            </div>
          ))}
          {(!hotLeads || hotLeads.length === 0) && (
            <div className="text-center p-8 text-muted-foreground text-sm font-mono">
              No active signals detected.
            </div>
          )}
          <IngestionPanel onComplete={handleIngestionComplete} />
        </div>

        {/* Map tab */}
        <div className={cn("flex-1 relative", mobileTab !== "map" && "hidden")}>
          <MapContainer
            center={[30, 10]} zoom={2}
            style={{ height: "100%", width: "100%", background: "#0B0F19" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            <MapInvalidator active={mobileTab === "map"} />
            {mapData?.map((point: any) => (
              <Marker key={point.id} position={[point.latitude, point.longitude]} icon={createCustomIcon(point.category)}>
                <Popup>
                  <div className="text-xs font-mono p-1">
                    <div className="font-bold">{point.identifier}</div>
                    <div className="text-muted-foreground">{point.category}</div>
                    {point.ownerName && <div>↳ {point.ownerName}</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
