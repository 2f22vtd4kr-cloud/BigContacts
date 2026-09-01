import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Canonical source now owns the discovery admission boundary and modelFindings
// contract. This script is a compatibility guard for older checkouts that
// predate the permanent source change; it must be idempotent and must never
// fail because an old text anchor disappeared.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const discoveryPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/discovery-agent.ts");
const researchPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let discovery = fs.readFileSync(discoveryPath, "utf8");
let research = fs.readFileSync(researchPath, "utf8");

const hasCanonicalModelFindings =
  research.includes("modelFindings: AgenticFinding[]") && discovery.includes("result.modelFindings");

const oldParse = "const slotCandidates = parsePersonFindings(result.findings ?? []);";
const newParse = "const slotCandidates = parsePersonFindings(result.findings ?? [], result.trajectory ?? []);";
if (discovery.includes(oldParse)) {
  discovery = discovery.replace(oldParse, newParse);
} else if (!discovery.includes(newParse) && !hasCanonicalModelFindings) {
  console.log("[apex-discovery-runtime-correctness] legacy admission anchor absent; leaving source unchanged");
}

// Keep this guard independent from the modelFindings guard above. The previous
// early exit accidentally skipped the concurrent-run gate once the permanent
// admission boundary landed, leaving the test and intended runtime contract
// out of sync. This gate limits only simultaneous independent runs; it does not
// constrain any model action within a run.
if (!research.includes("const AGENTIC_RESEARCH_CONCURRENCY")) {
  const marker = "const MAX_OBS = 5_000;";
  if (research.includes(marker)) {
    const insert = `${marker}\n\nconst AGENTIC_RESEARCH_CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.APEX_AGENTIC_CONCURRENCY || "1")));\nlet activeAgenticResearch = 0;\nconst pendingAgenticResearch: Array<() => void> = [];\n\nasync function acquireAgenticResearchSlot(): Promise<void> {\n  if (activeAgenticResearch < AGENTIC_RESEARCH_CONCURRENCY) { activeAgenticResearch += 1; return; }\n  await new Promise<void>((resolve) => pendingAgenticResearch.push(resolve));\n  activeAgenticResearch += 1;\n}\n\nfunction releaseAgenticResearchSlot(): void {\n  activeAgenticResearch = Math.max(0, activeAgenticResearch - 1);\n  pendingAgenticResearch.shift()?.();\n}\n`;
    research = research.replace(marker, insert);
  }
}

if (research.includes("export async function runAgenticWebResearch(input:") && !research.includes("async function runAgenticWebResearchUnbounded")) {
  research = research.replace("export async function runAgenticWebResearch(input:", "async function runAgenticWebResearchUnbounded(input:");
  research += `\n\nexport async function runAgenticWebResearch(input: Parameters<typeof runAgenticWebResearchUnbounded>[0]): Promise<AgenticWebResearchResult> {\n  await acquireAgenticResearchSlot();\n  try { return await runAgenticWebResearchUnbounded(input); } finally { releaseAgenticResearchSlot(); }\n}\n`;
}

fs.writeFileSync(discoveryPath, discovery);
fs.writeFileSync(researchPath, research);
console.log("[apex-discovery-runtime-correctness] compatibility hardening applied/idempotent");
