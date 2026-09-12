import fs from "node:fs";

const target = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const bureau = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "utf8");
const entrypoint = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const oversight = fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts", "utf8");

const checks = [
  ["target event callback is serialized", /investigationEventChain\s*=\s*investigationEventChain\.then/.test(target)],
  ["target event callback is drained", /await investigationEventChain;/.test(target)],
  ["bureau event callback is serialized", /investigationEventChain\s*=\s*investigationEventChain\.then/.test(bureau)],
  ["bureau event callback is drained", /await investigationEventChain;/.test(bureau)],
  ["target no fire-and-forget investigation callback", !/void input\.onInvestigationAct\?\./.test(target)],
  ["bureau no fire-and-forget investigation callback", !/void input\.onInvestigationAct\?\./.test(bureau)],
  ["target Investigator is stepped one act at a time", /maxIterations:\s*1/.test(entrypoint)],
  ["target act waits for Right Hand and Boss review", /await reviewTargetInvestigationAct\(/.test(entrypoint)],
  ["target act lookup is tied to durable case state", /loadTargetActOversightContext\(input\.caseId, input\.targetName\)/.test(entrypoint)],
  ["discovery bypasses target per-act gate", /input\.mode === "discovery"/.test(entrypoint)],
  ["oversight has explicit continue redirect stop dispositions", /continue.*redirect.*stop/s.test(oversight)],
  ["oversight fail-closes when Gemini is unavailable", /action: "stop"/.test(oversight) && /fail-closed/.test(oversight)],
  ["oversight persists control decisions", /eventType: "control_decision"/.test(oversight) && /investigatorActOversight/.test(oversight)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
