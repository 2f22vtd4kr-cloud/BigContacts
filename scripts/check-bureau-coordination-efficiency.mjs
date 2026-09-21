// Gemini Right-hand migration invariant: oversight remains a separate case-file-only layer.
// Final migration gate: investigators remain a distinct execution layer.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rightHand = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts"), "utf8");
const boss = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts"), "utf8");

const rightHandRequired = [
  "GEMINI_RIGHT_HAND_MODEL",
  "case_file_reasoning_only",
  "maxOutputTokens: 768",
  "You are Apex Atlas Right Hand. Reason only over the supplied case file.",
  "Never browse, use external research, or invent evidence",
  "compactCase(file: ResearchCaseFile)",
  "actionQueue",
  "investigationProgress",
  "decisionLog",
];
for (const marker of rightHandRequired) {
  if (!rightHand.includes(marker)) throw new Error(`bureau coordination guard failed in Gemini right-hand: missing ${marker}`);
}

const bossRequired = [
  "=== BUREAU CHAIN OF COMMAND / SHARED MIND ===",
  "RIGHT-HAND (Gemini) = diagnostic strategist",
  "BOSS (Gemini) = head investigator and integrator",
  "INVESTIGATOR (Groq/Mistral) = execution intelligence",
  "=== MOUNTING CASE STATE / COORDINATION LEDGER ===",
  "What is newly known since the previous iteration?",
  "What remains genuinely unresolved?",
  "What would be redundant with work already done?",
  "function buildBossDecisionContext(file: PlanInput[\"file\"]): string",
  "${buildBossDecisionContext(input.file)}",
  "actionFrontier: { queued, completed }",
  "contactRoutes: file.contactRoutes ?? [],",
  "negativeFindings: evidence.negativeFindings ?? [],",
];
for (const marker of bossRequired) {
  if (!boss.includes(marker)) throw new Error(`bureau coordination guard failed in Boss prompt: missing ${marker}`);
}

console.log("bureau coordination + efficiency guard: PASS");
