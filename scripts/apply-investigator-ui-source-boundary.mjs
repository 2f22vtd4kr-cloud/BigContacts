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
const retiredIngestPattern = retiredIngestNames.join("|");

// Remove only executable endpoint fields. Do not globally rewrite arbitrary
// strings: unrelated API URLs (for example the Python tool health endpoint)
// are legitimate UI plumbing and must remain intact.
source = source.replace(/\n\s*endpoint:\s*["']\/api\/enrich\/(?!python-tools(?:[/?"'`]|$))[^"']+["'],?/g, "");
source = source.replace(
  new RegExp(
    `\\n\\s*endpoint:\\s*[\\"']\\/api\\/ingest\\/(?:${retiredIngestPattern})[^\\"']*[\\"'],?`,
    "g",
  ),
  "",
);

// Remove retired direct research URLs from human-facing notes/descriptions,
// while preserving the governed Python tools capability endpoint.
source = source.replace(
  /\/api\/enrich\/(?!python-tools(?:[/?"'`]|$))[a-z0-9-]+(?:\?[^\s"'`<>)]+)?/gi,
  "the canonical Investigator",
);
source = source.replace(
  /\/api\/ingest\/(?:web-osint-enrich|in-house-enrich|social-discovery|messenger-discovery|foundation-filings|companies-house-enrich|occrp|deep-web-osint|broad-discovery)(?:\?[^\s"'`<>)]+)?/gi,
  "the canonical Investigator",
);

// Repair the known legacy placeholder corruption defensively if an older
// generated tree is ever fed back into this helper.
source = source.replace(/fetch\(\s*`\$\{base\}the canonical Investigator`\s*\)/g, "fetch(`${base}/api/enrich/python-tools`)");

if (/endpoint:\s*["']\/api\/enrich\/(?!python-tools(?:[/?"'`]|$))/i.test(source)) {
  throw new Error("direct retired /api/enrich research trigger remains in Investigator source catalogue");
}
if (/\/api\/enrich\/(?!python-tools(?:[/?"'`]|$))/i.test(source)) {
  throw new Error("retired direct /api/enrich research URL remains in Investigator source catalogue");
}
if (
  /endpoint:\s*["']\/api\/ingest\/(?:web-osint-enrich|in-house-enrich|social-discovery|messenger-discovery|foundation-filings|occrp|deep-web-osint|broad-discovery)/i.test(
    source,
  )
) {
  throw new Error("retired /api/ingest research trigger remains in Investigator source catalogue");
}

fs.writeFileSync(file, source);
console.log("Investigator UI source boundary applied.");
