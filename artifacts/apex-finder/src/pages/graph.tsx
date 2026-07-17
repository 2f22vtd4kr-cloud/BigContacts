import { useGetEntityGraph, useListEntities } from "@workspace/api-client-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSearch, useLocation } from "wouter";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { Network, ZoomIn, ZoomOut, Maximize, X, Search, ChevronDown, Filter, Shield } from "lucide-react";
import { cn, formatCurrency, ScoreBadge } from "@/lib/utils";

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    function updateSize() {
      const container = document.getElementById("graph-container");
      if (container) setSize([container.clientWidth, container.clientHeight]);
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
}

export default function GraphViewer() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const entityIdFromUrl = params.get("entity");

  const [targetId, setTargetId] = useState<number>(
    entityIdFromUrl ? parseInt(entityIdFromUrl, 10) : 1
  );

  // Sync URL → state when URL changes externally
  useEffect(() => {
    if (entityIdFromUrl) {
      const parsed = parseInt(entityIdFromUrl, 10);
      if (!isNaN(parsed) && parsed !== targetId) setTargetId(parsed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityIdFromUrl]);

  const { data: graphData, isLoading } = useGetEntityGraph(targetId);
  const { data: allEntities } = useListEntities({ limit: 200 });
  const [width, height] = useWindowSize();
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorQuery, setSelectorQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [assetTypeFilter, setAssetTypeFilter] = useState<string | null>(null);

  const currentEntity = allEntities?.find((e) => e.id === targetId);

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

  const gData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    const ASSET_TYPES = new Set(["RealEstate", "Aviation", "Marine", "PrivateClub"]);
    const filteredNodes = graphData.nodes.filter((n) => {
      // Always show the target
      if (n.isTarget) return true;
      // Score filter (applies to non-asset nodes)
      if (minScore > 0 && !ASSET_TYPES.has(n.nodeType) && n.bayesianScore != null && n.bayesianScore * 100 < minScore) return false;
      // Asset type filter
      if (assetTypeFilter && ASSET_TYPES.has(n.nodeType) && n.nodeType !== assetTypeFilter) return false;
      return true;
    });
    const filteredIds = new Set(filteredNodes.map((n) => n.id));
    return {
      nodes: filteredNodes.map((n) => ({ ...n, val: n.isTarget ? 3 : n.isCentral ? 2 : 1 })),
      links: graphData.edges
        .filter((e) => filteredIds.has(e.source) && filteredIds.has(e.target))
        .map((e) => ({ source: e.source, target: e.target, label: e.label, strength: e.strength })),
    };
  }, [graphData, minScore, assetTypeFilter]);

  useEffect(() => {
    if (gData.nodes.length && fgRef.current) {
      setTimeout(() => fgRef.current?.zoomToFit(400, 50), 500);
    }
  }, [gData]);

  function nodeColor(node: any): string {
    if (node.isTarget) return "hsl(160, 84%, 39%)";
    if (node.nodeType === "Corporation") return "hsl(217, 91%, 60%)";
    if (node.nodeType === "Trust") return "hsl(270, 70%, 50%)";
    if (node.nodeType === "Gatekeeper") return "hsl(38, 92%, 50%)";
    if (["RealEstate", "Aviation", "Marine", "PrivateClub"].includes(node.nodeType))
      return "hsl(215, 16%, 45%)";
    return "hsl(215, 16%, 65%)";
  }

  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden" id="graph-container">

      {/* ── Top toolbar ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2">
        {/* Entity selector */}
        <div className="relative">
          <button
            onClick={() => setSelectorOpen((o) => !o)}
            className="flex items-center space-x-2 bg-card/90 backdrop-blur border border-border px-3 py-2 rounded text-sm font-mono text-foreground hover:border-primary/50 transition-colors min-w-[220px]"
          >
            <Network className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate flex-1 text-left">
              {currentEntity?.name ?? `Entity #${targetId}`}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", selectorOpen && "rotate-180")} />
          </button>

          {selectorOpen && (
            <div className="absolute top-full mt-1 left-0 w-80 bg-card border border-border rounded shadow-2xl z-50 flex flex-col max-h-72">
              <div className="p-2 border-b border-border flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={selectorQuery}
                  onChange={(e) => setSelectorQuery(e.target.value)}
                  placeholder="Search entity…"
                  className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredEntities.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => selectEntity(e.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                      e.id === targetId && "bg-primary/10 text-primary"
                    )}
                  >
                    <div>
                      <div className="font-medium font-mono text-foreground">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.type}</div>
                    </div>
                    <ScoreBadge score={e.bayesianScore} />
                  </button>
                ))}
                {filteredEntities.length === 0 && (
                  <div className="p-4 text-xs text-muted-foreground text-center">No results</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex space-x-1 bg-card/90 backdrop-blur border border-border p-1 rounded">
          <button
            onClick={() => fgRef.current?.zoom((fgRef.current.zoom() ?? 1) * 1.25)}
            className="p-1.5 text-muted-foreground hover:text-foreground"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => fgRef.current?.zoom((fgRef.current.zoom() ?? 1) * 0.8)}
            className="p-1.5 text-muted-foreground hover:text-foreground"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => fgRef.current?.zoomToFit(400, 50)}
            className="p-1.5 text-muted-foreground hover:text-foreground"
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
              "flex items-center space-x-1.5 bg-card/90 backdrop-blur border px-3 py-2 rounded text-xs font-mono transition-colors",
              filterOpen || minScore > 0 || assetTypeFilter
                ? "border-primary/60 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(minScore > 0 || assetTypeFilter) && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {filterOpen && (
            <div className="absolute top-full mt-2 right-0 w-64 bg-card border border-border rounded shadow-2xl z-50 p-4 space-y-4">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                  Min Signal Score: {minScore}%
                </label>
                <input
                  type="range" min={0} max={90} step={5}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>0%</span><span>90%</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                  Asset Type
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {["Aviation", "Marine", "RealEstate", "PrivateClub"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setAssetTypeFilter((f) => (f === type ? null : type))}
                      className={cn(
                        "text-[10px] font-mono px-2 py-1 rounded border transition-colors",
                        assetTypeFilter === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {type === "RealEstate" ? "Real Estate" : type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setMinScore(0); setAssetTypeFilter(null); setFilterOpen(false); }}
                className="w-full text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border rounded py-1 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-1 bg-card/80 backdrop-blur border border-border p-3 rounded text-xs font-mono">
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-primary mr-2" /> HNWI Target</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2" /> Corporation</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-purple-500 mr-2" /> Trust</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2" /> Gatekeeper</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-muted-foreground mr-2" /> Asset</div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-0 text-primary font-mono text-sm tracking-widest uppercase animate-pulse">
          Mapping Graph...
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && gData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 text-muted-foreground font-mono text-sm space-y-2">
          <Network className="w-10 h-10 opacity-20" />
          <span>No graph data for this entity.</span>
        </div>
      )}

      {/* ── Force Graph ── */}
      {width > 0 && gData.nodes.length > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={gData}
          nodeLabel="label"
          nodeColor={nodeColor}
          nodeRelSize={6}
          linkColor={() => "rgba(255, 255, 255, 0.18)"}
          linkWidth={1.2}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => setSelectedNode(node)}
          backgroundColor="transparent"
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            if (!link.label || globalScale < 1.8) return;
            const start = link.source;
            const end = link.target;
            if (!start || !end || typeof start !== "object" || typeof end !== "object") return;
            const midX = ((start as any).x + (end as any).x) / 2;
            const midY = ((start as any).y + (end as any).y) / 2;
            const fontSize = Math.min(3.5, 14 / globalScale);
            ctx.save();
            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = "rgba(148,163,184,0.65)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText((link.label as string).replace(/_/g, " "), midX, midY);
            ctx.restore();
          }}
        />
      )}

      {/* ── Node detail sidebar ── */}
      {selectedNode && (
        <div className="absolute top-0 right-0 bottom-0 w-96 bg-card/95 backdrop-blur-md border-l border-border z-20 flex flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="font-bold text-sm font-mono tracking-wider flex items-center">
              <Network className="w-4 h-4 mr-2 text-secondary" /> Node Intelligence
            </h2>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-mono">
                {selectedNode.nodeType}
              </div>
              <h3 className="text-xl font-bold text-foreground">{selectedNode.label}</h3>
              {selectedNode.nationality && (
                <div className="text-sm text-muted-foreground mt-1">{selectedNode.nationality}</div>
              )}
            </div>

            <div className="space-y-2 font-mono text-sm">
              {selectedNode.bayesianScore != null && (
                <div className="flex justify-between items-center p-3 border border-border bg-muted/10 rounded">
                  <span className="text-muted-foreground">Signal Score</span>
                  <ScoreBadge score={selectedNode.bayesianScore} />
                </div>
              )}
              {selectedNode.estimatedValue != null && (
                <div className="flex justify-between items-center p-3 border border-border bg-muted/10 rounded">
                  <span className="text-muted-foreground">Est. Value</span>
                  <span className="text-foreground">{formatCurrency(selectedNode.estimatedValue)}</span>
                </div>
              )}
              {selectedNode.isTarget && (
                <div className="flex justify-between items-center p-3 border border-primary/30 bg-primary/5 rounded">
                  <span className="text-primary/70">Role</span>
                  <span className="text-primary font-bold">PRIMARY TARGET</span>
                </div>
              )}
              {selectedNode.isCentral && !selectedNode.isTarget && (
                <div className="flex justify-between items-center p-3 border border-amber-500/30 bg-amber-500/5 rounded">
                  <span className="text-amber-500/70">Role</span>
                  <span className="text-amber-500 font-bold">CENTRAL NODE</span>
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
                <div className="border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider flex items-center">
                    <Shield className="w-3 h-3 mr-1.5 text-amber-500" /> Approach Vector
                  </div>
                  <div className="text-xs font-mono text-amber-400 bg-amber-500/5 border border-amber-500/20 p-3 rounded leading-relaxed">
                    {approachVector}
                  </div>
                </div>
              );
            })()}

            {selectedNode.metadata && selectedNode.nodeType !== "Gatekeeper" && (
              <div className="border-t border-border pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
                  Raw Intel
                </div>
                <pre className="text-xs text-primary whitespace-pre-wrap bg-background p-3 rounded border border-border overflow-x-auto">
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
                className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Set as Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
