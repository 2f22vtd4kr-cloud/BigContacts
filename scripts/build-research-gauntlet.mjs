#!/usr/bin/env node
import fs from "node:fs";
const [baseFile, extensionFile, outputFile] = process.argv.slice(2);
if (!baseFile || !extensionFile || !outputFile) {
  console.error("Usage: node scripts/build-research-gauntlet.mjs <base.json> <extension.json> <output.json>");
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(baseFile, "utf8"));
const extension = JSON.parse(fs.readFileSync(extensionFile, "utf8"));
if (base.schemaVersion !== "research-gauntlet-v1" || base.status !== "grounded-reviewed") throw new Error("Base registry must be grounded-reviewed research-gauntlet-v1.");
if (extension.schemaVersion !== "research-gauntlet-v1-extension" || extension.status !== "grounded-reviewed") throw new Error("Extension registry must be grounded-reviewed research-gauntlet-v1-extension.");
const baseIds = new Set((base.cases || []).map(c => String(c.caseId)));
const extIds = (extension.cases || []).map(c => String(c.caseId));
if (new Set(extIds).size !== extIds.length || extIds.some(id => baseIds.has(id))) throw new Error("Extension case IDs must be unique and disjoint from the base registry.");
const cases = [...(base.cases || []), ...(extension.cases || [])];
if (cases.length < 50) throw new Error(`Combined grounded registry must contain at least 50 cases; got ${cases.length}.`);
const claimIds = new Set();
for (const c of cases) {
  if (c.groundTruthStatus !== "ready" || c.reviewStatus !== "independently-cross-checked") throw new Error("Unreviewed case: " + c.caseId);
  for (const claim of c.groundTruth?.claims || []) {
    if (!claim.id || claimIds.has(claim.id)) throw new Error("Duplicate/missing claim id: " + claim.id);
    claimIds.add(claim.id);
    if (!Array.isArray(claim.requiredSourceUrls) || claim.requiredSourceUrls.length < 2) throw new Error("Claim lacks two required sources: " + claim.id);
  }
  if (!Array.isArray(c.sources) || c.sources.length < 2 || c.sources.some(s => s.independentReview !== true)) throw new Error("Case lacks two independently reviewed sources: " + c.caseId);
}
const combined = { ...base, version: "1.2.0", targetCaseCount: cases.length, cases, composedFrom: [baseFile, extensionFile], compositionStatus: "grounded-reviewed" };
fs.writeFileSync(outputFile, JSON.stringify(combined, null, 2) + "\n");
console.log(JSON.stringify({ valid: true, schemaVersion: combined.schemaVersion, version: combined.version, cases: cases.length }, null, 2));
