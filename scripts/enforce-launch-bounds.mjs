#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  discovery: path.join(root, "artifacts/api-server/src/src/lib/discovery-agent.ts"),
  orchestrator: path.join(root, "artifacts/api-server/src/src/lib/atlas-orchestrator.ts"),
};

let discovery = fs.readFileSync(files.discovery, "utf8");
// The discovery agent is a bounded production lane, not a general batch runner.
discovery = discovery.replace(
  "Math.min(\n      10,\n      Number.isFinite(Number(input.targetCount))",
  "Math.min(\n      3,\n      Number.isFinite(Number(input.targetCount))",
);
fs.writeFileSync(files.discovery, discovery);

let orchestrator = fs.readFileSync(files.orchestrator, "utf8");
orchestrator = orchestrator.replace(
  "Math.max(1, Math.min(50, opts.targetCount ?? 3))",
  "Math.max(1, Math.min(3, opts.targetCount ?? 3))",
);
fs.writeFileSync(files.orchestrator, orchestrator);

console.log("LAUNCH_BOUNDS_ENFORCED: discovery=3 orchestrator=3");
