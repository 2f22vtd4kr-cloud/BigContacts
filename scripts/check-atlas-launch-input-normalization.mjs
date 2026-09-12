import fs from "node:fs";

const middleware = fs.readFileSync("artifacts/api-server/src/src/middlewares/normalize-atlas-launch-body.ts", "utf8");
const canonicalLauncher = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts", "utf8");
const router = fs.readFileSync("artifacts/api-server/src/src/routes/index.ts", "utf8");
const legacyAtlas = fs.readFileSync("artifacts/api-server/src/src/routes/atlas.ts", "utf8");
const requiredFields = ["discoveryFirst", "includeLandRegistry", "skipIngestion", "hotLeadsOnly", "runResearch", "skipFaa"];
let failed = false;
for (const field of requiredFields) {
  if (!middleware.includes(`"${field}"`)) {
    console.error(`ATLAS INPUT NORMALIZATION FAIL: missing field ${field}`);
    failed = true;
  }
}
if (!/value === "true"/.test(middleware) || !/value === "false"/.test(middleware)) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: strict true/false parsing missing");
  failed = true;
}
if (!router.includes("router.use(normalizeAtlasLaunchBody)")) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: normalization middleware is not mounted before API routes");
  failed = true;
}
if (!router.includes("router.use(canonicalAtlasLaunchRouter)") || !router.includes("router.use(atlasRouter)")) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: Atlas launch/status router topology changed unexpectedly");
  failed = true;
}
if (router.indexOf("router.use(canonicalAtlasLaunchRouter)") > router.indexOf("router.use(atlasRouter)")) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: legacy Atlas router precedes canonical launcher");
  failed = true;
}
if (/Boolean\(body\./.test(canonicalLauncher)) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: canonical launcher directly coerces raw request booleans");
  failed = true;
}
if (!canonicalLauncher.includes("router.post(\"/ingest/atlas-run\"")) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: canonical launcher route missing");
  failed = true;
}
// atlas.ts is now a compatibility quarantine stub. Keep the route-shape check
// but bind it to the exported router name and require an explicit 410 response.
if (!legacyAtlas.includes('atlasRouter.post("/ingest/atlas-run"') || !legacyAtlas.includes("res.status(410)")) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: legacy Atlas compatibility stub is not an explicit 410 quarantine");
  failed = true;
}
if (failed) process.exit(1);
console.log("ATLAS INPUT NORMALIZATION: PASS — canonical launch receives normalized booleans and owns the public Atlas entrypoint");
