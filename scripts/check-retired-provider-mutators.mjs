import fs from "node:fs";
const files = [
  "scripts/apply-agentic-concurrency-hardening.mjs",
  "scripts/apply-agentic-provider-retry-policy.mjs",
];
const failures = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  if (!/RETIRED:/.test(source)) failures.push(`${file} is not marked RETIRED`);
  if (/fs\.writeFileSync/.test(source)) failures.push(`${file} still contains a source write`);
  if (/cross[- ]provider|other configured Investigator|provider fallback/i.test(source) && !/RETIRED:/i.test(source)) failures.push(`${file} contains active cross-Investigator fallback logic`);
}
if (failures.length) { console.error("RETIRED PROVIDER MUTATORS: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("RETIRED PROVIDER MUTATORS: PASS");
