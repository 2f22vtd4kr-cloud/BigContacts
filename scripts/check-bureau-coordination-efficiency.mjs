import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rightHand = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts"),
  "utf8",
);
const boss = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts"),
  "utf8",
);

const rightHandRequired = [
  "max_tokens: 4096",
  "BUREAU CHAIN OF COMMAND / SHARED MIND",
  "Every iteration must produce a meaningful delta in the case frontier",
  "do not merely repeat the previous Investigator result",
  "recentDecisions: file.decisionLog.slice(-5)",
  "buildRightHandDecisionContext(file)",
];
for (const marker of rightHandRequired) {
  if (!rightHand.includes(marker)) {
    throw new Error(`bureau coordination guard failed in right-hand: missing ${marker}`);
  }
}

const bossRequired = [
  "=== BUREAU CHAIN OF COMMAND / SHARED MIND ===",
  "RIGHT-HAND (DeepSeek) = diagnostic strategist",
  "BOSS (Gemini) = head investigator and integrator",
  "INVESTIGATOR (Groq/Mistral) = execution intelligence",
  "=== MOUNTING CASE STATE / COORDINATION LEDGER ===",
  "What is newly known since the previous iteration?",
  "What remains genuinely unresolved?",
  "What would be redundant with work already done?",
  "buildBossDecisionContext(input.file)",
];
for (const marker of bossRequired) {
  if (!boss.includes(marker)) {
    throw new Error(`bureau coordination guard failed in Boss prompt: missing ${marker}`);
  }
}

console.log("bureau coordination + efficiency guard: PASS");
