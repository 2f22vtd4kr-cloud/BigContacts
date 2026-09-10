import fs from "node:fs";

const paths = [
  "artifacts/api-server/src/src/lib/atlas-orchestrator.ts",
  "artifacts/api-server/src/lib/atlas-orchestrator.ts",
];
const failures = [];
for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  const source = fs.readFileSync(path, "utf8");
  if (/runMaigret\(|runHolehe\(|runSherlock\(|runTheHarvester\(/.test(source)) {
    failures.push(`${path}: deterministic Python OSINT call remains`);
  }
  if (/Maigret \+ Holehe|Maigret\+Holehe|rawHandle \|\| emailForHolehe/.test(source)) {
    failures.push(`${path}: scripted Maigret/Holehe fan-out remains`);
  }
}
if (failures.length) {
  console.error("CANONICAL ATLAS OSINT BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ATLAS OSINT BOUNDARY: PASS");
console.log("- Atlas does not deterministically launch Maigret/Holehe/Sherlock/theHarvester research");
console.log("- OSINT capability choice remains with the Investigator");
