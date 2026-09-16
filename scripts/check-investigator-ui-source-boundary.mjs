import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/apex-finder/src/pages/data-sources.tsx"), "utf8");

// /api/enrich/python-tools is a governed capability directory/health surface,
// not a deterministic research trigger. Other direct enrich URLs are retired
// from the operator UI and must not remain in the catalogue.
const staleResearchUrl = /\/api\/enrich\/(?!python-tools(?:[/?\"'`]|$))[a-z0-9-]+/i;
const staleResearchTrigger = /endpoint:\s*[\"']\/api\/enrich\/(?!python-tools(?:[/?\"'`]|$))/i;

const checks = [
  ["source catalogue has no direct extended-OSINT trigger", !staleResearchTrigger.test(source)],
  ["source catalogue has no stale direct extended-OSINT URL", !staleResearchUrl.test(source)],
  ["python tools capability remains explicitly addressable", /\/api\/enrich\/python-tools/.test(source)],
  ["source catalogue describes model-owned research boundary", /canonical Investigator/i.test(source)],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (failed = failed || !ok) continue;
}
if (failed) process.exit(1);
