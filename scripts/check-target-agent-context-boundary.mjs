import fs from "node:fs";
import assert from "node:assert/strict";

const target = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const canonical = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");

assert(target.includes("refusing context-free Investigator run"), "Target Investigator must refuse context-free execution.");
assert(/const contextDocument = typeof input\.contextDocument === "string" \? input\.contextDocument\.trim\(\) : "";/.test(target), "Target Investigator must normalize durable context before execution.");
assert(/if \(!contextDocument\)\s*\{[\s\S]*?status:\s*["']unavailable["']/.test(target), "Missing durable context must fail closed before Investigator execution.");
assert(/runTargetContactAgent\(\{[\s\S]*?contextDocument:\s*actContext/.test(canonical), "Canonical single-target runner must mount the durable act context into Target Investigator.");
assert(canonical.includes("appendDurableActContext"), "Canonical single-target runner must append each Investigator result to durable context.");
assert(/appendDurableActContext\([\s\S]*?lastOversight/.test(canonical), "Canonical single-target runner must persist the completed act result together with oversight context.");
assert(/caseFile:\s*JSON\.stringify\(\{ \.\.\.caseState, contextDocument, lastOversight \}\)/.test(canonical), "Canonical single-target runner must persist the updated context document after each act.");
assert(!/contextDocument\.slice\(/.test(canonical), "Canonical target runner must not discard durable context via string slicing.");
assert(!/actContext\.slice\(/.test(canonical), "Canonical target runner must not clip the bounded act context outside the canonical compactor.");
assert(canonical.includes("compactInvestigationContext"), "Canonical target runner must use the bounded context compactor rather than ad-hoc clipping.");
console.log("Target Investigator context-boundary checks passed.");
