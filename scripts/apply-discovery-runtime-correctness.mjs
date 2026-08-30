import fs from "node:fs";

const discoveryPath = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let discovery = fs.readFileSync(discoveryPath, "utf8");

const oldParse = "const slotCandidates = parsePersonFindings(result.findings ?? []);";
const newParse = "const slotCandidates = parsePersonFindings(result.findings ?? [], result.trajectory ?? []);";
if (discovery.includes(oldParse)) {
  discovery = discovery.replace(oldParse, newParse);
} else if (!discovery.includes(newParse)) {
  throw new Error("discovery candidate trajectory admission anchor not found");
}
fs.writeFileSync(discoveryPath, discovery);

const researchPath = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let research = fs.readFileSync(researchPath, "utf8");

// Ten concurrent discovery slots previously entered the provider loop at once.
// Bound concurrent runs while leaving each individual run fully model-directed.
if (!research.includes("const AGENTIC_RESEARCH_CONCURRENCY")) {
  const marker = "const MAX_OBS = 5_000;";
  const insert = `${marker}\n\nconst AGENTIC_RESEARCH_CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.APEX_AGENTIC_CONCURRENCY || \"4\")));\nlet activeAgenticResearch = 0;\nconst pendingAgenticResearch: Array<() => void> = [];\n\nasync function acquireAgenticResearchSlot(): Promise<void> {\n  if (activeAgenticResearch < AGENTIC_RESEARCH_CONCURRENCY) {\n    activeAgenticResearch += 1;\n    return;\n  }\n  await new Promise<void>((resolve) => pendingAgenticResearch.push(resolve));\n  activeAgenticResearch += 1;\n}\n\nfunction releaseAgenticResearchSlot(): void {\n  activeAgenticResearch = Math.max(0, activeAgenticResearch - 1);\n  pendingAgenticResearch.shift()?.();\n}\n`;
  if (!research.includes(marker)) throw new Error("agentic constants anchor not found");
  research = research.replace(marker, insert);
}

if (research.includes("export async function runAgenticWebResearch(input:")) {
  research = research.replace("export async function runAgenticWebResearch(input:", "async function runAgenticWebResearchUnbounded(input:");
  research += `\n\nexport async function runAgenticWebResearch(input: Parameters<typeof runAgenticWebResearchUnbounded>[0]): Promise<AgenticWebResearchResult> {\n  await acquireAgenticResearchSlot();\n  try {\n    return await runAgenticWebResearchUnbounded(input);\n  } finally {\n    releaseAgenticResearchSlot();\n  }\n}\n`;
}

fs.writeFileSync(researchPath, research);
console.log("[apex-discovery-runtime-correctness] trajectory admission + bounded agentic concurrency applied");
