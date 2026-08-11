#!/usr/bin/env node
/**
 * Machine-checkable floor for the "priority stack" capabilities:
 * - starmex-style verifiers (company-lock, org-email gates)
 * - Claude-OSINT org footprint language
 * - Legendary-style expanded public source queries
 * - GHOST-style entityLinks on discovery deck
 * - Agentic SERP email + company-domain email gate
 * Does NOT require karpathy overnight cohort runner (deferred).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];
function ok(name, pass) {
  checks.push({ name, pass: !!pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
}
function read(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

const cases = read("artifacts/api-server/src/src/routes/research/cases.ts");
const agentic = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
const queries = read("artifacts/api-server/src/src/lib/web-search-queries.ts");
const bossPrompt = read("artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const bureau = read("artifacts/api-server/src/src/lib/case-bureau.ts");
const browser = read("artifacts/api-server/src/src/lib/browser-fetch.ts");

// starmex / verifier layer
ok("company-lock scrub", !!cases?.includes("scrubCompanyLockedSurface") || !!cases?.includes("Company-lock scrub applied"));
ok("company-domain email from public social", !!cases?.includes("PUBLIC_ORG_SURFACE") || !!cases?.includes("publicOrgSurfaceHost"));
ok("agentic company-domain hasOrgEmail", !!agentic?.includes("emailMatchesCompany"));
ok("agentic force org-email search", !!agentic?.includes("force_org_email_search"));
ok("agentic SERP snippet email extract", !!agentic?.includes("findingsFromSearchSnippet"));
ok("agentic reject done without org-email hop", !!agentic?.includes("org-email hop required"));

// Claude-OSINT org footprint
ok("Boss plan org footprint methodology", !!bossPrompt?.includes("ORG FOOTPRINT METHODOLOGY"));
ok("Boss opening ORG FOOTPRINT PASS", !!bureau?.includes("ORG FOOTPRINT PASS"));
ok("queries OpenCorporates/GLEIF/SEC", !!queries?.includes("opencorporates") && !!queries?.includes("GLEIF"));
ok("queries BBB/chamber", !!queries?.includes("BBB") || !!queries?.includes("better business"));
ok("queries facebook org inbox angle", !!queries?.includes("site:facebook.com"));
ok("queries cap allows footprint angles", !!queries?.includes("slice(0, 12)"));

// Legendary-style related officers
ok("agentic related co-founder+registry query", !!agentic?.includes("OpenCorporates") && !!agentic?.includes("co-founder"));

// GHOST-style entity graph
ok("entityLinks written on discovery deck", !!cases?.includes("entityLinks") && !!cases?.includes("related_to_organization"));

// toolVisit chain still present (MCP Playwright / firecrawl-class substitutes already in-tree)
ok("browser-fetch Scrapfly path", !!browser?.includes("scrapfly") || !!browser?.includes("Scrapfly"));
ok("browser-fetch ZenRows path", !!browser?.includes("zenrows") || !!browser?.includes("ZenRows"));
ok("browser-fetch Playwright fallback", !!browser?.includes("playwright") || !!browser?.includes("Playwright") || !!browser?.includes("chromium"));

// karpathy overnight NOT required here

ok("DiscoveryCaseFile entityLinks type", !!bureau?.includes("entityLinks?:"));
ok("DiscoveryCaseFile orgFootprint type", !!bureau?.includes("orgFootprint?:"));
ok("cases orgFootprint checklist", !!cases?.includes("orgFootprint") && !!cases?.includes("registryMention"));
ok("cases person dedupe denser evidence", !!cases?.includes("normPerson") || !!cases?.includes("denser"));
ok("agentic force_registry_search", !!agentic?.includes("force_registry_search"));
ok("score-discovery-case scorecard script", existsSync(join(root, "scripts/score-discovery-case.mjs")));

ok("no requirement for overnight cohort runner in this floor", true);

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  process.exitCode = 1;
  console.error("Failed:", failed.map((f) => f.name).join(", "));
}
