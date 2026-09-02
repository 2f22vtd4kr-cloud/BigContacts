import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reactorPath = path.join(repoRoot, "artifacts/apex-finder/src/pages/reactor.tsx");
const mobilePath = path.join(repoRoot, "artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");

function patchLiveFlag(filePath) {
  let s = fs.readFileSync(filePath, "utf8");
  if (!s.includes("const recentSpanMs")) {
    const anchor = '  const recentBureauMs = (() => {';
    if (!s.includes(anchor)) throw new Error(`recentBureauMs anchor missing: ${filePath}`);
    const insert = `  const recentSpanMs = (() => {\n    const spans = (atlasState as any)?.recentSpans;\n    if (!Array.isArray(spans) || spans.length === 0) return null as number | null;\n    const now = Date.now();\n    let newest = 0;\n    for (const span of spans.slice(0, 24)) {\n      if (String(span?.status || "") === "active") return 0;\n      const t = Date.parse(String(span?.startedAt || span?.endedAt || ""));\n      if (Number.isFinite(t) && t > newest) newest = t;\n    }\n    return newest > 0 ? now - newest : null;\n  })();\n`;
    s = s.replace(anchor, insert + anchor);
  }
  s = s.replace(
    '(recentBureauMs == null || recentBureauMs < 90_000)',
    '(recentSpanMs === 0 || recentSpanMs != null && recentSpanMs < 90_000 || recentBureauMs == null || recentBureauMs < 90_000)',
  );
  fs.writeFileSync(filePath, s);
}

