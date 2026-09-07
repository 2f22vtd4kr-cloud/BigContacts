import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
let source = fs.readFileSync(target, "utf8");

const helper = `function buildBossDecisionContext(file: PlanInput["file"]): string {
  return JSON.stringify({
    target: file.target,
    hypotheses: file.hypotheses ?? [],
    evidenceSummary: file.evidenceSummary ?? {},
    specialistRoster: file.specialistRoster ?? [],
    actionQueue: file.actionQueue,
    contactRoutes: file.contactRoutes ?? [],
    humanDirectives: file.humanDirectives ?? [],
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

if (!source.includes("function buildBossDecisionContext(file: PlanInput[\"file\"]): string")) {
  const marker = "/** Apex Atlas Boss planning prompt — progress-aware, depth-aware, primary-source OSINT discipline. */";
  if (!source.includes(marker)) throw new Error("bureau Boss context patch: prompt marker missing");
  source = source.replace(marker, `${helper}\n${marker}`);
}

const fullContext = "${JSON.stringify(input.file, null, 2).slice(0, 100_000)}";
const compactContext = "${buildBossDecisionContext(input.file)}";
if (source.includes(fullContext)) source = source.replace(fullContext, compactContext);

fs.writeFileSync(target, source);
console.log("bureau Boss decision context patch: PASS");
