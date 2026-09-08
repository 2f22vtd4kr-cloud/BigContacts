import React, { useMemo } from "react";

type ActivityNode = {
  id: string;
  label: string;
  sub: string;
  type: string;
  color: string;
  Icon: React.ElementType;
};

type ActivityEdge = {
  id: string;
  from: string;
  to: string;
  adaptive?: boolean;
};

/**
 * Live-only Reactor scheme.
 *
 * This surface is deliberately not a miniature copy of the historical fixed
 * Reactor graph. It mounts only nodes backed by current Bureau telemetry and
 * derives the visible connections from the active node set. Idle tools are
 * absent, not merely dimmed.
 */
const EDGE_RULES: ActivityEdge[] = [
  { id: "target-dig", from: "target", to: "mcts" },
  { id: "dig-groq", from: "mcts", to: "groq" },
  { id: "dig-perpfu", from: "mcts", to: "perpfu", adaptive: true },
  { id: "dig-serper", from: "mcts", to: "perp0" },
  { id: "dig-tavily", from: "mcts", to: "tavily" },
  { id: "dig-exa", from: "mcts", to: "exa" },
  { id: "dig-visit", from: "mcts", to: "webdisc" },
  { id: "dig-harvest", from: "mcts", to: "deepweb" },
  { id: "dig-rdap", from: "mcts", to: "inhouse" },
  { id: "dig-footprint", from: "mcts", to: "maigret" },
  { id: "dig-edgar", from: "mcts", to: "edgar" },
  { id: "dig-ch", from: "mcts", to: "ch" },
  { id: "dig-hmlr", from: "mcts", to: "hmlr" },
  { id: "dig-faa", from: "mcts", to: "faa" },
  { id: "dig-brreg", from: "mcts", to: "brreg" },
  { id: "dig-occrp", from: "mcts", to: "occrp" },
  { id: "dig-hnwi", from: "mcts", to: "hnwi" },
  { id: "dig-opensky", from: "mcts", to: "opensky" },
  { id: "search-groq", from: "perp0", to: "groq" },
  { id: "tavily-groq", from: "tavily", to: "groq" },
  { id: "exa-groq", from: "exa", to: "groq" },
  { id: "followup-dig", from: "perpfu", to: "mcts", adaptive: true },
  { id: "dig-critic", from: "mcts", to: "prac" },
  { id: "dig-embed", from: "mcts", to: "semantic" },
  { id: "dig-score", from: "mcts", to: "bayesian" },
  { id: "dig-graph", from: "mcts", to: "graph" },
  { id: "dig-card", from: "mcts", to: "evidence" },
  { id: "critic-card", from: "prac", to: "evidence" },
  { id: "score-card", from: "bayesian", to: "evidence" },
];

function edgeTouchesActive(edge: ActivityEdge, ids: Set<string>): boolean {
  return ids.has(edge.from) && ids.has(edge.to);
}

function layoutNodes(nodes: ActivityNode[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const source = nodes.filter((node) => node.id === "target");
  const core = nodes.filter((node) => ["mcts", "groq", "gemini"].includes(node.id));
  const tools = nodes.filter((node) => !source.includes(node) && !core.includes(node) && !["evidence"].includes(node.id));
  const output = nodes.filter((node) => node.id === "evidence");

  const ordered = [...source, ...core, ...tools, ...output].filter((node) => ids.has(node.id));
  const unique: ActivityNode[] = [];
  const seen = new Set<string>();
  for (const node of ordered) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      unique.push(node);
    }
  }
  return unique;
}

