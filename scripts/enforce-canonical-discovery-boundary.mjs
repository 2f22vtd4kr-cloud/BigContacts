#!/usr/bin/env node
import fs from "node:fs";

const discoveryPath = "artifacts/api-server/src/src/lib/discovery-agent.ts";
const orchestratorPath = "artifacts/api-server/src/src/lib/atlas-orchestrator.ts";

let discovery = fs.readFileSync(discoveryPath, "utf8");
const oldDiscoveryBound = "Math.min(\n      10,\n      Number.isFinite(Number(input.targetCount))";
if (discovery.includes(oldDiscoveryBound)) {
  discovery = discovery.replace(oldDiscoveryBound, "Math.min(\n      3,\n      Number.isFinite(Number(input.targetCount))");
}
if (!/Math\.min\(\s*3,\s*Number\.isFinite\(Number\(input\.targetCount\)\)/s.test(discovery)) {
  throw new Error("canonical discovery batch bound was not found");
}
fs.writeFileSync(discoveryPath, discovery);

let orchestrator = fs.readFileSync(orchestratorPath, "utf8");
const oldLimit = "Math.max(1, Math.min(50, opts.targetCount ?? 3))";
if (orchestrator.includes(oldLimit)) {
  orchestrator = orchestrator.replace(oldLimit, "Math.max(1, Math.min(3, opts.targetCount ?? 3))");
}
if (!/Math\.max\(1, Math\.min\(3, opts\.targetCount \?\? 3\)\)/.test(orchestrator)) {
  throw new Error("canonical orchestrator target bound was not found");
}

const canonicalRehydrate = /\n      \/\/ Promotion is evidence\/card mapping, not a research-path gate\.[\s\S]*?\n      const rehydrated = await rehydrateEntityCardFromEvidence\(entity\.id\);\n      if \(rehydrated\) \{[\s\S]*?\n      \}\n/;
if (canonicalRehydrate.test(orchestrator)) {
  orchestrator = orchestrator.replace(
    canonicalRehydrate,
    "\n      // Canonical agentic promotion is applied only by the strict investigator-decision boundary.\n      // Do not rehydrate/rank durable evidence here; that would give deterministic code promotion authority.\n",
  );
}
fs.writeFileSync(orchestratorPath, orchestrator);

if (/Promotion is evidence\/card mapping, not a research-path gate/.test(orchestrator)) {
  throw new Error("canonical deterministic rehydration bypass remains");
}
console.log("CANONICAL_DISCOVERY_BOUNDARY_ENFORCED");
