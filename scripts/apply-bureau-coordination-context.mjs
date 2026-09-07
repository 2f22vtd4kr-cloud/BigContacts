import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts");
let source = fs.readFileSync(target, "utf8");

const helper = `function buildRightHandDecisionContext(file: ResearchCaseFile): string {
  const queued = (file.actionQueue ?? []).filter((action) => action.status === "queued").slice().sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0)).slice(0, 16);
  const recentCompleted = (file.actionQueue ?? []).filter((action) => action.status !== "queued").slice(-8);
  const evidence = file.evidenceSummary ?? {};
  return JSON.stringify({
    target: file.target,
    hypotheses: (file.hypotheses ?? []).slice(-12),
    evidenceSummary: {
      discoveredPeople: (evidence.discoveredPeople ?? []).slice(-16),
      relatedOrganizations: (evidence.relatedOrganizations ?? []).slice(-16),
      searchGaps: (evidence.searchGaps ?? []).slice(-16),
      negativeFindings: (evidence.negativeFindings ?? []).slice(-16),
    },
    specialistRoster: file.specialistRoster ?? [],
    actionFrontier: { queued, recentCompleted },
    contactRoutes: (file.contactRoutes ?? []).slice(-16),
    humanDirectives: (file.humanDirectives ?? []).slice(-8),
    decisionLog: (file.decisionLog ?? []).slice(-8),
    rightHandAdvice: file.rightHandAdvice ?? null,
    bossPlan: file.bossPlan ?? null,
    nextBestAction: file.nextBestAction ?? null,
    lastUpdatedBy: file.lastUpdatedBy,
    investigationProgress: file.investigationProgress ?? null,
    researchDepth: file.researchDepth ?? null,
    noProgressStreak: file.noProgressStreak ?? 0,
  }, null, 2);
}
`;

if (!source.includes("function buildRightHandDecisionContext(file: ResearchCaseFile)")) {
  const marker = "function buildReasoningPrompt(file: ResearchCaseFile, iteration: number): string {";
  if (!source.includes(marker)) throw new Error("bureau coordination context patch: reasoning prompt marker missing");
  source = source.replace(marker, `${helper}\n${marker}`);
}

const fullContext = "${JSON.stringify(file, null, 2).slice(0, 100_000)}";
const compactContext = "${buildRightHandDecisionContext(file)}";
if (source.includes(fullContext)) source = source.replace(fullContext, compactContext);

source = source.replace(
  "recentDecisions: file.decisionLog.slice(-5)",
  "recentDecisions: (file.decisionLog ?? []).slice(-8)",
);
source = source.replace(
  "Every iteration must move the shared case state forward. A recommendation that merely repeats the last successful lane is low quality unless new evidence makes that repetition necessary.",
  "Every iteration must produce a meaningful delta in the case frontier.\ndo not merely repeat the previous Investigator result unless new evidence makes that repetition necessary.",
);

fs.writeFileSync(target, source);
console.log("bureau coordination context patch: PASS");
