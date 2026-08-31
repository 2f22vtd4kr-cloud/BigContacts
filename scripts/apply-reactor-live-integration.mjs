import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/apex-finder/src/pages/reactor.tsx");
let s = fs.readFileSync(targetPath, "utf8");

if (s.includes('import { ReactorLiveSurface } from "../components/reactor-live-surface";')) {
  console.log("Reactor Live integration already present");
  process.exit(0);
}

const importAnchor = 'import { readApiJson } from "@/lib/api-json";';
if (!s.includes(importAnchor)) throw new Error("reactor import anchor missing");
s = s.replace(importAnchor, `${importAnchor}\nimport { ReactorLiveSurface } from "../components/reactor-live-surface";`);

const hookAnchor = 'const { deskEvents, latestNarration } = useBureauLiveDesk(atlasState?.eventLog as any, { enabled: true, atlasLive: Boolean(isLive) });';
if (!s.includes(hookAnchor)) throw new Error("reactor live desk hook anchor missing");
const liveModel = `${hookAnchor}\n  // Shared semantic event envelope: the live surface may only render fields carried by Bureau events.\n  const reactorLiveEvents = useMemo(() => deskEvents.map((event: any, index: number) => ({\n    id: String(event.timestamp || "event") + "-" + String(event.stage || event.story || index),\n    timestamp: event.timestamp,\n    status: event.status === "active" ? "active" : event.status === "failed" ? "failed" : event.status === "queued" ? "queued" : "done",\n    method: "unknown",\n    title: event.stage || event.story || event.narration || "Research event",\n    actor: event.actor,\n    provider: event.provider || event.activeToolId,\n    targetName: event.targetName,\n    query: event.inputSummary,\n    url: event.links?.[0]?.url || event.sourceUrls?.[0],\n    prompt: event.prompt,\n    resultSummary: event.resultSummary,\n    sourceUrls: event.sourceUrls,\n    sources: Array.isArray(event.links) ? event.links : undefined,\n    evidenceCount: event.evidence,\n    why: event.why,\n    links: Array.isArray(event.links) ? event.links : undefined,\n  })), [deskEvents]);`;
s = s.replace(hookAnchor, liveModel);

const stageAnchor = `            <BureauOpsStage\n              events={`;
if (!s.includes(stageAnchor)) throw new Error("BureauOpsStage anchor missing");
const surface = `            {isLive && reactorLiveEvents.length > 0 && (\n              <div className="mb-3" data-testid="reactor-live-semantic-layer">\n                <ReactorLiveSurface\n                  events={reactorLiveEvents as any}\n                  targetName={atlasState?.currentEntities?.[0] || atlasState?.atlasTelemetry?.targetName}\n                  compact\n                />\n              </div>\n            )}\n`;
s = s.replace(stageAnchor, surface + stageAnchor);

fs.writeFileSync(targetPath, s);
console.log("Applied Reactor Live semantic integration: desktop Live Desk now renders normalized real Bureau events before legacy ops scenes");
