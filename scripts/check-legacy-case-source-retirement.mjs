import fs from "node:fs";

const root = "artifacts/api-server/src/src";
const route = `${root}/routes/research/cases.ts`;

if (fs.existsSync(route)) {
  console.error(`LEGACY CASE SOURCE RETIREMENT: FAIL — ${route} still exists`);
  process.exit(1);
}

const liveRouter = fs.readFileSync(`${root}/routes/research.ts`, "utf8");
if (/research\/cases/.test(liveRouter)) {
  console.error("LEGACY CASE SOURCE RETIREMENT: FAIL — live research router still references cases.ts");
  process.exit(1);
}

console.log("LEGACY CASE SOURCE RETIREMENT: PASS");
