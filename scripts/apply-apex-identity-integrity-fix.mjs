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
  const basis = String(input.basis ?? "").trim();
  const role = String(input.role ?? "").trim();
  const company = String(input.company ?? "").trim();
  const urls = input.sourceUrls.filter((u) => /^https?:\\/\\/\\S+$/i.test(String(u)));

  // A human-looking name is not enough. The evidence must actually bind the
  // name to a person. Metadata labels, addresses, products, departments,
  // generic contact fields and organization fragments are never identities.
  if (!basis || basis.length < 8) return false;
  if (/(?:^|\\b)(email|phone|address|street|st|state|zip|postal|product|comparison|enablement|operational|person|president|ceo|chief executive|contact form)(?:\\b|$)/i.test(normalized)) return false;
  if (/\\b(?:llc|ltd|inc|corp|corporation|holdings|group|partners|fund|capital|ventures|foundation|products?)\\b/i.test(normalized)) return false;
  if (/^(?:[a-z]+\\.)?[a-z]{2,}\\s+(?:email|phone)$/i.test(normalized)) return false;
  if (/\\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\\b\\.?\\s+\\d+/i.test(normalized)) return false;

  // The explanatory evidence must contain both name tokens. This catches a
  // name-shaped value accidentally paired with unrelated page metadata.
  const nameTokens = normalized.split(/\\s+/).filter((t) => t.length >= 2);
  const evidence = `${basis} ${role} ${company}`.toLowerCase();
  const matchingTokens = nameTokens.filter((t) => evidence.includes(t));
  if (nameTokens.length >= 2 && matchingTokens.length < Math.min(2, nameTokens.length)) return false;

  if (!urls.length || !hasIndependentSource(urls)) return false;
  return true;
}
`;
  s = s.slice(0, idx) + helper + "\n" + s.slice(idx);
}

const old = `if (!isWellFormedPersonCandidate({ name: n, sourceUrls })) return;`;
const replacement = `if (!isWellFormedPersonCandidate({ name: n, sourceUrls })) return;\n    if (!hasStrongIdentityEvidence({ name: n, role: extra.role, company: extra.company, basis: extra.basis, sourceUrls })) return;`;
if (!s.includes(old)) throw new Error("candidate gate anchor missing");
s = s.replace(old, replacement);

fs.writeFileSync(path, s);
console.log("Applied strong identity evidence gate to discovery-agent.ts");
