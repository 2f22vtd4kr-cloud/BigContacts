import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let s = fs.readFileSync(path, "utf8");

// Discovery admission must know which URLs were actually visited. The previous
// batch patch accidentally omitted the trajectory argument, making every parsed
// candidate fail closed even after a successful visit.
const oldParse = "const slotCandidates = parsePersonFindings(result.findings ?? []);";
const newParse = "const slotCandidates = parsePersonFindings(result.findings ?? [], result.trajectory ?? []);";
if (s.includes(oldParse)) {
  s = s.replace(oldParse, newParse);
} else if (!s.includes(newParse)) {
  throw new Error("discovery candidate trajectory admission anchor not found");
}

// Ten concurrent discovery slots previously entered the provider loop at once.
// That is not research autonomy; it is an unbounded provider burst. Keep the
// model free to choose actions inside each run while bounding concurrent runs.
if (!s.includes("const AGENTIC_RESEARCH_CONCURRENCY")) {
  const marker = "const MAX_OBS = 5_000;";
  const insert = `${marker}\n\nconst AGENTIC_RESEARCH_CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.APEX_AGENTIC_CONCURRENCY || \"4\")));\nlet activeAgenticResearch = 0;\nconst pendingAgenticResearch: Array<() => void> = [];\n\nasync function acquireAgenticResearchSlot(): Promise<void> {\n  if (activeAgenticResearch < AGENTIC_RESEARCH_CONCURRENCY) {\n    activeAgenticResearch += 1;\n    return;\n  }\n  await new Promise<void>((resolve) => pendingAgenticResearch.push(resolve));\n  activeAgenticResearch += 1;\n}\n\nfunction releaseAgenticResearchSlot(): void {\n  activeAgenticResearch = Math.max(0, activeAgenticResearch - 1);\n  pendingAgenticResearch.shift()?.();\n}\n`;
  if (!s.includes(marker)) throw new Error("agentic constants anchor not found");
  s = s.replace(marker, insert);
}

// Rename the implementation and export a bounded wrapper. This applies to both
// discovery and person research, preventing provider overload without imposing
// any hop/query/source policy on the individual model run.
if (s.includes("export async function runAgenticWebResearch(input:")) {
  s = s.replace("export async function runAgenticWebResearch(input:", "async function runAgenticWebResearchUnbounded(input:");
  s += `\n\nexport async function runAgenticWebResearch(input: Parameters<typeof runAgenticWebResearchUnbounded>[0]): Promise<AgenticWebResearchResult> {\n  await acquireAgenticResearchSlot();\n  try {\n    return await runAgenticWebResearchUnbounded(input);\n  } finally {\n    releaseAgenticResearchSlot();\n  }\n}\n`;
}

fs.writeFileSync(path, s);
console.log("[apex-discovery-runtime-correctness] applied trajectory admission + bounded agentic concurrency");
