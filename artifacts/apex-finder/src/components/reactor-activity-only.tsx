import React, { useMemo } from "react";
import { Activity, Brain, CheckCircle2, Code2, Database, Globe2, Network, Search, ShieldCheck, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { useReactorLiveSnapshot } from "../lib/reactor-live-store";
import type { LiveActivity } from "../lib/reactor-live-model";

type LiveNode = { id: string; activity: LiveActivity; label: string; sub: string; color: string; Icon: LucideIcon; kind: "llm" | "tool" | "promote" | "stage" | "error" };
type LiveEdge = { id: string; from: string; to: string; exact: boolean };
type Position = { x: number; y: number };

const PALETTE = ["#9CFF1A", "#38bdf8", "#fb923c", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#67e8f9"];

function stableColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function iconFor(activity: LiveActivity): LucideIcon {
  const text = `${activity.tool ?? ""} ${activity.operation ?? ""} ${activity.spanType ?? ""}`.toLowerCase();
  if (activity.spanType === "llm") return activity.agent?.toLowerCase().includes("boss") ? Sparkles : Brain;
  if (activity.spanType === "promote") return CheckCircle2;
  if (activity.spanType === "error" || activity.status === "failed") return ShieldCheck;
  if (/search|exa|tavily|serper|google|bing/.test(text)) return Search;
  if (/browser|visit|page|fetch|scrape|crawl/.test(text)) return Globe2;
  if (/registry|edgar|sec|companies|land|faa|rdap|whois|dns|opencorporates/.test(text)) return Database;
  if (/graph|network|relationship/.test(text)) return Network;
  if (/code|script|execute/.test(text)) return Code2;
  if (activity.spanType === "stage") return Activity;
  return Wrench;
}

function labelFor(activity: LiveActivity): string {
  return String(activity.tool || activity.operation || activity.spanType || "LIVE TOOL").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).slice(0, 34);
}

function subFor(activity: LiveActivity): string {
  const bits = [activity.operation, activity.agent, activity.target].filter(Boolean);
  return bits.length ? bits.join(" · ").slice(0, 48) : activity.spanType === "llm" ? "Live reasoning" : "Live tool call";
}

function timeOf(activity: LiveActivity): number {
  const value = activity.startedAt ? Date.parse(activity.startedAt) : NaN;
  return Number.isFinite(value) ? value : 0;
}

export function ReactorActivityOnly({ nodes: _legacyNodes }: { nodes?: unknown[] }) {
  const { runStatus, activities } = useReactorLiveSnapshot();
  const live = runStatus === "running";
  const activeActivities = useMemo(() => activities.filter((activity) => activity.status === "active").sort((a, b) => timeOf(a) - timeOf(b)), [activities]);

  const activeNodes = useMemo<LiveNode[]>(() => activeActivities.map((activity) => ({
    id: `span:${activity.id}`,
    activity,
    label: labelFor(activity),
    sub: subFor(activity),
    color: stableColor(String(activity.tool || activity.operation || activity.id)),
    Icon: iconFor(activity),
    kind: activity.spanType === "llm" ? "llm" : activity.spanType === "promote" ? "promote" : activity.status === "failed" ? "error" : activity.spanType === "stage" ? "stage" : "tool",
  })), [activeActivities]);

  const edges = useMemo<LiveEdge[]>(() => {
    const byId = new Map(activeNodes.map((node) => [node.activity.id, node.id]));
    const out: LiveEdge[] = [];
    const keys = new Set<string>();
    const previousByConversation = new Map<string, LiveNode>();
    for (const node of activeNodes) {
      const parent = node.activity.parentId ? byId.get(node.activity.parentId) : undefined;
      if (parent) {
        const key = `${parent}->${node.id}`;
        keys.add(key);
        out.push({ id: `parent:${key}`, from: parent, to: node.id, exact: true });
      }
      const conversation = node.activity.jobId;
      const previous = conversation ? previousByConversation.get(conversation) : undefined;
      if (previous && previous.id !== node.id && !keys.has(`${previous.id}->${node.id}`) && !parent) {
        const key = `${previous.id}->${node.id}`;
        keys.add(key);
        out.push({ id: `sequence:${key}`, from: previous.id, to: node.id, exact: false });
      }
      if (conversation) previousByConversation.set(conversation, node);
    }
    return out;
  }, [activeNodes]);

  const { positions, canvasW, canvasH } = useMemo(() => {
    const cardW = 188, cardH = 68, colGap = 48, rowGap = 34, hp = 52, vp = 44;
    const byId = new Map(activeNodes.map((node) => [node.id, node]));
    const parents = new Map<string, string>();
    for (const edge of edges) if (edge.exact && !parents.has(edge.to) && byId.has(edge.from)) parents.set(edge.to, edge.from);
    const memo = new Map<string, number>();
    const depthOf = (id: string, visiting = new Set<string>()): number => {
      const cached = memo.get(id); if (cached !== undefined) return cached;
      const parent = parents.get(id); if (!parent || visiting.has(id)) { memo.set(id, 0); return 0; }
      visiting.add(id); const depth = depthOf(parent, visiting) + 1; visiting.delete(id); memo.set(id, depth); return depth;
    };
    const layers = new Map<number, LiveNode[]>();
    for (const node of activeNodes) { const depth = depthOf(node.id); const layer = layers.get(depth) ?? []; layer.push(node); layers.set(depth, layer); }
    const ordered = [...layers.entries()].sort(([a], [b]) => a - b);
    const maxRows = Math.max(1, ...ordered.map(([, layer]) => layer.length));
    const width = Math.max(860, maxRows * cardW + Math.max(0, maxRows - 1) * colGap + hp * 2);
    const height = Math.max(190, ordered.length * cardH + Math.max(0, ordered.length - 1) * rowGap + vp * 2);
    const result = new Map<string, Position>();
    for (const [depth, layer] of ordered) {
      const rowWidth = layer.length * cardW + Math.max(0, layer.length - 1) * colGap;
      const startX = (width - rowWidth) / 2;
      const y = vp + depth * (cardH + rowGap);
      layer.forEach((node, index) => result.set(node.id, { x: startX + index * (cardW + colGap) + cardW / 2, y: y + cardH / 2 }));
    }
    return { positions: result, canvasW: width, canvasH: height };
  }, [activeNodes, edges]);

  const cardW = 188, cardH = 68;
  return (
    <div data-testid="scheme-activity-only" aria-label="Live Bureau tool activity graph" style={{ flex: 1, minHeight: 0, width: "100%", overflow: "auto", padding: "18px 28px 26px", boxSizing: "border-box" }}>
      {!live || activeNodes.length === 0 ? (
        <div data-testid="scheme-activity-empty" style={{ width: "100%", maxWidth: 720, minHeight: 140, margin: "0 auto", border: "1px dashed rgba(156,255,26,0.16)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#40556f", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", background: "rgba(12,18,30,0.32)" }}>{live ? "NO LIVE TOOL ACTIVITY" : "BUREAU IDLE — NO LIVE GRAPH"}</div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto", display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: canvasW, minWidth: canvasW, height: canvasH, border: "1px solid rgba(156,255,26,0.08)", borderRadius: 10, background: "linear-gradient(180deg,rgba(12,21,37,0.8),rgba(10,17,32,0.92))", overflow: "hidden" }}>
            <svg viewBox={`0 0 ${canvasW} ${canvasH}`} width="100%" height="100%" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
              <defs><marker id="reactorLiveArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#b8ff4d" /></marker><marker id="reactorSoftArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#64748b" /></marker></defs>
              {edges.map((edge) => { const from = positions.get(edge.from), to = positions.get(edge.to); if (!from || !to) return null; const forward = to.y >= from.y; const startY = forward ? from.y + cardH / 2 : from.y - cardH / 2; const endY = forward ? to.y - cardH / 2 : to.y + cardH / 2; const bend = Math.max(22, Math.abs(endY - startY) * 0.42); const d = `M ${from.x} ${startY} C ${from.x} ${startY + (forward ? bend : -bend)} ${to.x} ${endY - (forward ? bend : -bend)} ${to.x} ${endY}`; return <path key={edge.id} d={d} fill="none" stroke={edge.exact ? "#b8ff4d" : "#64748b"} strokeWidth={edge.exact ? 1.7 : 1} strokeDasharray={edge.exact ? "none" : "5 5"} opacity={edge.exact ? 0.85 : 0.55} markerEnd={`url(#${edge.exact ? "reactorLiveArrow" : "reactorSoftArrow"})`} />; })}
            </svg>
            {activeNodes.map((node) => { const pos = positions.get(node.id); if (!pos) return null; const Icon = node.Icon; return <div key={node.id} data-testid={`scheme-live-span-${node.activity.id}`} aria-label={`${node.label}, active`} style={{ position: "absolute", left: pos.x - cardW / 2, top: pos.y - cardH / 2, width: cardW, height: cardH, borderRadius: node.kind === "llm" ? 12 : 8, border: `1px solid ${node.color}66`, background: `linear-gradient(135deg,${node.color}15,rgba(8,14,25,0.94))`, boxShadow: `0 0 20px ${node.color}18, inset 0 0 16px ${node.color}0a`, display: "flex", alignItems: "center", gap: 9, padding: "0 12px", overflow: "hidden", boxSizing: "border-box", zIndex: 2, transition: "left 420ms ease, top 420ms ease, opacity 180ms ease, transform 180ms ease" }}><div style={{ width: 29, height: 29, flexShrink: 0, borderRadius: 6, border: `1px solid ${node.color}55`, background: `${node.color}12`, display: "flex", alignItems: "center", justifyContent: "center", color: node.color }}><Icon style={{ width: 15, height: 15 }} /></div><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 10.5, fontWeight: 750, letterSpacing: "0.045em", color: node.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.label}</div><div style={{ marginTop: 3, fontSize: 8.5, color: `${node.color}aa`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.sub}</div></div><span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: 999, background: node.color, boxShadow: `0 0 9px ${node.color}` }} /></div>; })}
          </div>
        </div>
      )}
      <div style={{ marginTop: 8, textAlign: "center", color: "#334155", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>Live telemetry only · shared atlas snapshot · solid links are observed parent flow · dashed links are inferred same-job sequence</div>
    </div>
  );
}