export function ReactorActivityOnly({ nodes }: { nodes: ActivityNode[] }) {
  const visibleNodes = useMemo(() => layoutNodes(nodes), [nodes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => EDGE_RULES.filter((edge) => edgeTouchesActive(edge, visibleIds)),
    [visibleIds],
  );

  const cols = Math.min(4, Math.max(1, visibleNodes.length));
  const cardW = 190;
  const cardH = 66;
  const colGap = 24;
  const rowGap = 56;
  const rows = visibleNodes.length ? Math.ceil(visibleNodes.length / cols) : 1;
  const canvasW = Math.max(760, cols * cardW + Math.max(0, cols - 1) * colGap + 56);
  const canvasH = Math.max(170, rows * cardH + Math.max(0, rows - 1) * (rowGap + cardH) + 72);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    visibleNodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      map.set(node.id, {
        x: 28 + col * (cardW + colGap) + cardW / 2,
        y: 28 + row * (cardH + rowGap + cardH) + cardH / 2,
      });
    });
    return map;
  }, [visibleNodes, cols]);

  return (
    <div
      data-testid="scheme-activity-only"
      aria-label="Live activity scheme"
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 28px 26px",
        boxSizing: "border-box",
      }}
    >
      {visibleNodes.length === 0 ? (
        <div
          data-testid="scheme-activity-empty"
          style={{
            width: "100%",
            maxWidth: 720,
            minHeight: 140,
            border: "1px dashed rgba(156,255,26,0.16)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#40556f",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "rgba(12,18,30,0.32)",
          }}
        >
          NO LIVE TOOL ACTIVITY
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              width: canvasW,
              minWidth: canvasW,
              height: canvasH,
              border: "1px solid rgba(156,255,26,0.08)",
              borderRadius: 10,
              background: "linear-gradient(180deg,rgba(12,21,37,0.8),rgba(10,17,32,0.92))",
              overflow: "hidden",
            }}
          >
            <svg
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              width="100%"
              height="100%"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
            >
              <defs>
                <marker id="reactorLiveArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="#b8ff4d" />
                </marker>
                <marker id="reactorAdaptiveArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="#9CFF1A" />
                </marker>
              </defs>
              {visibleEdges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                const forward = to.y >= from.y;
                const sx = from.x + (forward ? 0 : cardW / 2);
                const sy = from.y + (forward ? cardH / 2 : 0);
                const tx = to.x + (forward ? 0 : -cardW / 2);
                const ty = to.y + (forward ? -cardH / 2 : cardH / 2);
                const curve = Math.max(24, Math.abs(ty - sy) * 0.35);
                const d = forward
                  ? `M ${sx} ${sy} C ${sx} ${sy + curve} ${tx} ${ty - curve} ${tx} ${ty}`
                  : `M ${sx} ${sy} C ${sx + curve} ${sy} ${tx - curve} ${ty} ${tx} ${ty}`;
                return (
                  <path
                    key={edge.id}
                    d={d}
                    fill="none"
                    stroke={edge.adaptive ? "#9CFF1A" : "#b8ff4d"}
                    strokeWidth={1.4}
                    opacity={0.78}
                    strokeDasharray={edge.adaptive ? "6 4" : undefined}
                    markerEnd={`url(#${edge.adaptive ? "reactorAdaptiveArrow" : "reactorLiveArrow"})`}
                  />
                );
              })}
            </svg>

            {visibleNodes.map((node) => {
              const Icon = node.Icon;
              const pos = positions.get(node.id);
              if (!pos) return null;
              return (
                <div
                  key={"activity-" + node.id}
                  data-testid={"scheme-activity-node-" + node.id}
                  aria-label={node.label + ", active"}
                  style={{
                    position: "absolute",
                    left: pos.x - cardW / 2,
                    top: pos.y - cardH / 2,
                    width: cardW,
                    height: cardH,
                    borderRadius: node.type === "reactor" ? 10 : 7,
                    border: "1px solid " + node.color + "66",
                    background: "linear-gradient(135deg," + node.color + "14,rgba(8,14,25,0.92))",
                    boxShadow: "0 0 18px " + node.color + "18, inset 0 0 14px " + node.color + "0a",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "0 12px",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    zIndex: 2,
                  }}
                >
                  <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 5, border: "1px solid " + node.color + "55", background: node.color + "12", display: "flex", alignItems: "center", justifyContent: "center", color: node.color }}>
                    <Icon style={{ width: 14, height: 14 }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: node.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {node.label}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 9, color: node.color + "aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {node.sub}
                    </div>
                  </div>
                  <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: 999, background: node.color, boxShadow: "0 0 9px " + node.color }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
