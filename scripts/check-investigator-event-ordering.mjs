import fs from "node:fs";

const target = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const bureau = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "utf8");

const checks = [
  ["target event callback is serialized", /investigationEventChain\s*=\s*investigationEventChain\.then/.test(target)],
  ["target event callback is drained", /await investigationEventChain;/.test(target)],
  ["bureau event callback is serialized", /investigationEventChain\s*=\s*investigationEventChain\.then/.test(bureau)],
  ["bureau event callback is drained", /await investigationEventChain;/.test(bureau)],
  ["target no fire-and-forget investigation callback", !/void input\.onInvestigationAct\?\./.test(target)],
  ["bureau no fire-and-forget investigation callback", !/void input\.onInvestigationAct\?\./.test(bureau)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
