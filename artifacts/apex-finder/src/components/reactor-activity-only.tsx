import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Database,
  Globe2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useReactorLiveTelemetry, type LiveActivity } from "../lib/reactor-live-store";

type LiveNode = {
  id: string;
  activity: LiveActivity;
  label: string;
  sub: string;
  color: string;
  Icon: LucideIcon;
};

type LiveEdge = { id: string; from: string; to: string; exact: boolean };
type Position = { x: number; y: number };

const PALETTE = ["#9CFF1A", "#38bdf8", "#fb923c", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#67e8f9"];

function stableColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function iconForActivity(activity: LiveActivity): LucideIcon {
  const text = `${activity.tool ?? ""} ${activity.operation ?? ""} ${activity.spanType ?? ""}`.toLowerCase();
  if (activity.spanType === "llm") return activity.agent?.toLowerCase().includes("boss") ? Sparkles : Brain;
  if (activity.spanType === "promote") return CheckCircle2;
  if (activity.status === "failed") return ShieldCheck;
  if (/search|serper|tavily|exa|google|bing/.test(text)) return Search;
  if (/browser|visit|page|fetch|scrape|crawl/.test(text)) return Globe2;
  if (/registry|edgar|sec|companies|rdap|whois|dns|opencorporates/.test(text)) return Database;
  if (/graph|network|relationship/.test(text)) return Network;
  return Activity;
}

function labelForActivity(activity: LiveActivity): string {
  return String(activity.tool || activity.operation || activity.spanType || "LIVE ACTIVITY")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .slice(0, 34);
}

function subForActivity(activity: LiveActivity): string {
  const bits = [activity.operation, activity.agent].filter(Boolean);
  if (bits.length) return bits.join(" · ").slice(0, 48);
  return activity.spanType === "tool" ? "Live tool call" : activity.spanType === "llm" ? "Live model call" : "Live Bureau event";
}

function timeOf(activity: LiveActivity): number {
  const value = activity.startedAt ? Date.parse(activity.startedAt) : NaN;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Telemetry-only Reactor graph. The legacy `nodes` input is retained solely so
 * older callers compile; it is deliberately ignored. The graph consumes the
 * same normalized external store as the live textual surface.
 */
export function ReactorActivityOnly({ activities }: { activities?: LiveActivity[]; nodes?: unknown[] }) {
  const telemetry = useReactorLiveTelemetry();
  const [reducedMotion, setReducedMotion] = useState(false);
  const sourceActivities = activities ?? telemetry.activities;
  const live = telemetry.runStatus === "running" || telemetry.runStatus === "paused";

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const activeActivities = useMemo(() => sourceActivities
    .filter((activity) => activity.status === "active" && activity.spanType === "tool" && Boolean(activity.tool))
    .sort((a, b) => timeOf(a) - timeOf(b)), [sourceActivities]);

  const activeNodes = useMemo<LiveNode[]>(() => activeActivities.map((activity) => ({
    id: `span:${activity.id}`,
    activity,
    label: labelForActivity(activity),
    sub: subForActivity(activity),
    color: stableColor(String(activity.tool || activity.id)),
    Icon: iconForActivity(activity),
  })), [activeActivities]);

  const edges = useMemo<LiveEdge[]>(() => {
    const byId = new Map(activeNodes.map((node) => [node.activity.id, node.id]));
    const out: LiveEdge[] = [];
    const edgeKeys = new Set<string>();
    const previousByConversation = new Map<string, LiveNode>();

    for (const node of activeNodes) {
      const parent = node.activity.parentId ? byId.get(node.activity.parentId) : undefined;
      if (parent && parent !== node.id) {
        const key = `${parent}->${node.id}`;
        edgeKeys.add(key);
        out.push({ id: `parent:${key}`, from: parent, to: node.id, exact: true });
      }

      const conversation = node.activity.jobId;
      const previous = conversation ? previousByConversation.get(conversation) : undefined;
      if (previous && previous.id !== node.id) {
        const key = `${previous.id}->${node.id}`;
        const parentVisible = Boolean(node.activity.parentId && byId.has(node.activity.parentId));
        if (!parentVisible && !edgeKeys.has(key)) {
          edgeKeys.add(key);
          out.push({ id: `inferred:${key}`, from: previous.id, to: node.id, exact: false });
        }
      }
      if (conversation) previousByConversation.set(conversation, node);
    }
    return out;
  }, [activeNodes]);

  const { positions, canvasW, canvasH } = useMemo(() => {
    const cardW = 188;
    const cardH = 68;
    const colGap = 48;
    const rowGap = 34;
    const horizontalPadding = 52;
    const verticalPadding = 44;
    const byId = new Map(activeNodes.map((node) => [node.id, node]));
    const exactParents = new Map<string, string>();
    for (const edge of edges) {
      if (edge.exact && !exactParents.has(edge.to) && byId.has(edge.from)) exactParents.set(edge.to, edge.from);
    }

    const depthMemo = new Map<string, number>();
    const depthOf = (id: string, visiting = new Set<string>()): number => {
      const cached = depthMemo.get(id);
      if (cached !== undefined) return cached;
      if (visiting.has(id)) return 0;
      const parent = exactParents.get(id);
      if (!parent || !byId.has(parent)) {
        depthMemo.set(id, 0);
        return 0;
      }
      visiting.add(id);
      const depth = depthOf(parent, visiting) + 1;
      visiting.delete(id);
      depthMemo.set(id, depth);
      return depth;
    };

    const layers = new Map<number, LiveNode[]>();
    for (const node of activeNodes) {
      const depth = depthOf(node.id);
      const layer = layers.get(depth) ?? [];
      layer.push(node);
      layers.set(depth, layer);
    }

    const orderedLayers = [...layers.entries()].sort(([a], [b]) => a - b);
    const maxRows = Math.max(1, ...orderedLayers.map(([, layer]) => layer.length));
    const width = Math.max(860, maxRows * cardW + Math.max(0, maxRows - 1) * colGap + horizontalPadding * 2);
    const height = Math.max(190, orderedLayers.length * cardH + Math.max(0, orderedLayers.length - 1) * rowGap + verticalPadding * 2);
    const result = new Map<string, Position>();

    for (const [depth, layer] of orderedLayers) {
      const rowWidth = layer.length * cardW + Math.max(0, layer.length - 1) * colGap;
      const startX = (width - rowWidth) / 2;
      const y = verticalPadding + depth * (cardH + rowGap);
      layer.forEach((node, index) => {
        result.set(node.id, { x: startX + index * (cardW + colGap) + cardW / 2, y: y + cardH / 2 });
      });
    }
    return { positions: result, canvasW: width, canvasH: height };
  }, [activeNodes, edges]);

  const cardW = 188;
  const cardH = 68;

  return (
    <div
      data-testid="scheme-activity-only"
      aria-label="Live Bureau activity graph"
      style={{ flex: 1, minHeight: 0, width: "100%", overflow: "auto", padding: "18px 28px 26px", boxSizing: "border-box" }}
    >
      {!live || activeNodes.length === 0 ? (
        <div
          data-testid="scheme-activity-empty"
          style={{ width: "100%", maxWidth: 720, minHeight: 140, margin: "0 auto", border: "1px dashed rgba(156,255,26,0.16)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#40556f", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", background: "rgba(12,18,30,0.32)" }}
        >
          {live ? "NO LIVE TOOL ACTIVITY" : "BUREAU IDLE — NO LIVE GRAPH"}
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto", display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: canvasW, minWidth: canvasW, height: canvasH, border: "1px solid rgba(156,255,26,0.08)", borderRadius: 10, background: "linear-gradient(180deg,rgba(12,21,37,0.8),rgba(10,17,32,0.92))", overflow: "hidden" }}>
            <svg viewBox={`0 0 ${canvasW} ${canvasH}`} width="100%" height="100%" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
              <defs>
                <marker id="reactorLiveArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#b8ff4d" /></marker>
                <marker id="reactorSoftArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#64748b" /></marker>
              </defs>
              {edges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                const forward = to.y >= from.y;
                const startX = from.x;
                const startY = forward ? from.y + cardH / 2 : from.y - cardH / 2;
                const endX = to.x;
                const endY = forward ? to.y - cardH / 2 : to.y + cardH / 2;
                const bend = Math.max(22, Math.abs(endY - startY) * 0.42);
                const d = `M ${startX} ${startY} C ${startX} ${startY + (forward ? bend : -bend)} ${endX} ${endY - (forward ? bend : -bend)} ${endX} ${endY}`;
                return <path key={edge.id} d={d} fill="none" stroke={edge.exact ? "#b8ff4d" : "#64748b"} strokeWidth={edge.exact ? 1.7 : 1} strokeDasharray={edge.exact ? "none" : "5 5"} opacity={edge.exact ? 0.85 : 0.55} markerEnd={`url(#${edge.exact ? "reactorLiveArrow" : "reactorSoftArrow"})`} />;
              })}
            </svg>

            {activeNodes.map((node) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const Icon = node.Icon;
              const activity = node.activity;
              return (
                <div
                  key={node.id}
                  data-testid={`scheme-live-span-${activity.id}`}
                  aria-label={`${node.label}, active`}
                  style={{
                    position: "absolute",
                    left: pos.x - cardW / 2,
                    top: pos.y - cardH / 2,
                    width: cardW,
                    height: cardH,
                    borderRadius: activity.spanType === "llm" ? 12 : 8,
                    border: `1px solid ${node.color}66`,
                    background: `linear-gradient(135deg,${node.color}15,rgba(8,14,25,0.94))`,
                    boxShadow: `0 0 20px ${node.color}18, inset 0 0 16px ${node.color}0a`,
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "0 12px",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    zIndex: 2,
                    transition: reducedMotion ? "none" : "left 420ms ease, top 420ms ease, opacity 180ms ease, transform 180ms ease",
                  }}
                >
                  <div style={{ width: 29, height: 29, flexShrink: 0, borderRadius: 6, border: `1px solid ${node.color}55`, background: `${node.color}12`, display: "flex", alignItems: "center", justifyContent: "center", color: node.color }}>
                    <Icon style={{ width: 15, height: 15 }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 750, letterSpacing: "0.045em", color: node.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.label}</div>
                    <div style={{ marginTop: 3, fontSize: 8.5, color: `${node.color}aa`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.sub}</div>
                  </div>
                  <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: 999, background: node.color, boxShadow: `0 0 9px ${node.color}` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ marginTop: 8, textAlign: "center", color: "#334155", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Live telemetry only · active tool spans only · nodes disappear when tool spans retire · solid links are observed parent flow · dashed links are inferred sequence
      </div>
    </div>
  );
}
