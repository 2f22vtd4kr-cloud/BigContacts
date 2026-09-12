import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/routes/atlas.ts", "utf8");
if (/(?:router|atlasRouter)\.post\(\"\/ingest\/atlas-run\"[\s\S]{0,500}runAtlasPipeline/.test(source)) {
  throw new Error("Legacy Atlas route still launches runAtlasPipeline");
}
if (/import\s+\{[^}]*runAtlasPipeline/.test(source)) {
  throw new Error("Legacy Atlas route still imports runAtlasPipeline");
}
const match = source.match(/(?:router|atlasRouter)\.post\(\"\/ingest\/atlas-run\"[\s\S]{0,500}/);
if (!match || !/status\(410\)/.test(match[0])) {
  throw new Error("Legacy Atlas POST launch is not explicitly quarantined with HTTP 410");
}
console.log("legacy Atlas launch boundary: PASS");
