import fs from "node:fs";

const persona = fs.readFileSync("artifacts/api-server/src/src/lib/persona-engine.ts", "utf8");
const improve = fs.readFileSync("artifacts/api-server/src/src/routes/improve.ts", "utf8");
const forbidden = /\b(fetch|axios|got)\s*\(|runBureauAgenticWebPass|runTargetContactAgent|runGeminiBossDiscovery|runDeepSeekFreeJson|callGroqJson|callMistralJson/;
const checks = [
  ["persona engine has no outbound network transport", !forbidden.test(persona)],
  ["persona engine has no Investigator execution import", !/agentic-web-research|target-contact-agent|bureau-agentic-pass/.test(persona)],
  ["persona route is the only mounted runtime consumer", /runPersonasForEntity/.test(improve)],
  ["persona findings are suggestions/remediations, not research execution", !/router\.post\([\"']\/improve\/.*research|runBureauAgenticWebPass|runTargetContactAgent/.test(improve)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("DEV PERSONA BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("DEV PERSONA BOUNDARY: PASS");
