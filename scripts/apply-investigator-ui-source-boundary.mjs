import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/apex-finder/src/pages/data-sources.tsx");
const source = fs.readFileSync(file, "utf8");

// The catalogue may describe external capabilities, but retired deterministic
// research triggers must never be rendered as executable UI. Canonical Atlas
// Investigator research is the only supported research control plane.
//
// This used to rewrite tracked source with broad regular expressions. Keeping
// the boundary as a read-only assertion makes the build safe and idempotent:
// the source is reviewed once, and every build verifies it without changing it.
const checks = [
  [
    "direct /api/enrich research trigger is absent",
    !/endpoint:\s*["']\/api\/enrich\//.test(source),
  ],
  [
    "stale direct /api/enrich URL is absent",
    !/\/api\/enrich\/(?:openownership|equasis|adsb-history|holehe|maigret|sherlock|theharvester)\b/.test(source),
  ],
  [
    "retired /api/ingest research trigger is absent",
    !/endpoint:\s*["']\/api\/ingest\/(?:web-osint-enrich|in-house-enrich|social-discovery|messenger-discovery|foundation-filings|companies-house-enrich|occrp|deep-web-osint|broad-discovery)\b/.test(source),
  ],
  [
    "canonical Investigator boundary is documented",
    /canonical Investigator/i.test(source),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length > 0) {
  throw new Error(`Investigator UI source boundary failed: ${failures.join("; ")}`);
}

console.log("Investigator UI source boundary verified without mutating tracked source.");
