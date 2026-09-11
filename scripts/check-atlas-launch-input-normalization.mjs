import fs from "node:fs";

const middleware = fs.readFileSync("artifacts/api-server/src/src/middlewares/normalize-atlas-launch-body.ts", "utf8");
const launcher = fs.readFileSync("artifacts/api-server/src/src/routes/atlas.ts", "utf8");
const requiredFields = ["discoveryFirst", "includeLandRegistry", "skipIngestion", "hotLeadsOnly", "runResearch", "skipFaa"];
let failed = false;
for (const field of requiredFields) {
  if (!middleware.includes(`"${field}"`)) {
    console.error(`ATLAS INPUT NORMALIZATION FAIL: missing field ${field}`);
    failed = true;
  }
}
for (const field of requiredFields) {
  if (!new RegExp(`Boolean\\(body\\.${field}\\)`).test(launcher) && field !== "runResearch") continue;
  console.error(`ATLAS INPUT NORMALIZATION FAIL: launcher still directly Boolean() coerces ${field}`);
  failed = true;
}
if (!/value === "true"/.test(middleware) || !/value === "false"/.test(middleware)) {
  console.error("ATLAS INPUT NORMALIZATION FAIL: strict true/false parsing missing");
  failed = true;
}
if (failed) process.exit(1);
console.log("ATLAS INPUT NORMALIZATION: PASS — canonical launch booleans are normalized before orchestration");