function patchActivityOnlyScheme() {
  let s = fs.readFileSync(reactorPath, "utf8");

  // The scheme is an activity surface, not a poster. Its default mode must be
  // driven exclusively by currently-active Dig spans. Terminal/idle telemetry
  // must not leave target/core/output anchors or completed rods mounted.
  s = s.replace(
    'for (const s of spans) {\n    const blob = `${s.name}',
    'for (const s of spans) {\n    if (String(s.status ?? "").toLowerCase() !== "active") continue;\n    const blob = `${s.name}',
  );

  s = s.replace(
    'const AN = (isLive && liveNodes) ? liveNodes : new Set<string>();',
    'const AN = liveNodes ?? new Set<string>();',
  );
  s = s.replace(
    'const AE = isLive && liveNodes\n    ? new Set(EDGES.filter(e => liveNodes.has(e.from) || liveNodes.has(e.to)).map(e => e.id))\n    : new Set<string>();',
    'const AE = new Set(EDGES.filter(e => AN.has(e.from) && AN.has(e.to)).map(e => e.id));',
  );
  s = s.replace(
    'const adaptive = Boolean(isLive && liveNodes);',
    'const adaptive = AN.size > 0;',
  );

  const stateAnchor = '  const [schemeToolsOnly, setSchemeToolsOnly] = useState(true);\n';
  if (!s.includes('const schemeNodeDefs = useMemo')) {
    if (!s.includes(stateAnchor)) throw new Error("schemeToolsOnly anchor missing");
    const insert = `${stateAnchor}  // Default scheme = live activity only. Active nodes are compacted into the viewport\n  // without changing research semantics or implying a fixed tool order.\n  const schemeNodeDefs = useMemo(() => {\n    if (!schemeToolsOnly) return NODES;\n    const active = NODES.filter((n) => AN.has(n.id));\n    if (active.length === 0) return [];\n    const minX = Math.min(...active.map((n) => n.cx - n.w / 2));\n    const maxX = Math.max(...active.map((n) => n.cx + n.w / 2));\n    const minY = Math.min(...active.map((n) => n.cy - n.h / 2));\n    const maxY = Math.max(...active.map((n) => n.cy + n.h / 2));\n    const sourceW = Math.max(1, maxX - minX);\n    const sourceH = Math.max(1, maxY - minY);\n    const padX = 70;\n    const padY = 56;\n    const canvasW = 1120;\n    const canvasH = 560;\n    const usableW = canvasW - padX * 2;\n    const usableH = canvasH - padY * 2;\n    const sx = usableW / sourceW;\n    const sy = usableH / sourceH;\n    return active.map((n) => ({\n      ...n,\n      cx: padX + (n.cx - minX) * sx,\n      cy: padY + (n.cy - minY) * sy,\n    }));\n  }, [AN, schemeToolsOnly]);\n  const schemeNodeMap = useMemo(() => Object.fromEntries(schemeNodeDefs.map((n) => [n.id, n])), [schemeNodeDefs]);\n  const schemeEdges = useMemo(\n    () => EDGES.filter((e) => schemeNodeMap[e.from] && schemeNodeMap[e.to]),\n    [schemeNodeMap],\n  );\n  const schemeCanvasW = schemeToolsOnly ? 1120 : 1600;\n  const schemeCanvasH = schemeToolsOnly ? 560 : 842;\n`;
    s = s.replace(stateAnchor, insert);
  }

  // Dynamic canvas dimensions prevent the 1600x842 poster from forcing a
  // desktop viewport larger than the actual screen in Live tools mode.
  s = s.replace('const contentW = Math.max(1, 1600 * schemeZoom);', 'const contentW = Math.max(1, schemeCanvasW * schemeZoom);');
  s = s.replace('const contentH = Math.max(1, 842 * schemeZoom);', 'const contentH = Math.max(1, schemeCanvasH * schemeZoom);');
  s = s.replace('[schemeZoom, isLive]', '[schemeZoom, isLive, schemeCanvasW, schemeCanvasH]');
  s = s.replace('const contentW = 1600 * schemeZoom;', 'const contentW = schemeCanvasW * schemeZoom;');
  s = s.replace('const contentH = 842 * schemeZoom;', 'const contentH = schemeCanvasH * schemeZoom;');
  s = s.replace('width:"100%", height:"100%", minWidth:1600, minHeight:960,', 'width:"100%", height:"100%", minWidth:0, minHeight:0,');
  s = s.replace('overflow:"auto", position:"relative",', 'overflow:"hidden", position:"relative",');
  s = s.replace('position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:420,', 'position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,');
  s = s.replace('width:1600 * schemeZoom,\n          minWidth:1600 * schemeZoom,\n          height:842 * schemeZoom,', 'width:schemeCanvasW * schemeZoom,\n          minWidth:schemeCanvasW * schemeZoom,\n          height:schemeCanvasH * schemeZoom,');
  s = s.replace('position:"relative", width:1600, height:842, flexShrink:0,', 'position:"relative", width:schemeCanvasW, height:schemeCanvasH, flexShrink:0,');
  s = s.replace('width={1600}\n          height={842}', 'width={schemeCanvasW}\n          height={schemeCanvasH}');

  // Activity-only node/edge collections. Full map remains available explicitly.
  s = s.replace('{EDGES.map(e => {\n            const A = NM[e.from], B = NM[e.to];', '{schemeEdges.map(e => {\n            const A = schemeNodeMap[e.from], B = schemeNodeMap[e.to];');
  s = s.replace('{NODES.map(n => {\n          // Activity-only: do not mount inactive tool nodes while Live tools mode is on\n          if (schemeToolsOnly && isLive && liveNodes) {\n            const keep =\n              liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence";\n            if (!keep) return null;\n          }', '{schemeNodeDefs.map(n => {');
  s = s.replace('if (schemeToolsOnly && isLive && liveNodes) {\n              const keepEdge =\n                liveNodes.has(e.from) || liveNodes.has(e.to) ||\n                e.from === "target" || e.to === "target" ||\n                e.from === "mcts" || e.to === "mcts" ||\n                e.from === "evidence" || e.to === "evidence";\n              if (!keepEdge) return null;\n            }', '');
  s = s.replace('const edgeOpacity = focusedToolId\n              ? (touchesFocus || active ? 0.95 : 0.12)\n              : isLive && liveNodes\n                ? (active || AE.has(e.id) || liveNodes.has(e.from) || liveNodes.has(e.to)\n                    ? 0.85\n                    : (schemeToolsOnly ? 0 : 0.08))\n                : (active ? 0.92 : on ? 0.5 : queued || failed ? 0.45 : 0.22);', 'const edgeOpacity = focusedToolId\n              ? (touchesFocus || active ? 0.95 : 0.12)\n              : schemeToolsOnly\n                ? (active || AE.has(e.id) ? 0.9 : 0)\n                : (active ? 0.92 : on ? 0.5 : queued || failed ? 0.45 : 0.22);');

  // In activity mode there are no section rails/dividers; they are poster chrome.
  s = s.replace('{[\n          {y:200,label:"DIG CORE"},{y:340,label:"SEARCH · VISIT"},\n          {y:480,label:"TOOLS"},{y:620,label:"OUTCOME"},\n        ].map(({y,label}) => (', '{!schemeToolsOnly && [\n          {y:200,label:"DIG CORE"},{y:340,label:"SEARCH · VISIT"},\n          {y:480,label:"TOOLS"},{y:620,label:"OUTCOME"},\n        ].map(({y,label}) => (');
  s = s.replace('{[268,400,540,680].map(y => (', '{!schemeToolsOnly && [268,400,540,680].map(y => (');

  // Minimap uses the same compact activity coordinates and does not imply a full map.
  s = s.replace('{isLive && liveNodes && NODES.filter((n) => liveNodes.has(n.id)).map((n) => (', '{schemeToolsOnly && schemeNodeDefs.map((n) => (');
  s = s.replace('left: `${(n.cx / 1600) * 100}%`,\n                  top: `${(n.cy / 842) * 100}%`,', 'left: `${(n.cx / schemeCanvasW) * 100}%`,\n                  top: `${(n.cy / schemeCanvasH) * 100}%`,');

  // Live node status is span-driven regardless of whether the bureau job banner is live.
  s = s.replace('if (schemeToolsOnly && isLive && liveNodes) {', 'if (schemeToolsOnly && liveNodes) {');
  s = s.replace('const keep =\n              liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence";', 'const keep = liveNodes.has(n.id);');
  s = s.replace('const keep = liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence" || on;', 'const keep = liveNodes.has(n.id) || on;');
  s = s.replace('if (!schemeToolsOnly || !isLive || !liveNodes) return "visible" as const;', 'if (!schemeToolsOnly || !liveNodes) return "visible" as const;');
  s = s.replace('if (!schemeToolsOnly || !isLive || !liveNodes) return "auto" as const;', 'if (!schemeToolsOnly || !liveNodes) return "auto" as const;');
  s = s.replace('if (isLive && liveNodes) {\n                  const keep = liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence";', 'if (schemeToolsOnly && liveNodes) {\n                  const keep = liveNodes.has(n.id);');

  // Strict live state: never synthesize target/core activity when no active span exists.
  s = s.replace('        if (runStatus === "running" || runStatus === "paused") {\n          nodes.add("target");\n        }\n        for (const id of fromSpans) nodes.add(id);\n        if (fromSpans.size > 0) labels.push("Free dig tools active");', '        for (const id of fromSpans) nodes.add(id);\n        if (fromSpans.size > 0) labels.push("Free dig tools active");');
  s = s.replace('        if (fromSpans.size > 0) setLiveNodes(fromSpans);\n        else if (nodes.size > 0) setLiveNodes(nodes);\n        else setLiveNodes(new Set());', '        setLiveNodes(fromSpans);');

  if (!s.includes('const schemeNodeDefs = useMemo') || !s.includes('setLiveNodes(fromSpans);')) {
    throw new Error("activity-only scheme patch did not land");
  }
  fs.writeFileSync(reactorPath, s);
}

