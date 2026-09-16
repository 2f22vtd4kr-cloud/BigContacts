import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/apex-finder/src/pages/data-sources.tsx");
let source = fs.readFileSync(file, "utf8");

// The catalogue may describe external capabilities, but retired deterministic
// research triggers must never be rendered as executable UI. Canonical Atlas
// Investigator research is the only supported research control plane.
const retiredIngestNames = [
  "web-osint-enrich",
  "in-house-enrich",
  "social-discovery",
  "messenger-discovery",
  "foundation-filings",
  "companies-house-enrich",
  "occrp",
  "deep-web-osint",
  "broad-discovery",
];

// Remove only executable endpoint fields. Do not globally rewrite arbitrary
// strings: unrelated API URLs (for example the Python tool health endpoint)
// are legitimate UI plumbing and must remain intact.
source = source.replace(
  /\n\s*endpoint:\s*["']\/api\/enrich\/[^"']+["'],?/g,
  "",
);
const retiredIngestPattern = retiredIngestNames.join("|");
source = source.replace(
  new RegExp(
    `\\n\\s*endpoint:\\s*[\\"']\\/api\\/ingest\\/(?:${retiredIngestPattern})[^\\"']*[\\"'],?`,
    "g",
  ),
  "",
);

// Replace human-facing references to the retired executable research routes
// without touching unrelated /api/enrich or /api/ingest strings elsewhere.
source = source.replace(
  /Available via \/api\/enrich\/openownership\?entityId=<id>\. Also queries UK PSC via Companies House\./g,
  "Selected by the canonical Investigator when model-owned research is permitted.",
);
source = source.replace(
  /Available via \/api\/enrich\/adsb-history\?entityId=<id>\. Reads registration from entity metadata\./g,
  "Selected by the canonical Investigator when model-owned research is permitted; reads registration from entity metadata.",
);
source = source.replace(
  /Runs server-side Python\. Both tools installed\. Use \/api\/enrich\/holehe\?entityId=<id> and \/api\/enrich\/maigret\?entityId=<id>\./g,
  "Runs inside the canonical Investigator when model-selected and permitted by the evidence trajectory.",
);

// The source catalogue must not retain retired executable triggers. These
// checks intentionally target only endpoint fields and known research URLs.
if (/endpoint:\s*["']\/api\/enrich\//.test(source)) {
  throw new Error("direct /api/enrich research trigger remains in Investigator source catalogue");
}
if (
  /endpoint:\s*["']\/api\/ingest\/(?:web-osint-enrich|in-house-enrich|social-discovery|messenger-discovery|foundation-filings|companies-house-enrich|occrp|deep-web-osint|broad-discovery)/.test(
    source,
  )
) {
  throw new Error("retired /api/ingest research trigger remains in Investigator source catalogue");
}
if (
  /(?:\/api\/enrich\/(?:openownership|equasis|adsb-history|holehe|maigret|sherlock|theharvester)|\/api\/ingest\/(?:web-osint-enrich|in-house-enrich|social-discovery|messenger-discovery|foundation-filings|companies-house-enrich|occrp|deep-web-osint|broad-discovery))/.test(
    source,
  )
) {
  throw new Error("retired direct research URL remains in Investigator UI source catalogue");
}

fs.writeFileSync(file, source);
console.log("Investigator UI source boundary applied.");
