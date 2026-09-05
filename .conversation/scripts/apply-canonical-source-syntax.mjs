#!/usr/bin/env node
import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/atlas-orchestrator.ts";
let source = fs.readFileSync(path, "utf8");

const broken = `      || \"\").replace(/^https?:\\/\\/(www\\.)?instagram\\.com\\//, \"\").replace(/\\?.*$/, \"\")`;
const fixed = `      || (ihResult?.instagram ?? \"\").replace(/^https?:\\/\\/(www\\.)?instagram\\.com\\//, \"\").replace(/\\?.*$/, \"\")`;

if (source.includes(broken)) {
  source = source.replace(broken, fixed);
  fs.writeFileSync(path, source);
  console.log("[canonical-source-syntax] repaired malformed Instagram fallback");
} else if (source.includes(fixed)) {
  console.log("[canonical-source-syntax] already canonical");
} else {
  throw new Error("[canonical-source-syntax] expected rawHandle fallback was not found; refusing blind rewrite");
}
