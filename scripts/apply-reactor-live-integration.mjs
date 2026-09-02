import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/apex-finder/src/pages/reactor.tsx");
let s = fs.readFileSync(targetPath, "utf8");

const importAnchor = 'import { readApiJson } from "@/lib/api-json";';
if (!s.includes('import { ReactorLiveSurface } from "../components/reactor-live-surface";')) {
  if (!s.includes(importAnchor)) throw new Error("reactor import anchor missing");
  s = s.replace(importAnchor, `${importAnchor}\nimport { ReactorLiveSurface } from "../components/reactor-live-surface";`);
}

const hookAnchor = 'const { deskEvents, latestNarration } = useBureauLiveDesk(atlasState?.eventLog as any, { enabled: true, atlasLive: Boolean(isLive) });';
if (!s.includes("const reactorLiveEvents = useMemo")) {
  if (!s.includes(hookAnchor)) throw new Error("reactor live desk hook anchor missing");
  const liveModel = `${hookAnchor}\n  // Live semantic feed is built from actual Bureau events plus actual Dig spans.\n  // Spans are authoritative for tool/model activity; event logs are supplemental.\n  const reactorLiveEvents = useMemo(() => {\n    const events = deskEvents.map((event: any, index: number) => ({\n      id: String(event.timestamp || "event") + "-" + String(event.stage || event.story || index),\n      timestamp: event.timestamp,\n      status: event.status === "active" ? "active" : event.status === "failed" ? "failed" : event.status === "queued" ? "queued" : "done",\n      method: event.methodKind || "unknown",\n      title: event.stage || event.story || event.narration || "Research event",\n      actor: event.actor,\n      provider: event.provider || event.activeToolId,\n      targetName: event.targetName,\n      query: event.inputSummary,\n      url: event.links?.[0]?.url || event.sourceUrls?.[0],\n      prompt: event.prompt,\n      resultSummary: event.resultSummary,\n      sourceUrls: event.sourceUrls,\n      sources: Array.isArray(event.links) ? event.links : undefined,\n      evidenceCount: event.evidence,\n      why: event.why,\n      links: Array.isArray(event.links) ? event.links : undefined,\n    }));\n    const spans = (atlasState?.recentSpans || []).map((span: any) => ({\n      id: `span-${span.id}`,\n      timestamp: span.startedAt,\n      status: span.status === "active" ? "active" : span.status === "error" ? "failed" : "done",\n      method: span.spanType || "unknown",\n      title: span.name || span.toolName || "Research step",\n      actor: span.agentName || "investigator",\n      provider: span.modelId || span.toolName,\n      targetName: span.targetName,\n      query: span.inputSummary,\n      url: undefined,\n      resultSummary: span.resultSummary,\n      sourceUrls: undefined,\n      evidenceCount: undefined,\n      why: undefined,\n    }));\n    const merged = [...events, ...spans];\n    const seen = new Set<string>();\n    return merged.filter((e: any) => {\n      if (seen.has(e.id)) return false;\n      seen.add(e.id);\n      return true;\n    }).slice(-24);\n  }, [deskEvents, atlasState?.recentSpans]);`;
  s = s.replace(hookAnchor, liveModel);
}

const stageAnchor = `            <BureauOpsStage\n              events={`;
if (!s.includes(stageAnchor)) throw new Error("BureauOpsStage anchor missing");
if (!s.includes('data-testid="reactor-live-semantic-layer"')) {
  const surface = `            {isLive && reactorLiveEvents.length > 0 && (\n              <div className="mb-3" data-testid="reactor-live-semantic-layer">\n                <ReactorLiveSurface\n                  events={reactorLiveEvents as any}\n                  targetName={atlasState?.currentEntities?.[0] || atlasState?.atlasTelemetry?.targetName}\n                  compact\n                />\n              </div>\n            )}\n`;
  s = s.replace(stageAnchor, surface + stageAnchor);
}

fs.writeFileSync(targetPath, s);
console.log("Applied Reactor Live semantic integration: desktop feed uses real Bureau events and recent Dig spans");
