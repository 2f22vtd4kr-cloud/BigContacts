import fs from "node:fs";

const failures = [];
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";

const schema = read("lib/db/src/schema/research_case_events.ts");
if (!/correlationKey:\s*text\("correlation_key"\)\.notNull\(\)/.test(schema)) failures.push("research_case_events.correlationKey must be NOT NULL at the schema boundary");
if (!/correlationKey:\s*z\.string\(\)\.trim\(\)\.min\(1\)/.test(schema)) failures.push("research case event insert validation must require a non-empty correlationKey");

const writers = {
  "canonical Atlas discovery": "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts",
  "bureau discovery trajectory": "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts",
  "Atlas control decision": "artifacts/api-server/src/src/lib/atlas-control-decision.ts",
  "target control decision": "artifacts/api-server/src/src/lib/target-control-decision.ts",
  "target act oversight": "artifacts/api-server/src/src/lib/target-act-oversight.ts",
  "target continuation authorization": "artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts",
  "discovery continuation": "artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts",
};
for (const [name, path] of Object.entries(writers)) {
  const source = read(path);
  if (!source) { failures.push(`${name}: writer source is missing`); continue; }
  if (!source.includes("researchCaseEventsTable")) { failures.push(`${name}: expected research event ledger dependency is missing`); continue; }
  if (!/correlationKey\s*:/.test(source)) failures.push(`${name}: research event writer has no durable correlationKey`);
}

const bureau = read(writers["bureau discovery trajectory"]);
if (bureau && /onConflictDoNothing\(\{ target: \[researchCaseEventsTable\.caseId, researchCaseEventsTable\.correlationKey\]/.test(bureau)) {
  if (!/Discovery trajectory replay mismatch/.test(bureau)) failures.push("bureau trajectory writer uses idempotent conflict handling without payload replay verification");
  if (!/Discovery claim replay mismatch/.test(bureau)) failures.push("bureau claim writer uses idempotent conflict handling without payload replay verification");
  if (!/Discovery promotion replay mismatch/.test(bureau)) failures.push("bureau promotion writer uses idempotent conflict handling without payload replay verification");
}

const targetControl = read(writers["target control decision"]);
if (targetControl && /onConflictDoNothing\(\{ target: \[researchCaseEventsTable\.caseId, researchCaseEventsTable\.correlationKey\]/.test(targetControl)) {
  if (!/Target control replay mismatch/.test(targetControl)) failures.push("target control writer uses idempotent conflict handling without payload replay verification");
  if (!/isolationLevel: "serializable"/.test(targetControl)) failures.push("target control projection/event persistence is not serialized");
}

const continuation = read(writers["target continuation authorization"]);
if (continuation && /researchCaseEventsTable/.test(continuation) && !/target-continuation:case:\$\{caseId\}:job:\$\{jobId\}:turn:\$\{controlTurn\}/.test(continuation)) failures.push("target continuation assignment is not bound to case/job/control turn");

const discoveryContinuation = read(writers["discovery continuation"]);
if (discoveryContinuation && /researchCaseEventsTable/.test(discoveryContinuation)) {
  if (!/discovery-continuation:case:\$\{caseId\}:job:\$\{jobId\}:turn:\$\{iteration\}:assignment/.test(discoveryContinuation)) failures.push("discovery continuation assignment is not bound to case/job/turn");
  if (!/discovery-continuation:case:\$\{caseId\}:job:\$\{jobId\}:turn:\$\{iteration\}:observation/.test(discoveryContinuation)) failures.push("discovery continuation observation is not bound to case/job/turn");
  if (!/Discovery continuation observation replay mismatch/.test(discoveryContinuation)) failures.push("discovery continuation observation conflict path does not verify exact replay payload");
  if (!/onConflictDoNothing\(\{ target: \[researchCaseEventsTable\.caseId, researchCaseEventsTable\.correlationKey\]/.test(discoveryContinuation)) failures.push("discovery continuation observation is missing explicit idempotent conflict handling");
  if (!/isolationLevel: "serializable"/.test(discoveryContinuation)) failures.push("discovery continuation DB projection/event persistence is not serialized");
}

if (failures.length) {
  console.error("Research event identity guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Research event identity/replay invariants are statically present.");
