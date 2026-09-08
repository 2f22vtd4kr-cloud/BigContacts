import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Code2,
  Database,
  Globe2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type DigSpan = {
  id: string;
  jobId?: string;
  targetName?: string;
  spanType: "llm" | "tool" | "promote" | "error" | "stage" | string;
  name: string;
  status: "active" | "ok" | "error" | string;
  startedAt?: string;
  endedAt?: string;
  inputSummary?: string;
  resultSummary?: string;
  modelId?: string;
  parentSpanId?: string;
  agentName?: string;
  operationName?: string;
  toolName?: string;
  conversationId?: string;
};

type LiveNode = {
  id: string;
  span: DigSpan;
  label: string;
  sub: string;
  color: string;
  Icon: LucideIcon;
  kind: "llm" | "tool" | "promote" | "stage" | "error";
};

type LiveEdge = { id: string; from: string; to: string; exact: boolean };

const PALETTE = ["#9CFF1A", "#38bdf8", "#fb923c", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#67e8f9"];

function stableColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function iconForSpan(span: DigSpan): LucideIcon {
  const text = `${span.toolName ?? ""} ${span.name} ${span.operationName ?? ""}`.toLowerCase();
  if (span.spanType === "llm") return span.agentName?.toLowerCase().includes("boss") ? Sparkles : Brain;
  if (span.spanType === "promote") return CheckCircle2;
  if (span.spanType === "error") return ShieldCheck;
  if (/search|exa|tavily|serper|google|bing/.test(text)) return Search;
  if (/browser|visit|page|fetch|scrape|crawl/.test(text)) return Globe2;
  if (/registry|edgar|sec|companies|land|faa|rdap|whois|dns|opencorporates/.test(text)) return Database;
  if (/graph|network|relationship/.test(text)) return Network;
  if (/code|script|execute/.test(text)) return Code2;
  if (span.spanType === "stage") return Activity;
  return Wrench;
}

function kindForSpan(span: DigSpan): LiveNode["kind"] {
  if (span.spanType === "llm") return "llm";
  if (span.spanType === "promote") return "promote";
  if (span.spanType === "error" || span.status === "error") return "error";
  if (span.spanType === "stage") return "stage";
  return "tool";
}

function labelForSpan(span: DigSpan): string {
  return String(span.toolName || span.name || span.operationName || span.spanType || "LIVE TOOL")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .slice(0, 34);
}

function subForSpan(span: DigSpan): string {
  const bits = [span.operationName, span.agentName, span.modelId].filter(Boolean);
  if (bits.length) return bits.join(" · ").slice(0, 48);
  return span.spanType === "tool" ? "Live tool call" : span.spanType === "llm" ? "Live reasoning" : "Live Bureau event";
}

function timeOf(span: DigSpan): number {
  const value = span.startedAt ? Date.parse(span.startedAt) : NaN;
  return Number.isFinite(value) ? value : 0;
}

/**
 * The Reactor graph is telemetry-first: no catalogue of possible tools is used.
 * Every active DigSpan becomes its own visual node, including tools Apex has
 * never seen before. Parent-span edges are authoritative when available.
 * A same-conversation temporal fallback is deliberately softer and only fills
 * a gap where instrumentation did not provide parentSpanId.
 */
export function ReactorActivityOnly({ nodes: _legacyNodes }: { nodes?: unknown[] }) {
  const [spans, setSpans] = useState<DigSpan[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

    const pull = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${base}/api/ingest/atlas-status`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const runStatus = String(data?.runStatus ?? data?.status ?? "").toLowerCase();
        const isLive = runStatus === "running";
        const active = Array.isArray(data?.recentSpans)
          ? data.recentSpans.filter((span: DigSpan) => String(span?.status ?? "").toLowerCase() === "active")
          : [];
        if (!cancelled) {
          setLive(isLive);
          setSpans(isLive ? active : []);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setLive(false);
          setSpans([]);
        }
      }
    };

    void pull();
    const timer = window.setInterval(() => void pull(), 1200);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);
    };
  }, []);

  const activeNodes = useMemo<LiveNode[]>(() => {
    return spans
      .filter((span) => span?.id && String(span.status).toLowerCase() === "active")
      .sort((a, b) => timeOf(a) - timeOf(b))
      .map((span) => ({
        id: `span:${span.id}`,
        span,
        label: labelForSpan(span),
        sub: subForSpan(span),
        color: stableColor(String(span.toolName || span.name || span.id)),
        Icon: iconForSpan(span),
        kind: kindForSpan(span),
      }));
  }, [spans]);

  const edges = useMemo<LiveEdge[]>(() => {
    const byId = new Map(activeNodes.map((node) => [node.span.id, node.id]));
    const out: LiveEdge[] = [];
    const edgeKeys = new Set<string>();

    for (const node of activeNodes) {
      const parent = node.span.parentSpanId ? byId.get(node.span.parentSpanId) : undefined;
      if (!parent || parent === node.id) continue;
      const key = `${parent}->${node.id}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      out.push({ id: `parent:${key}`, from: parent, to: node.id, exact: true });
    }

    for (let i = 1; i < activeNodes.length; i += 1) {
      const previous = activeNodes[i - 1];
      const current = activeNodes[i];
      if (current.span.parentSpanId) continue;
      if (!previous.span.conversationId || previous.span.conversationId !== current.span.conversationId) continue;
      const key = `${previous.id}->${current.id}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      out.push({ id: `sequence:${key}`, from: previous.id, to: current.id, exact: false });
    }
    return out;
  }, [activeNodes]);

  const cardW = 188;
  const cardH = 68;
  const colGap = 34;
  const rowGap = 62;
  const cols = Math.max(1, Math.min(5, Math.ceil(Math.sqrt(Math.max(1, activeNodes.length)))));
  const rows = Math.max(1, Math.ceil(activeNodes.length / cols));
  const canvasW = Math.max(780, cols * cardW + (cols - 1) * colGap + 64);
  const canvasH = Math.max(190, rows * cardH + (rows - 1) * rowGap + 72);

  const positions = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    activeNodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      result.set(node.id, {
        x: 32 + col * (cardW + colGap) + cardW / 2,
        y: 32 + row * (cardH + rowGap) + cardH / 2,
      });
    });
    return result;
  }, [activeNodes, cols]);

  return (
    <div
      data-testid="scheme-activity-only"
      aria-label="Live Bureau tool activity graph"
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
                const d = `M ${from.x} ${from.y + cardH / 2} C ${from.x} ${from.y + cardH / 2 + 26} ${to.x} ${to.y - cardH / 2 - 26} ${to.x} ${to.y - cardH / 2}`;
                return <path key={edge.id} d={d} fill="none" stroke={edge.exact ? "#b8ff4d" : "#64748b"} strokeWidth={edge.exact ? 1.7 : 1} strokeDasharray={edge.exact ? "none" : "5 5"} opacity={edge.exact ? 0.85 : 0.55} markerEnd={`url(#${edge.exact ? "reactorLiveArrow" : "reactorSoftArrow"})`} />;
              })}
            </svg>

            {activeNodes.map((node) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const Icon = node.Icon;
              return (
                <div
                  key={node.id}
                  data-testid={`scheme-live-span-${node.span.id}`}
                  aria-label={`${node.label}, active`}
                  style={{ position: "absolute", left: pos.x - cardW / 2, top: pos.y - cardH / 2, width: cardW, height: cardH, borderRadius: node.kind === "llm" ? 12 : 8, border: `1px solid ${node.color}66`, background: `linear-gradient(135deg,${node.color}15,rgba(8,14,25,0.94))`, boxShadow: `0 0 20px ${node.color}18, inset 0 0 16px ${node.color}0a`, display: "flex", alignItems: "center", gap: 9, padding: "0 12px", overflow: "hidden", boxSizing: "border-box", zIndex: 2 }}
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
        Live telemetry only · nodes disappear when their active spans end · solid links are parent-span flow · dashed links are same-conversation fallback
      </div>
    </div>
  );
}
