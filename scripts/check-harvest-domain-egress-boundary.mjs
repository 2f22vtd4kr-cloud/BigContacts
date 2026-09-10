import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const checks = [
  ["harvest capability remains model-visible", core.includes('action: { type: "string"') && core.includes('"harvest_domain"')],
  ["theHarvester is not directly executed by canonical core", !/runTheHarvester\(/.test(core)],
  ["harvest action explicitly fails closed", /HARVEST_DOMAIN blocked: network-capable subprocess egress is not yet governed/.test(core)],
  ["blocked harvest action is represented as blocked execution", /action\.action === "harvest_domain"[\s\S]{0,500}record\.execution = "blocked"/.test(core)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("HARVEST DOMAIN EGRESS BOUNDARY: PASS");
console.log("- model may select harvest_domain, but ungoverned subprocess network I/O fails closed");
