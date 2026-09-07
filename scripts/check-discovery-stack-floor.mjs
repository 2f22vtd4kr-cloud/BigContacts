#!/usr/bin/env node
/**
 * Machine-checkable floor for the current discovery capabilities:
 * - company-lock and source-backed organization surfaces
 * - adaptive, model-selected public-web and registry research
 * - entityLinks / orgFootprint on the discovery deck
 * - agentic SERP email + company-domain email validation
 * - browser-fetch fallbacks
 *
 * This guard must not require a deterministic search playbook. The Investigator
 * owns the trajectory and may choose footprint, registry, browser, or search
 * actions from the canonical action schema.
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
const registry = read("artifacts/api-server/src/src/lib/registry-client.ts");

// starmex / verifier layer
ok("company-lock scrub", !!cases?.includes("scrubCompanyLockedSurface") || !!cases?.includes("Company-lock scrub applied"));
ok("company-domain email from public social", !!cases?.includes("PUBLIC_ORG_SURFACE") || !!cases?.includes("publicOrgSurfaceHost"));
ok("agentic company-domain email alignment", !!agentic?.includes("isCompanyAlignedEmail") || !!agentic?.includes("emailMatchesCompany"));
ok("agentic footprint email capability", !!agentic?.includes("footprint_email"));
ok("agentic SERP snippet email extract", !!agentic?.includes("findingsFromSearchSnippet"));
ok("agentic has no mandatory org-email hop", !agentic?.includes("force_org_email_search") && !agentic?.includes("org-email hop required"));

// Adaptive public-web and registry research. These are capabilities, not a forced order.
ok("Boss plan uses adaptive org research", !!bossPrompt?.includes("adaptive, evidence-led") && !!bossPrompt?.includes("not fixed playbooks"));
ok("Boss opening is target-locked", !!bureau?.includes("TARGET-LOCKED") || !!bossPrompt?.includes("TARGET-LOCKED"));
ok("registry capability includes OpenCorporates/GLEIF/SEC", !!registry?.includes("OpenCorporates") && !!registry?.includes("GLEIF") && !!registry?.includes("SEC EDGAR"));
ok("public-source research remains provider-neutral", !!agentic && !agentic.includes("force_org_email_search") && !agentic.includes("force_registry_search"));
ok("action budget permits footprint choices", !!agentic?.includes("maxIterations") && !!agentic?.includes("footprint_username"));

// Legendary-style related officers
ok("agentic related-person and registry capabilities", !!agentic?.includes("registry_search") && !!bureau?.includes("related"));

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
ok("agentic registry_search capability", !!agentic?.includes("registry_search"));
ok("score-discovery-case scorecard script", existsSync(join(root, "scripts/score-discovery-case.mjs")));

ok("no requirement for overnight cohort runner in this floor", true);

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  process.exitCode = 1;
  console.error("Failed:", failed.map((f) => f.name).join(", "));
}