patchLiveFlag(reactorPath);
patchLiveFlag(mobilePath);
patchActivityOnlyScheme();

let s = fs.readFileSync(reactorPath, "utf8");
const importAnchor = 'import { readApiJson } from "@/lib/api-json";';
if (!s.includes('import { ReactorLiveSurface } from "../components/reactor-live-surface";')) {
  if (!s.includes(importAnchor)) throw new Error("reactor import anchor missing");
  s = s.replace(importAnchor, `${importAnchor}\nimport { ReactorLiveSurface } from "../components/reactor-live-surface";`);
}

const hookAnchor = 'const { deskEvents, latestNarration } = useBureauLiveDesk(atlasState?.eventLog as any, { enabled: true, atlasLive: Boolean(isLive) });';
if (!s.includes("const reactorLiveEvents = useMemo")) {
  if (!s.includes(hookAnchor)) throw new Error("reactor live desk hook anchor missing");
  const liveModel = `${hookAnchor}\n  // Live semantic feed is built from actual Bureau events plus actual Dig spans.\n  // Spans are authoritative for tool/model activity; event logs are supplemental.\n  const reactorLiveEvents = useMemo(() => {\n    const events = deskEvents.map((event: any, index: number) => ({\n      id: String(event.timestamp || "event") + "-" + String(event.stage || event.story || index),\n      timestamp: event.timestamp,\n      status: event.status === "active" ? "active" : event.status === "failed" ? "failed" : event.status === "queued" ? "queued" : "done",\n      method: event.methodKind || "unknown",\n      title: event.stage || event.story || event.narration || "Research event",\n      actor: event.actor,\n      provider: event.provider || event.activeToolId,\n      targetName: event.targetName,\n      query: event.inputSummary,\n      url: event.links?.[0]?.url || event.sourceUrls?.[0],\n      prompt: event.prompt,\n      resultSummary: event.resultSummary,\n      sourceUrls: event.sourceUrls,\n      sources: Array.isArray(event.links) ? event.links : undefined,\n      evidenceCount: event.evidence,\n      why: event.why,\n      links: Array.isArray(event.links) ? event.links : undefined,\n    }));\n    const spans = (atlasState?.recentSpans || []).map((span: any) => ({\n      id: "span-" + String(span.id),\n      timestamp: span.startedAt,\n      status: span.status === "active" ? "active" : span.status === "error" ? "failed" : "done",\n      method: span.spanType || "unknown",\n      title: span.name || span.toolName || "Research step",\n      actor: span.agentName || "investigator",\n      provider: span.modelId || span.toolName,\n      targetName: span.targetName,\n      query: span.inputSummary,\n      url: undefined,\n      resultSummary: span.resultSummary,\n      sourceUrls: undefined,\n      evidenceCount: undefined,\n      why: undefined,\n    }));\n    const merged = [...events, ...spans];\n    const seen = new Set<string>();\n    return merged.filter((e: any) => {\n      if (seen.has(e.id)) return false;\n      seen.add(e.id);\n      return true;\n    }).slice(-24);\n  }, [deskEvents, atlasState?.recentSpans]);`;
  s = s.replace(hookAnchor, liveModel);
}

const stageAnchor = `            <BureauOpsStage\n              events={`;
if (!s.includes(stageAnchor)) throw new Error("BureauOpsStage anchor missing");
if (!s.includes('data-testid="reactor-live-semantic-layer"')) {
  const surface = `            {isLive && reactorLiveEvents.length > 0 && (\n              <div className="mb-3" data-testid="reactor-live-semantic-layer">\n                <ReactorLiveSurface\n                  events={reactorLiveEvents as any}\n                  targetName={atlasState?.currentEntities?.[0] || atlasState?.atlasTelemetry?.targetName}\n                  compact\n                />\n              </div>\n            )}\n`;
  s = s.replace(stageAnchor, surface + stageAnchor);
}
fs.writeFileSync(reactorPath, s);
console.log("Applied truthful Live Desk: desktop/mobile live state accepts recent real Dig spans and renders their semantic feed");
