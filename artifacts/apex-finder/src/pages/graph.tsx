import { useGetEntityGraph } from "@workspace/api-client-react";
import { useEffect, useRef, useState, useMemo } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { Network, ZoomIn, ZoomOut, Maximize, X } from "lucide-react";
import { formatCurrency, ScoreBadge } from "@/lib/utils";

// Using dynamic resize for the canvas
function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    function updateSize() {
      const container = document.getElementById("graph-container");
      if (container) {
        setSize([container.clientWidth, container.clientHeight]);
      }
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
}

export default function GraphViewer() {
  // Let's grab the graph for entity ID 1 as default, or from route params if we had them.
  // For now, hardcoding 1 to show something since no param logic specified for base route yet, 
  // but let's make it stateful.
  const [targetId, setTargetId] = useState<number>(1);
  const { data: graphData, isLoading } = useGetEntityGraph(targetId);
  const [width, height] = useWindowSize();
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Transform graphData to react-force-graph format
  const gData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    return {
      nodes: graphData.nodes.map(n => ({ ...n, val: n.isTarget ? 3 : n.isCentral ? 2 : 1 })),
      links: graphData.edges.map(e => ({ source: e.source, target: e.target, label: e.label }))
    };
  }, [graphData]);

  // Initial zoom to fit
  useEffect(() => {
    if (gData.nodes.length && fgRef.current) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [gData]);

  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden" id="graph-container">
      {/* Graph Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2 bg-card/80 backdrop-blur border border-border p-1 rounded">
        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.2)} className="p-2 text-muted-foreground hover:text-foreground">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.8)} className="p-2 text-muted-foreground hover:text-foreground">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => fgRef.current?.zoomToFit(400, 50)} className="p-2 text-muted-foreground hover:text-foreground">
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-1 bg-card/80 backdrop-blur border border-border p-3 rounded text-xs font-mono">
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-primary mr-2"></div> HNWI Target</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-secondary mr-2"></div> Corporation</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div> Trust</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div> Gatekeeper</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-muted-foreground mr-2"></div> Asset</div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-0 text-primary font-mono text-sm tracking-widest uppercase">
          Initializing Graph Logic...
        </div>
      )}

      {/* Force Graph */}
      {width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={gData}
          nodeLabel="label"
          nodeColor={(node: any) => {
            if (node.isTarget) return "hsl(160, 84%, 39%)"; // primary
            if (node.nodeType === "Corporation") return "hsl(217, 91%, 60%)"; // secondary
            if (node.nodeType === "Trust") return "hsl(270, 70%, 50%)"; // purple
            if (node.nodeType === "Gatekeeper") return "hsl(38, 92%, 50%)"; // amber
            return "hsl(215, 16%, 65%)"; // muted
          }}
          nodeRelSize={6}
          linkColor={() => "rgba(255, 255, 255, 0.2)"}
          linkWidth={1}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => setSelectedNode(node)}
          backgroundColor="transparent"
        />
      )}

      {/* Sidebar Overlay */}
      {selectedNode && (
        <div className="absolute top-0 right-0 bottom-0 w-96 bg-card/95 backdrop-blur-md border-l border-border z-20 flex flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="font-bold text-sm font-mono tracking-wider flex items-center">
              <Network className="w-4 h-4 mr-2 text-secondary" /> Node Details
            </h2>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-mono">{selectedNode.nodeType}</div>
              <h3 className="text-2xl font-bold text-foreground">{selectedNode.label}</h3>
              {selectedNode.nationality && (
                <div className="text-sm text-muted-foreground mt-1">{selectedNode.nationality}</div>
              )}
            </div>

            <div className="space-y-4 font-mono text-sm">
              {selectedNode.bayesianScore !== undefined && selectedNode.bayesianScore !== null && (
                <div className="flex justify-between items-center p-3 border border-border bg-muted/10 rounded">
                  <span className="text-muted-foreground">Signal Score</span>
                  <ScoreBadge score={selectedNode.bayesianScore} />
                </div>
              )}
              
              {selectedNode.estimatedValue !== undefined && selectedNode.estimatedValue !== null && (
                <div className="flex justify-between items-center p-3 border border-border bg-muted/10 rounded">
                  <span className="text-muted-foreground">Est. Value</span>
                  <span className="text-foreground">{formatCurrency(selectedNode.estimatedValue)}</span>
                </div>
              )}

              {selectedNode.metadata && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground mb-2">RAW METADATA</div>
                  <pre className="text-xs text-primary whitespace-pre-wrap bg-background p-3 rounded border border-border overflow-x-auto">
                    {selectedNode.metadata}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="mt-8 space-y-2">
              <button className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-xs font-mono uppercase tracking-wider transition-colors">
                Run MCTS on Node
              </button>
              <button className="w-full py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/50 text-xs font-mono uppercase tracking-wider transition-colors">
                View Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
