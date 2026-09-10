import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const orchestrator = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/contact-research-orchestrator.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/contact-research.ts"), "utf8");
const researchRoutes = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research.ts"), "utf8");

const checks = [
  ["orchestrator no longer imports legacy web OSINT", !orchestrator.includes('"../routes/phase-j"') && !orchestrator.includes('"../routes/phase-j.ts"')],
  ["orchestrator no longer contains deterministic target selection", !orchestrator.includes("async function selectTargets")],
  ["orchestrator start is explicitly retired", orchestrator.includes("The legacy contact-research control plane is retired")],
  ["public contact-research launch is retired", route.includes('router.post("/ingest/contact-research"') && route.includes('res.status(410)')],
  ["public contact-research cancel is retired", route.includes('router.post("/ingest/contact-research/cancel"') && route.includes('res.status(410)')],
  ["legacy MCTS/bulk research remains unmounted", researchRoutes.includes("intentionally not mounted")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
