import { getGetEntityGraphQueryKey, useGetEntityGraph, useListEntities, useCreateRelationship } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo, useCallback, Component, type ReactNode, type ErrorInfo } from "react";
import { useSearch, useLocation, Link } from "wouter";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { Network, ZoomIn, ZoomOut, Maximize, X, Search, ChevronDown, Filter, Shield, Plus, Link2, Loader2, ArrowLeft } from "lucide-react";
import { cn, formatCurrency, formatEntityName, ScoreBadge } from "@/lib/utils";
import { isMockMode, MOCK_ENTITIES } from "@/lib/dev-mock-data";
import { readApiJson } from "@/lib/api-json";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

function useGraphContainerSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    const container = document.getElementById("graph-container");
    if (!container) return;

    const updateSize = () => {
      // Mobile flex column can report 0 height before layout settles — floor to viewport.
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, Math.floor(window.innerHeight * 0.62), 360);
      setSize([w, h]);
    };
    updateSize();
    // Second pass after layout (mobile chrome + flex)
    const t = window.setTimeout(updateSize, 120);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSize) : null;
    ro?.observe(container);
    window.addEventListener("resize", updateSize);
    return () => {
      window.clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);
  return size;
}


/** Prevent force-graph / WebGL failures from blanking the entire desk shell. */
class GraphErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || "Graph failed to render" };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[GraphViewer]", err, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <Network className="h-8 w-8 text-[#74747A]" />
          <p className="font-mono text-sm text-[#18181A]">Connections view could not start</p>
          <p className="max-w-md text-[12px] text-[#74747A]">{this.state.error}</p>
          <Link href="/profiles" className="atlas-outline-btn rounded-md px-3 py-2 font-mono text-[11px]">
            Back to ledger
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function GraphViewerInner() {
  const [ForceGraph2D, setForceGraph2D] = useState<typeof import("react-force-graph-2d").default | null>(null);
  const [graphLoadError, setGraphLoadError] = useState<string | null>(null);
  const [graphReady, setGraphReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const boot = window.setTimeout(() => {
      import("react-force-graph-2d")
        .then((mod) => {
          if (!cancelled) setForceGraph2D(() => mod.default);
        })
        .catch((err: Error) => {
          if (!cancelled) setGraphLoadError(err?.message || "Failed to load graph library");
        });
    }, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(boot);
    };
  }, []);
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const entityIdFromUrl = params.get("entity");

  const [targetId, setTargetId] = useState<number>(() => {
    if (!entityIdFromUrl) return 0;
    const parsed = parseInt(entityIdFromUrl, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });

  // Hooks MUST be declared before any effect that reads their values (TDZ / "Cannot access E before initialization")
  const { data: graphDataRaw, isLoading, isError } = useGetEntityGraph(targetId, undefined, {
    query: { enabled: targetId > 0 && !isMockMode(), queryKey: getGetEntityGraphQueryKey(targetId) },
  });
  const { data: allEntitiesRaw } = useListEntities({ limit: 200 });

  // On initial load with no ?entity= param, pick a hub — or any entity from the list
  useEffect(() => {
    if (!entityIdFromUrl && targetId === 0) {
      if (isMockMode()) {
        setTargetId(MOCK_ENTITIES[0]?.id ?? 0);
        return;
      }
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      fetch(`${base}/api/graph/hub-entity`)
        .then((r) => readApiJson(r))
        .then((d: { entityId: number | null }) => {
          if (d.entityId && Number.isFinite(d.entityId) && d.entityId > 0) {
            setTargetId(d.entityId);
          }
        })
        .catch(() => undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If hub-entity returned null, fall back to first listed entity so the graph is never blank
  useEffect(() => {
    if (targetId > 0 || entityIdFromUrl) return;
    const raw = allEntitiesRaw as any;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.entities) ? raw.entities : [];
    const first = list[0];
    if (first?.id) setTargetId(Number(first.id));
  }, [allEntitiesRaw, targetId, entityIdFromUrl]);

  useEffect(() => {
    if (entityIdFromUrl) {
      const parsed = parseInt(entityIdFromUrl, 10);
      if (!isNaN(parsed) && parsed !== targetId) setTargetId(parsed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityIdFromUrl]);

  const graphData = useMemo(() => {
    if (isMockMode()) {
      const people = MOCK_ENTITIES.slice(0, 5);
      const nodes = people.map((e, i) => ({
        id: String(e.id),
        label: e.name,
        type: e.type,
        isTarget: i === 0,
        bayesianScore: e.bayesianScore ?? 70,
        contactConfidence: e.contactConfidence ?? 50,
      }));
      const links = people.slice(1).map((e) => ({
        source: String(people[0].id),
        target: String(e.id),
        relType: e.type === "Corporation" ? "OWNS" : "RELATED",
      }));
      return { nodes, edges: links, truncated: false };
    }
    return graphDataRaw;
  }, [graphDataRaw]);

  const allEntities = useMemo(() => {
    if (isMockMode()) {
      return MOCK_ENTITIES.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        bayesianScore: e.bayesianScore ?? 0,
        contactConfidence: e.contactConfidence ?? 0,
      })) as any[];
    }
    const raw = allEntitiesRaw as any;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.entities)) return raw.entities;
    return [] as any[];
  }, [allEntitiesRaw]);
  const [width, height] = useGraphContainerSize();
  useEffect(() => {
    if (width > 0 && height > 0) {
      const t = window.setTimeout(() => setGraphReady(true), 30);
      return () => window.clearTimeout(t);
    }
    setGraphReady(false);
  }, [width, height]);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorQuery, setSelectorQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [assetTypeFilter, setAssetTypeFilter] = useState<string | null>(null);

  // ── Relationship modal state ────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string; nodeName: string } | null>(null);
  const [addRelOpen, setAddRelOpen] = useState(false);
  const [relSourceId, setRelSourceId] = useState<number | null>(null);
  const [relSourceName, setRelSourceName] = useState("");
  const [relTargetId, setRelTargetId] = useState<number | null>(null);
  const [relTargetName, setRelTargetName] = useState("");
  const [relType, setRelType] = useState("KNOWS");
  const [relStrength, setRelStrength] = useState(0.5);
  const [relNotes, setRelNotes] = useState("");
  const [relSaving, setRelSaving] = useState(false);
  const [relError, setRelError] = useState<string | null>(null);
  const [relSearchQ, setRelSearchQ] = useState("");
  const [relSearchResults, setRelSearchResults] = useState<{ id: number; name: string }[]>([]);

  const queryClient = useQueryClient();
  const createRelationship = useCreateRelationship();

  const deskHasPeople = (allEntities?.length ?? 0) > 0;

  const currentEntity = allEntities?.find((e) => e.id === targetId);

  // Resolve the display name: prefer allEntities list, fall back to the target node label
  // (graph data already contains the entity name in the target node).
  const displayEntityName = useMemo(() => {
    if (currentEntity?.name) return currentEntity.name;
    if (graphData?.nodes) {
      const target = (graphData.nodes as any[]).find((n: any) => n.isTarget);
      if (target?.label) return target.label;
    }
    return targetId > 0 && deskHasPeople ? `Entity #${targetId}` : null;
  }, [currentEntity, graphData, targetId, deskHasPeople]);

  const filteredEntities = useMemo(() => {
    if (!allEntities) return [];
    const q = selectorQuery.toLowerCase();
    return allEntities.filter(
      (e) => !q || e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    );
  }, [allEntities, selectorQuery]);

  function selectEntity(id: number) {
    setTargetId(id);
    setSelectedNode(null);
    setSelectorOpen(false);
    setSelectorQuery("");
    setLocation(`/graph?entity=${id}`);
  }

  // ── Relationship handlers ────────────────────────────────────────────────
  const openRelModal = useCallback((nodeId: string, nodeName: string) => {
    const numId = nodeId.startsWith("e:") ? parseInt(nodeId.slice(2), 10) : null;
    if (!numId) return; // only entity nodes can be sources
    setRelSourceId(numId);
    setRelSourceName(nodeName);
    setRelTargetId(null); setRelTargetName(""); setRelType("KNOWS");
    setRelStrength(0.5); setRelNotes(""); setRelSearchQ(""); setRelSearchResults([]);
    setRelError(null);
    setCtxMenu(null);
    setAddRelOpen(true);
  }, []);

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

  const handleSaveRel = () => {
    if (!relSourceId || !relTargetId) { setRelError("Select a target entity"); return; }
    setRelSaving(true); setRelError(null);
    createRelationship.mutate(
      { data: { sourceEntityId: relSourceId, targetId: relTargetId, targetType: "Entity", relationshipType: relType, strength: relStrength, notes: relNotes || undefined } },
      {
        onSuccess: () => {
          setRelSaving(false);
          setAddRelOpen(false);
          void queryClient.invalidateQueries({ queryKey: getGetEntityGraphQueryKey(targetId) });
        },
        onError: (err: any) => { setRelSaving(false); setRelError(err?.message ?? "Failed to save"); },
      }
    );
  };

  const gData = useMemo(() => {
    // Guard against undefined AND against error-response objects like { error: "Entity not found" }
    const ASSET_TYPES = new Set(["RealEstate", "Aviation", "Marine", "PrivateClub"]);
    let rawNodes: any[] = Array.isArray((graphData as any)?.nodes) ? (graphData as any).nodes : [];
    let rawEdges: any[] = Array.isArray((graphData as any)?.edges) ? (graphData as any).edges : [];

    // Sparse bureau: no / few relationships → always show people as a constellation
    // so the graph is never a blank black screen.
    const people = Array.isArray(allEntities) ? allEntities.slice(0, 48) : [];
    if (rawNodes.length <= 1 && people.length > 0) {
      rawNodes = people.map((e: any) => ({
        id: String(e.id),
        label: e.name,
        nodeType: e.type || "HNWI",
        type: e.type || "HNWI",
        isTarget: Number(e.id) === targetId,
        isCentral: Number(e.id) === targetId,
        bayesianScore: e.bayesianScore ?? 0,
        contactConfidence: e.contactConfidence ?? 0,
      }));
      if (targetId > 0 && !rawNodes.some((n) => String(n.id) === String(targetId))) {
        rawNodes.unshift({
          id: String(targetId),
          label: displayEntityName || `Entity #${targetId}`,
          nodeType: "HNWI",
          type: "HNWI",
          isTarget: true,
          isCentral: true,
          bayesianScore: 0,
          contactConfidence: 0,
        });
      }
      rawEdges = [];
    } else if (rawNodes.length === 0 && targetId > 0) {
      rawNodes = [{
        id: String(targetId),
        label: displayEntityName || `Entity #${targetId}`,
        nodeType: "HNWI",
        type: "HNWI",
        isTarget: true,
        isCentral: true,
        bayesianScore: 0,
        contactConfidence: 0,
      }];
      rawEdges = [];
    }

    const filteredNodes = rawNodes.filter((n: any) => {
      if (n.isTarget) return true;
      if (minScore > 0 && !ASSET_TYPES.has(n.nodeType) && n.bayesianScore != null && n.bayesianScore * 100 < minScore) return false;
      if (assetTypeFilter && ASSET_TYPES.has(n.nodeType) && n.nodeType !== assetTypeFilter) return false;
      return true;
    });
    const filteredIds = new Set(filteredNodes.map((n: any) => String(n.id)));
    return {
      nodes: filteredNodes.map((n: any) => ({ ...n, val: n.isTarget ? 3 : n.isCentral ? 2 : 1 })),
      links: rawEdges
        .filter((e: any) => filteredIds.has(String(e.source)) && filteredIds.has(String(e.target)))
        .map((e: any) => ({
          source: String(e.source),
          target: String(e.target),
          label: e.label,
          strength: e.strength,
          evidenceStatus: e.evidenceStatus,
          provenanceScore: e.provenanceScore,
        })),
    };
  }, [graphData, minScore, assetTypeFilter, allEntities, targetId, displayEntityName]);

  useEffect(() => {
    if (!gData.nodes.length || !fgRef.current) return;
    // Gentle fit — never extreme zoom-in on a single HNWI
    const pad = gData.nodes.length <= 3 ? 160 : gData.nodes.length <= 8 ? 100 : 60;
    const t = window.setTimeout(() => {
      try {
        fgRef.current?.zoomToFit(500, pad);
        const z = (fgRef.current as any)?.zoom;
        if (typeof z === "function") {
          const cur = z();
          // Hard cap — one selected person must not fill the viewport
          if (typeof cur === "number" && cur > 2.2) z(2.2, 280);
        }
      } catch { /* non-fatal */ }
    }, 350);
    return () => window.clearTimeout(t);
  }, [gData, targetId]);

  function nodeColor(node: any): string {
    if (node.isTarget) return "#2757C6";
    const t: string = node.nodeType ?? "";
    if (t === "HNWI") return "#1F8A4D";
    if (t === "Corporation" || t === "Corp") return "#2757C6";
    if (t === "Trust") return "#EDB92B";
    if (t === "Gatekeeper") return "#C8321E";
    if (["RealEstate", "Aviation", "Marine", "PrivateClub"].includes(t))
      return "#74747A";
    return "#74747A";
  }

  /** Draw the entity name label below each node */
  function drawNodeLabel(node: any, ctx: CanvasRenderingContext2D, globalScale: number) {
    if (!node.label) return;
    if (globalScale < 1.2) return; // only render labels when zoomed in enough

    const maxLen = 18;
    const label = node.label.length > maxLen ? node.label.slice(0, maxLen - 1) + "…" : node.label;

    const fontSize = 3.2 / globalScale;

    // Text color by node type
    const _nt: string = node.nodeType ?? "";
    const color = node.isTarget                              ? "#2757C6"
      : _nt === "HNWI"                                      ? "#1F8A4D"
      : (_nt === "Corporation" || _nt === "Corp")           ? "#2757C6"
      : _nt === "Trust"                                     ? "#EDB92B"
      : _nt === "Gatekeeper"                                ? "#C8321E"
      : ["RealEstate","Aviation","Marine","PrivateClub"].includes(_nt) ? "#74747A"
      : "#74747A";

    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Position below the node circle (in graph units, no globalScale division on the radius)
    const baseR = node.isTarget ? 3 : node.isCentral ? 2 : 1;
    const nodeRadius = Math.sqrt(baseR) * 6; // graph units (zoom-invariant)
    const offsetY = nodeRadius + 1.5 / globalScale;

    // Soft shadow for legibility — keep blur small to avoid bleed into the circle
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.fillText(label, node.x, node.y + offsetY);
    ctx.restore();
  }

  /** Draw a contact-confidence ring around HNWI / Gatekeeper nodes */
  function drawContactRing(node: any, ctx: CanvasRenderingContext2D, globalScale: number) {
    const ENTITY_TYPES = new Set(["HNWI", "Corporation", "Corp", "Trust", "Gatekeeper"]);
    if (!ENTITY_TYPES.has(node.nodeType) && !node.isTarget) return;
    const conf: number = node.contactConfidence ?? 0;
    if (conf <= 0) return;

    const baseR = node.isTarget ? 3 : node.isCentral ? 2 : 1;
    // Match nodeCanvasObject radius (graph units); only stroke width scales with zoom
    const r = Math.sqrt(baseR) * 6 + 2.5;

    const color = conf >= 70 ? "rgba(31,138,77,0.85)"  // green — high confidence
                : conf >= 30 ? "rgba(237,185,43,0.70)"  // amber — partial
                :              "rgba(116,116,122,0.45)"; // grey — low

    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.6, 1.4 / globalScale);
    ctx.stroke();

    // Tiny contact-confidence label at high zoom
    if (globalScale > 2.5) {
      ctx.font = `${3 / globalScale}px monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`C${conf}`, node.x, node.y - r - 0.5 / globalScale);
    }
    ctx.restore();
  }

  return (
    <div
      id="graph-container"
      className="relative flex h-full min-h-[100dvh] w-full flex-col overflow-hidden bg-[#FAFAF8] md:block md:min-h-[70vh]"
      onContextMenu={(e) => e.preventDefault()}
    >

      {/* ── Mobile top bar — only when the desk has people ── */}
      {deskHasPeople && (
      <div className="flex lg:hidden flex-col border-b border-[#E4E4DF] bg-[#FFFFFF]/90  z-30 flex-shrink-0"><div className="flex items-center gap-2 px-3 py-2">
        {entityIdFromUrl && (
          <Link
            href={`/profile/${entityIdFromUrl}`}
            className="w-9 h-9 flex items-center justify-center rounded bg-[#F3F3F0] border border-[#E4E4DF] text-[#74747A] hover:text-[#18181A] flex-shrink-0"
            title="Back to profile"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <button
          onClick={() => setSelectorOpen((o) => !o)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded bg-[#FAFAF8] border border-[#E4E4DF] text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono text-[#74747A]  ">Target</div>
            <div className="text-sm font-mono text-[#18181A] truncate font-medium">
              {displayEntityName ?? (deskHasPeople && targetId > 0 ? `Entity #${targetId}` : "Select person")}
            </div>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-[#74747A] ml-2 flex-shrink-0 transition-transform", selectorOpen && "rotate-180")} />
        </button>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded border flex-shrink-0",
            filterOpen || minScore > 0 || assetTypeFilter
              ? "bg-primary/10 border-[#BDBDB8] text-primary"
              : "bg-[#F3F3F0] border-[#E4E4DF] text-[#74747A] hover:text-[#18181A]"
          )}
          title="Filter"
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={() => fgRef.current?.zoomToFit(400, 50)}
          className="w-9 h-9 flex items-center justify-center rounded bg-[#F3F3F0] border border-[#E4E4DF] text-[#74747A] hover:text-[#18181A] flex-shrink-0"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
      </div>
      )}

      {/* ── Mobile filter sheet ── */}
      {deskHasPeople && filterOpen && (
        <div className="lg:hidden absolute left-3 right-3 top-[57px] z-50 bg-[#FFFFFF] border border-[#E4E4DF] rounded  p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#74747A]  ">Graph Filters</span>
            <button onClick={() => setFilterOpen(false)} className="text-[#74747A] hover:text-[#18181A]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="text-[11px] font-mono text-[#74747A]   mb-2 block">
              Min Signal Score: {minScore}%
            </label>
            <input
              type="range" min={0} max={90} step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono text-[#74747A]   mb-2 block">
              Asset Type
            </label>
            <div className="grid grid-cols-2 gap-1">
              {["Aviation", "Marine", "RealEstate", "PrivateClub"].map((type) => (
                <button
                  key={type}
                  onClick={() => setAssetTypeFilter((f) => (f === type ? null : type))}
                  className={cn(
                    "text-[11px] font-mono px-2 py-1 rounded border transition-colors",
                    assetTypeFilter === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-[#E4E4DF] text-[#74747A] hover:border-[#BDBDB8]"
                  )}
                >
                  {type === "RealEstate" ? "Real Estate" : type}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setMinScore(0); setAssetTypeFilter(null); setFilterOpen(false); }}
            className="w-full text-[11px] font-mono text-[#74747A] hover:text-[#18181A] border border-[#E4E4DF] rounded py-2 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Desktop floating toolbar ── */}
      {deskHasPeople && (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center space-x-2 max-w-[90vw]">
        {/* Back to profile */}
        {entityIdFromUrl && (
          <Link
            href={`/profile/${entityIdFromUrl}`}
            className="flex items-center space-x-1.5 bg-[#FFFFFF]/90  border border-[#E4E4DF] px-3 py-2 rounded text-xs font-mono text-[#74747A] hover:text-[#18181A] transition-colors"
            title="Back to profile"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Profile</span>
          </Link>
        )}
        {/* Entity selector */}
        <div className="relative">
          <button
            onClick={() => setSelectorOpen((o) => !o)}
            className="flex min-h-[40px] items-center space-x-2 bg-[#FFFFFF]/90  border border-[#E4E4DF] px-3 py-2 rounded text-sm font-mono text-[#18181A] hover:border-[#BDBDB8] transition-colors min-w-0 w-full sm:min-w-[220px] sm:w-auto"
          >
            <Network className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate flex-1 text-left">
              {displayEntityName ?? (deskHasPeople && targetId > 0 ? `Entity #${targetId}` : "Select person")}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-[#74747A] transition-transform", selectorOpen && "rotate-180")} />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex space-x-1 bg-[#FFFFFF]/90  border border-[#E4E4DF] p-1 rounded">
          <button
            onClick={() => fgRef.current?.zoom((fgRef.current.zoom() ?? 1) * 1.25)}
            className="min-h-[36px] min-w-[36px] p-1.5 text-[#74747A] hover:text-[#18181A] inline-flex items-center justify-center"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => fgRef.current?.zoom((fgRef.current.zoom() ?? 1) * 0.8)}
            className="min-h-[36px] min-w-[36px] p-1.5 text-[#74747A] hover:text-[#18181A] inline-flex items-center justify-center"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => fgRef.current?.zoomToFit(400, 50)}
            className="min-h-[36px] min-w-[36px] p-1.5 text-[#74747A] hover:text-[#18181A] inline-flex items-center justify-center"
            title="Fit view"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Filter panel */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={cn(
              "flex items-center space-x-1.5 bg-[#FFFFFF]/90  border px-3 py-2 rounded text-xs font-mono transition-colors",
              filterOpen || minScore > 0 || assetTypeFilter
                ? "border-primary/60 text-primary"
                : "border-[#E4E4DF] text-[#74747A] hover:text-[#18181A]"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(minScore > 0 || assetTypeFilter) && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {filterOpen && (
            <div className="absolute top-full mt-2 right-0 w-64 bg-[#FFFFFF] border border-[#E4E4DF] rounded  z-50 p-4 space-y-4 hidden md:block">
              <div>
                <label className="text-[11px] font-mono text-[#74747A]   mb-2 block">
                  Min Signal Score: {minScore}%
                </label>
                <input
                  type="range" min={0} max={90} step={5}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[11px] text-[#74747A] mt-1">
                  <span>0%</span><span>90%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#74747A]   mb-2 block">
                  Asset Type
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {["Aviation", "Marine", "RealEstate", "PrivateClub"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setAssetTypeFilter((f) => (f === type ? null : type))}
                      className={cn(
                        "text-[11px] font-mono px-2 py-1 rounded border transition-colors",
                        assetTypeFilter === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-[#E4E4DF] text-[#74747A] hover:border-[#BDBDB8]"
                      )}
                    >
                      {type === "RealEstate" ? "Real Estate" : type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setMinScore(0); setAssetTypeFilter(null); setFilterOpen(false); }}
                className="w-full text-[11px] font-mono text-[#74747A] hover:text-[#18181A] border border-[#E4E4DF] rounded py-1 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      )}

      {/* ── Entity selector dropdown (shared mobile + desktop) ── */}
      {selectorOpen && (
        <div className={cn(
          "bg-[#FFFFFF] border border-[#E4E4DF]  z-50 flex flex-col",
          // Mobile: full-width below top bar
          "md:absolute md:top-auto md:left-auto md:w-80 md:max-h-72",
          // Positioned differently per context
          "absolute left-3 right-3 top-[57px] md:top-16 md:left-4 max-h-64 rounded"
        )}>
          <div className="p-2 border-b border-[#E4E4DF] flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-[#74747A]" />
            <input
              autoFocus
              value={selectorQuery}
              onChange={(e) => setSelectorQuery(e.target.value)}
              placeholder="Search entity…"
              className="flex-1 bg-transparent text-sm font-mono text-[#18181A] outline-none placeholder:text-[#74747A]/50"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredEntities.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEntity(e.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#F3F3F0]/50 transition-colors text-left",
                  e.id === targetId && "bg-primary/10 text-primary"
                )}
              >
                <div>
                  <div className="font-medium font-mono text-[#18181A]">{e.name}</div>
                  <div className="text-xs text-[#74747A]">{e.type}</div>
                </div>
                <ScoreBadge score={e.bayesianScore} />
              </button>
            ))}
            {filteredEntities.length === 0 && (
              <div className="p-4 text-xs text-[#74747A] text-center">No results</div>
            )}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {deskHasPeople && (
      <div className={cn(
        "absolute bottom-4 left-4 z-10 flex-col space-y-1 bg-[#FFFFFF]/80  border border-[#E4E4DF] p-2 md:p-3 rounded text-[11px] md:text-xs font-mono",
        // Hide on mobile when node detail bottom sheet is open (it sits at bottom-0 and would overlap)
        selectedNode ? "hidden lg:flex" : "flex"
      )}>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#1F8A4D] mr-2" /> HNWI</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#2757C6] mr-2" /> Corp</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#EDB92B] mr-2" /> Trust</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#C8321E] mr-2" /> Gatekeeper</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#74747A] mr-2" /> Asset</div>
      </div>
      )}

      {/* ── Truncation notice ── */}
      {(graphData as any)?.truncated && (
        <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] px-3 py-2 rounded border border-[#E4E4DF] bg-[#F3F3F0] text-[11px] md:text-xs font-mono text-[#1F8A4D] text-center">
          Dense neighborhood truncated for performance — filters and target focus still apply
        </div>
      )}

      {/* ── Error state — entity not found or graph API error ── */}
      {isError && !isMockMode() && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-6 text-center space-y-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#E4E4DF] bg-[#FFFFFF]/50">
            <Network className="w-6 h-6 text-[#74747A]/50" aria-hidden />
          </div>
          <div className="font-mono text-sm font-medium  st text-[#18181A]">Graph unavailable</div>
          <p className="text-xs text-[#74747A] max-w-sm leading-relaxed">
            Entity not found or api-server graph route failed. Select another target or check System status.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link href="/profiles" className="inline-flex min-h-[36px] items-center rounded-md border border-[#E4E4DF] bg-[#FFFFFF]/60 px-3 py-2 text-[11px] font-medium text-[#18181A] hover:border-[#BDBDB8]">Entity ledger</Link>
            <Link href="/status" className="inline-flex min-h-[36px] items-center rounded-md border border-[#E4E4DF] bg-[#FFFFFF]/60 px-3 py-2 text-[11px] font-medium text-[#18181A] hover:border-[#BDBDB8]">System status</Link>
          </div>
        </div>
      )}



      {/* ── Loading ── */}
      {(isLoading || (width === 0 && gData.nodes.length === 0)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 gap-2 text-primary font-mono text-sm st ">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" aria-hidden />
          <span className="">Mapping graph…</span>
        </div>
      )}

      {/* ── Empty graph — single state only ── */}
      {!isError && !isLoading && width > 0 && gData.nodes.length === 0 && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center"
          data-testid="graph-empty"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#E4E4DF] bg-[#F3F3F0]">
            <Network className="h-6 w-6 text-[#1F8A4D]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-[#18181A]">No people on the graph yet</p>
            <p className="mx-auto mt-1.5 max-w-[280px] text-xs leading-relaxed text-[#55555A]">
              Launch Apex Atlas or open the ledger so relationships can appear. No demo nodes.
            </p>
          </div>
          <div className="mt-1 flex w-full max-w-xs flex-col items-stretch gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/reactor"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-3 text-xs font-medium text-white"
            >
              Launch Apex Atlas
            </Link>
            <Link
              href="/profiles"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[#E4E4DF] bg-[#F3F3F0] px-3 py-2 text-xs font-medium text-[#1F8A4D]"
            >
              Open ledger
            </Link>
            <Link
              href="/search"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[#E4E4DF] px-3 py-2 text-xs font-medium text-[#55555A]"
            >
              Discover
            </Link>
          </div>
        </div>
      )}

      {/* ── Sparse graph note (constellation, no edges) ── */}
      {!isLoading && gData.nodes.length >= 2 && gData.links.length === 0 && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-md border border-[#E4E4DF] bg-[#FFFFFF]/90 px-3 py-2 text-center  md:bottom-8">
          <p className="text-[11px] font-medium text-[#18181A]">People on desk — no links mapped yet</p>
          <p className="text-[11px] text-[#74747A]">Relationships appear after research connects them.</p>
        </div>
      )}

      {/* ── Force Graph ── */}
      {graphLoadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#FAFAF8]/90 px-4 text-center">
          <Network className="h-8 w-8 text-[#74747A]" />
          <p className="font-mono text-sm text-[#18181A]">Connections graph unavailable</p>
          <p className="text-[12px] text-[#74747A]">{graphLoadError}</p>
          <Link href="/profiles" className="atlas-outline-btn rounded-md px-3 py-2 font-mono text-[11px]">Back to ledger</Link>
        </div>
      )}
      {!ForceGraph2D && !graphLoadError && width > 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#FAFAF8]/80">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {ForceGraph2D && graphReady && width > 0 && height > 0 && Array.isArray(gData?.nodes) && gData.nodes.length > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={{
            nodes: gData.nodes.map((n: any) => ({ ...n })),
            links: gData.links.map((l: any) => ({ ...l })),
          }}
          nodeLabel={() => ""}
          nodeColor={nodeColor}
          nodeRelSize={6}
          linkColor={(link: any) => {
            const status = link.evidenceStatus as string | undefined;
            if (status === "disputed" || status === "rejected") return "rgba(200, 50, 30, 0.28)";
            if (status === "supported") return "rgba(31, 138, 77, 0.24)";
            return "rgba(255, 255, 255, 0.18)";
          }}
          linkWidth={(link: any) => {
            const s = typeof link.strength === "number" ? link.strength : 0.4;
            return 0.8 + Math.min(1, Math.max(0, s)) * 1.6;
          }}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => { setSelectedNode(node); setCtxMenu(null); }}
          onNodeRightClick={(node, event) => {
            event.preventDefault();
            const n = node as any;
            if (!n.id?.startsWith("e:")) return;
            setCtxMenu({ x: event.clientX, y: event.clientY, nodeId: n.id, nodeName: n.label ?? n.id });
          }}
          backgroundColor="transparent"
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as any;
            const baseR = n.isTarget ? 3 : n.isCentral ? 2 : 1;
            const r = Math.sqrt(baseR) * 6;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = nodeColor(n);
            ctx.fill();
            drawContactRing(n, ctx, globalScale);
            drawNodeLabel(n, ctx, globalScale);
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            if (!link.label || globalScale < 4.0) return;
            const startN = link.source;
            const endN = link.target;
            if (!startN || !endN || typeof startN !== "object" || typeof endN !== "object") return;
            const midX = ((startN as any).x + (endN as any).x) / 2;
            const midY = ((startN as any).y + (endN as any).y) / 2;
            const fontSize = Math.min(3.5, 14 / globalScale);
            ctx.save();
            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = "rgba(116,116,122,0.65)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText((link.label as string).replace(/_/g, " "), midX, midY);
            ctx.restore();
          }}
        />
      )}

      {/* ── Node detail panel — right sidebar on desktop, bottom sheet on mobile ── */}
      {selectedNode && (
        <div className={cn(
          "absolute bg-[#FFFFFF]/95  border-[#E4E4DF] z-20 flex flex-col animate-in",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 border-t max-h-[60vh] slide-in-from-bottom",
          // Desktop: right sidebar
          "md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96 md:border-t-0 md:border-l md:max-h-none md:slide-in-from-right"
        )}>
          <div className="p-4 border-b border-[#E4E4DF] flex justify-between items-center bg-[#F3F3F0]/20">
            <h2 className="font-medium text-sm font-mono  flex items-center">
              <Network className="w-4 h-4 mr-2 text-secondary" /> Node Intelligence
            </h2>
            <button onClick={() => setSelectedNode(null)} className="text-[#74747A] hover:text-[#18181A]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <div className="text-xs text-[#74747A]   mb-1 font-mono">
                {selectedNode.nodeType}
              </div>
              <h3 className="text-lg md:text-xl font-medium text-[#18181A]">{selectedNode.label}</h3>
              {selectedNode.nationality && (
                <div className="text-sm text-[#74747A] mt-1">{selectedNode.nationality}</div>
              )}
            </div>

            <div className="space-y-2 font-mono text-sm">
              {selectedNode.bayesianScore != null && (
                <div className="flex justify-between items-center p-3 border border-[#E4E4DF] bg-[#F3F3F0]/10 rounded">
                  <span className="text-[#74747A]">Signal Score</span>
                  <ScoreBadge score={selectedNode.bayesianScore} />
                </div>
              )}
              {selectedNode.estimatedValue != null && (
                <div className="flex justify-between items-center p-3 border border-[#E4E4DF] bg-[#F3F3F0]/10 rounded">
                  <span className="text-[#74747A]">Est. Value</span>
                  <span className="text-[#18181A]">{formatCurrency(selectedNode.estimatedValue)}</span>
                </div>
              )}
              {selectedNode.isTarget && (
                <div className="flex justify-between items-center p-3 border border-primary/30 bg-primary/5 rounded">
                  <span className="text-primary/70">Role</span>
                  <span className="text-primary font-medium">Primary target</span>
                </div>
              )}
              {selectedNode.isCentral && !selectedNode.isTarget && (
                <div className="flex justify-between items-center p-3 border border-[#E4E4DF] bg-[#F3F3F0] rounded">
                  <span className="text-[#1F8A4D]">Role</span>
                  <span className="text-[#1F8A4D] font-medium">Central node</span>
                </div>
              )}
              {selectedNode.contactOutcome && (
                <div className="flex justify-between items-center p-3 border border-[#E4E4DF] bg-[#F3F3F0]/10 rounded">
                  <span className="text-[#74747A]">Contact Outcome</span>
                  <span className="text-[#18181A] text-xs">{String(selectedNode.contactOutcome).replace(/_/g, " ")}</span>
                </div>
              )}
              {typeof selectedNode.contactConfidence === "number" && selectedNode.contactConfidence > 0 && (
                <div className="flex justify-between items-center p-3 border border-[#E4E4DF] bg-[#F3F3F0]/10 rounded">
                  <span className="text-[#74747A]">Access Confidence</span>
                  <span className="text-[#18181A]">{selectedNode.contactConfidence}</span>
                </div>
              )}
            </div>

            {selectedNode.nodeType === "Gatekeeper" && (() => {
              let approachVector = "Professional introduction via shared network";
              try {
                const m = JSON.parse(selectedNode.metadata ?? "{}");
                if (m.approachVector) approachVector = m.approachVector;
              } catch { /* noop */ }
              return (
                <div className="border-t border-[#E4E4DF] pt-4">
                  <div className="text-xs text-[#74747A] mb-2 font-mono   flex items-center">
                    <Shield className="w-3 h-3 mr-1.5 text-[#1F8A4D]" /> How to Approach
                  </div>
                  <div className="text-xs font-mono text-[#1F8A4D] bg-[#F3F3F0] border border-[#E4E4DF] p-3 rounded leading-relaxed">
                    {approachVector}
                  </div>
                </div>
              );
            })()}

            {selectedNode.metadata && selectedNode.nodeType !== "Gatekeeper" && (
              <div className="border-t border-[#E4E4DF] pt-4">
                <div className="text-xs text-[#74747A] mb-2 font-mono  ">
                  Raw Intel
                </div>
                <pre className="text-xs text-primary whitespace-pre-wrap bg-[#FAFAF8] p-3 rounded border border-[#E4E4DF] overflow-x-auto">
                  {selectedNode.metadata}
                </pre>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={() => selectEntity(
                  selectedNode.id.startsWith("e:")
                    ? parseInt(selectedNode.id.slice(2), 10)
                    : targetId
                )}
                disabled={!selectedNode.id?.startsWith("e:") || selectedNode.isTarget}
                className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-[#BDBDB8] text-xs font-mono   transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Set as Target
              </button>
              <button
                onClick={() => openRelModal(selectedNode.id, selectedNode.label)}
                disabled={!selectedNode.id?.startsWith("e:")}
                className="w-full py-2 flex items-center justify-center gap-2 bg-[#F3F3F0]/20 hover:bg-[#F3F3F0]/40 text-[#74747A] hover:text-[#18181A] border border-[#E4E4DF] text-xs font-mono   transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Link2 className="w-3 h-3" /> Add Relationship From Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[#FFFFFF] border border-[#E4E4DF] rounded  py-1 min-w-[180px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseLeave={() => setCtxMenu(null)}
        >
          <div className="px-3 py-2 border-b border-[#E4E4DF]">
            <div className="text-[11px] font-mono text-[#74747A]  st">Node</div>
            <div className="text-xs font-mono text-[#18181A] font-medium truncate max-w-[160px]">{ctxMenu.nodeName}</div>
          </div>
          <button
            onClick={() => openRelModal(ctxMenu.nodeId, ctxMenu.nodeName)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#18181A] hover:bg-[#F3F3F0]/50 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-primary" /> Add Relationship From Here
          </button>
          <button
            onClick={() => { selectEntity(parseInt(ctxMenu.nodeId.slice(2), 10)); setCtxMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#18181A] hover:bg-[#F3F3F0]/50 transition-colors"
          >
            <Network className="w-3.5 h-3.5 text-secondary" /> Set as Graph Target
          </button>
        </div>
      )}

      {/* ── Dismiss context menu on outside click ── */}
      {ctxMenu && <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />}
      {/* ── Dismiss entity selector / filter sheets ── */}
      {(selectorOpen || filterOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setSelectorOpen(false); setFilterOpen(false); }}
        />
      )}

      {/* ── Add Relationship Modal ── */}
      <Dialog open={addRelOpen} onOpenChange={(o) => { setAddRelOpen(o); if (!o) { setRelError(null); setRelSearchResults([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm st  flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Add Relationship
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Source (pre-filled, read-only) */}
            <div>
              <label className="text-[11px] font-mono text-[#74747A]   mb-1.5 block">From (Source)</label>
              <div className="px-3 py-2 bg-[#F3F3F0]/20 border border-[#E4E4DF] rounded text-sm font-mono text-[#18181A]/70">
                {relSourceName}
              </div>
            </div>

            {/* Target entity search */}
            <div className="relative">
              <label className="text-[11px] font-mono text-[#74747A]   mb-1.5 block">To (Target Entity)</label>
              <input
                value={relTargetId ? relTargetName : relSearchQ}
                onChange={(e) => { setRelTargetId(null); setRelTargetName(""); handleRelSearch(e.target.value); }}
                placeholder="Search entities…"
                className="w-full px-3 py-2 bg-[#FAFAF8] border border-[#E4E4DF] rounded text-sm font-mono text-[#18181A] placeholder:text-[#74747A]/40 focus:border-[#BDBDB8] focus:outline-none"
              />
              {relSearchResults.length > 0 && !relTargetId && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#FFFFFF] border border-[#E4E4DF] rounded  z-50 max-h-48 overflow-y-auto">
                  {relSearchResults.map((r) => (
                    <button key={r.id} onClick={() => { setRelTargetId(r.id); setRelTargetName(r.name); setRelSearchResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm font-mono text-[#18181A] hover:bg-[#F3F3F0]/50 transition-colors border-b border-border/30 last:border-0">
                      {formatEntityName(r.name)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Relationship type */}
            <div>
              <label className="text-[11px] font-mono text-[#74747A]   mb-1.5 block">Relationship Type</label>
              <select value={relType} onChange={(e) => setRelType(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAF8] border border-[#E4E4DF] rounded text-sm font-mono text-[#18181A] focus:border-[#BDBDB8] focus:outline-none">
                {["KNOWS","OWNS","CONTROLS","ASSOCIATES_WITH","EMPLOYED_BY","DIRECTS","FAMILY_OF"].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Strength */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-[#74747A]  ">Strength</label>
                <span className="text-[11px] font-mono text-[#18181A] font-medium">{(relStrength * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min={0.1} max={1.0} step={0.05} value={relStrength}
                onChange={(e) => setRelStrength(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[11px] text-[#74747A] mt-0.5"><span>Weak</span><span>Strong</span></div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-mono text-[#74747A]   mb-1.5 block">Notes (optional)</label>
              <textarea value={relNotes} onChange={(e) => setRelNotes(e.target.value)} rows={2}
                placeholder="Source or evidence for this link…"
                className="w-full px-3 py-2 bg-[#FAFAF8] border border-[#E4E4DF] rounded text-sm font-mono text-[#18181A] placeholder:text-[#74747A]/40 focus:border-[#BDBDB8] focus:outline-none resize-none" />
            </div>

            {relError && <p className="text-xs font-mono text-red-400">{relError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <button className="px-4 py-2 rounded border border-[#E4E4DF] text-[#74747A] font-mono text-xs   hover:text-[#18181A] transition-colors">Cancel</button>
            </DialogClose>
            <button onClick={handleSaveRel} disabled={relSaving || !relTargetId}
              className="flex items-center gap-2 px-4 py-2 rounded bg-primary/20 border border-[#BDBDB8] text-primary font-mono text-xs   hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {relSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {relSaving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GraphViewer() {
  return (
    <GraphErrorBoundary>
      <GraphViewerInner />
    </GraphErrorBoundary>
  );
}
