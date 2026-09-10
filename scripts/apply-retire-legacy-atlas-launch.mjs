import fs from "node:fs";

const path = "artifacts/api-server/src/src/routes/atlas.ts";
let source = fs.readFileSync(path, "utf8");
const start = source.indexOf('router.post("/ingest/atlas-run"');
const endMarker = '// ── POST /ingest/atlas-pause';
const end = source.indexOf(endMarker, start);
if (start >= 0 && end > start) {
  source = source.slice(0, start) + 'router.post("/ingest/atlas-run", (_req: Request, res: Response): void => {\n  res.status(410).json({ error: "Legacy Atlas launch retired. Use the canonical model-owned Atlas launch boundary." });\n});\n\n' + source.slice(end);
}
source = source.replace('import { runAtlasPipeline, type AtlasOptions } from "../lib/atlas-orchestrator";\n', '');
source = source.replace('import { CANONICAL_ATLAS_LAUNCH_BODY } from "../lib/atlas-launch-defaults";\n', '');
fs.writeFileSync(path, source);
console.log("legacy Atlas launch boundary hardened");
