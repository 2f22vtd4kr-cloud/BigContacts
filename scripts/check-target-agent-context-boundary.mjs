import fs from "node:fs";
import assert from "node:assert/strict";

const target = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const canonical = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");

assert(target.includes("refusing context-free Investigator run"), "Target Investigator must refuse context-free execution.");
assert(/const contextDocument = typeof input\.contextDocument === "string" \? input\.contextDocument\.trim\(\) : "";/.test(target), "Target Investigator must normalize durable context before execution.");
assert(/if \(!contextDocument\)\s*\{[\s\S]*?status:\s*["']unavailable["']/.test(target), "Missing durable context must fail closed before Investigator execution.");
assert(/runTargetContactAgent\(\{[\s\S]*?contextDocument\s*\}/.test(canonical), "Canonical single-target runner must mount durable context into Target Investigator.");
console.log("Target Investigator context-boundary checks passed.");
