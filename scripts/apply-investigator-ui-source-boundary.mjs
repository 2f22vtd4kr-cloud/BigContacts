import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/apex-finder/src/pages/data-sources.tsx");
let source = fs.readFileSync(file, "utf8");

// The catalogue may describe external capabilities, but it must not expose
// direct deterministic research triggers. Those capabilities are selected by
// the canonical Investigator and executed inside its safety/provenance envelope.
source = source.replace(/\n\s*endpoint:\s*["']\/api\/enrich\/[^"']+["'],/g, "");
source = source.replace(/Use \/api\/enrich\/[^.]+\./g, "Selected by the canonical Investigator.");
source = source.replace(/Available via \/api\/enrich\/[^.]+\./g, "Selected by the canonical Investigator.");
source = source.replace(/Runs server-side Python\. Both tools installed\. Use \/api\/enrich\/holehe\?entityId=<id> and \/api\/enrich\/maigret\?entityId=<id>\./g, "Runs inside the canonical Investigator when model-selected and permitted by the evidence trajectory.");

if (/endpoint:\s*["']\/api\/enrich\//.test(source)) throw new Error("direct /api/enrich research trigger remains in Investigator source catalogue");
if (/\/api\/enrich\//.test(source)) throw new Error("stale direct /api/enrich reference remains in Investigator source catalogue");
fs.writeFileSync(file, source);
console.log("Investigator UI source boundary applied.");
