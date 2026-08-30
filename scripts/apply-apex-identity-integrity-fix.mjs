import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let s = fs.readFileSync(path, "utf8");

if (!s.includes("function hasStrongIdentityEvidence")) {
  const anchor = `function hasIndependentSource(sourceUrls: string[]): boolean {`;
  const idx = s.indexOf(anchor);
  if (idx < 0) throw new Error("identity anchor missing");

  const helper = `
function hasStrongIdentityEvidence(input: {
  name: string;
  role?: string;
  company?: string;
  basis?: string;
  sourceUrls: string[];
}): boolean {
  const name = input.name.trim().replace(/\\s+/g, " ");
  const normalized = name.toLowerCase();
  const urls = input.sourceUrls.filter((u) => /^https?:\\/\\/\\S+$/i.test(String(u)));

  // Safety boundary only: reject values that are structurally recognizable as
  // metadata, labels, addresses, products, departments, or organization text.
  // Do NOT require the explanatory note to repeat the name: doing so would
  // over-filter legitimate model findings and would turn safety into ranking.
  if (/(?:^|\\b)(email|phone|address|street|zip|postal|product|comparison|enablement|operational|person)(?:\\b|$)/i.test(normalized)) return false;
  if (/^president(?:\\s+person)?$/i.test(normalized)) return false;
  if (/^(?:[a-z]+\\.)?[a-z]{2,}\\s+(?:email|phone)$/i.test(normalized)) return false;
  if (/\\b(?:llc|ltd|inc|corp|corporation|holdings|group|partners|fund|capital|ventures|foundation|products?)\\b/i.test(normalized)) return false;
  if (/\\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\\b\\.?\\s+\\d+/i.test(normalized)) return false;

  // Candidate provenance remains mandatory and list-only fame pages are not
  // sufficient. The model remains responsible for the actual identity claim.
  return urls.length > 0 && hasIndependentSource(urls);
}
`;
  s = s.slice(0, idx) + helper + "\n" + s.slice(idx);
}

// Make the repair idempotent. Older versions blindly appended the same gate on
// every CI run, producing repeated checks in the source. Remove all copies and
// insert exactly one immediately after the structural person gate.
const gate = `if (!hasStrongIdentityEvidence({ name: n, role: extra.role, company: extra.company, basis: extra.basis, sourceUrls })) return;`;
s = s.split(gate).join("");
const anchor = `if (!isWellFormedPersonCandidate({ name: n, sourceUrls })) return;`;
if (!s.includes(anchor)) throw new Error("candidate gate anchor missing");
s = s.replace(anchor, `${anchor}\n    ${gate}`);

fs.writeFileSync(path, s);
console.log("Applied source-bound identity safety gate to discovery-agent.ts (idempotent)");
