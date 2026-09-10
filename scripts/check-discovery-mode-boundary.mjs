#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const bureau = read("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");
const atlas = read("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
const discovery = read("artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");
const core = read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/mode\?: "target" \| "discovery"/.test(bureau), "Bureau ReAct boundary does not expose an explicit target/discovery mode.");
assert(/mode === "discovery" \? "" : name/.test(bureau), "Discovery mode still passes a person-shaped target identity into the ReAct core.");
assert(/runAgenticWebResearch\(\{[\s\S]*mode/.test(bureau), "Bureau wrapper does not propagate explicit mode into the canonical ReAct core.");
assert(/mode: "discovery"[\s\S]*targetName: ""/.test(atlas), "Canonical Atlas discovery must mount the Investigator in first-class discovery mode without a fake target.");
assert(/mode: "discovery"[\s\S]*targetName: ""/.test(continuation), "Canonical discovery continuation must use first-class discovery mode without a fake target.");
assert(!/targetName:\s*"Discovery slot"/.test(discovery), "Canonical case-discovery route still uses the retired fake Discovery slot target.");
assert(!/targetName:\s*"Discovery continuation"/.test(continuation), "Canonical continuation route still uses a fake discovery target name.");
assert(/mode === "discovery"/.test(core), "Canonical ReAct core does not branch its institutional behavior on explicit discovery mode.");

if (failures.length) { console.error("DISCOVERY MODE BOUNDARY: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("DISCOVERY MODE BOUNDARY: PASS");
