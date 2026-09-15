import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "artifacts/apex-finder/src/pages/data-sources.tsx");
const helperPath = path.join(root, "scripts/apply-investigator-ui-source-boundary.mjs");
const boundaryCheckPath = path.join(root, "scripts/check-investigator-ui-source-boundary.mjs");

const before = fs.readFileSync(sourcePath, "utf8");
assert.match(before, /\/api\/enrich\/python-tools/, "legitimate Python tools endpoint must remain intact");
assert.match(before, /Runs inside the canonical Investigator/, "canonical Investigator boundary text must remain intact");
assert.doesNotMatch(before, /canonical Investigator<id>/, "malformed canonical Investigator replacement must be absent");
assert.doesNotMatch(before, /\/api\/enrich\/(?:openownership|equasis|adsb-history|holehe|maigret|sherlock|theharvester)\b/, "retired direct research URLs must be absent");

execFileSync(process.execPath, [helperPath], { cwd: root, stdio: "pipe" });
const afterFirstRun = fs.readFileSync(sourcePath, "utf8");
assert.equal(afterFirstRun, before, "first source-boundary run must not mutate tracked source");

execFileSync(process.execPath, [helperPath], { cwd: root, stdio: "pipe" });
const afterSecondRun = fs.readFileSync(sourcePath, "utf8");
assert.equal(afterSecondRun, afterFirstRun, "second source-boundary run must be equivalent to the first");

execFileSync(process.execPath, [boundaryCheckPath], { cwd: root, stdio: "pipe" });
console.log("INVESTIGATOR UI SOURCE BOUNDARY IDEMPOTENCE: PASS");