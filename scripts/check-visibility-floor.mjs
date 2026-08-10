#!/usr/bin/env node
/**
 * Static proof that Phase A/B/D visibility floor is wired.
 * Run: node scripts/check-visibility-floor.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

function ok(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

const cases = read("artifacts/api-server/src/src/routes/research/cases.ts");
const persist = read("artifacts/api-server/src/src/lib/bureau-contact-persist.ts");
const presented = read("artifacts/api-server/src/src/lib/presented-contacts.ts");
const health = read("artifacts/api-server/src/src/routes/health.ts");
const ingest = read("artifacts/api-server/src/src/routes/ingest.ts");
const extended = read("artifacts/api-server/src/src/routes/extended-osint.ts");
const prompt = read("artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const dash = read("artifacts/api-server/src/src/routes/dashboard.ts");

ok("cases.ts present", Boolean(cases));
ok("materializeDiscoveryReviewCandidates", Boolean(cases?.includes("materializeDiscoveryReviewCandidates")));
ok("expandSecondaryPublicSurface wired", Boolean(cases?.includes("expandSecondaryPublicSurface")));
ok("persistBureauContactsForEntity present", Boolean(persist?.includes("persistBureauContactsForEntity")));
ok("secondary LinkedIn not-found honesty", Boolean(persist?.includes("linkedin:not-found")));
ok("Signal/investor lookup", Boolean(persist?.includes("lookupPublicInvestorProfile")));
ok("leadership page probe", Boolean(persist?.includes("lookupLeadershipPages")));
ok("ranking Personal → organization → candidate", Boolean(presented?.includes('m === "organization" ? 1')));
ok("labels Looks personal / Company · related / Still a lead", Boolean(
  presented?.includes("Looks personal")
  && presented?.includes("Company · related")
  && presented?.includes("Still a lead"),
));
ok("healthz registryShallowRisk", Boolean(health?.includes("registryShallowRisk")));
ok("healthz lanesHonesty", Boolean(health?.includes("lanesHonesty")));
ok("active job idle returns 200", Boolean(ingest?.includes("active: false") && ingest?.includes("jobId: null")));
ok("theHarvester → contact_evidence", Boolean(extended?.includes('"theharvester"')));
ok("holehe/maigret → contact_evidence", Boolean(extended?.includes('"holehe"') && extended?.includes('"maigret"')));
ok("Boss: never erase related on reject", Boolean(prompt?.includes("Never instruct erasure of related")));
ok("dashboard reviewCandidates counter", Boolean(dash?.includes("reviewCandidates")));

const failed = checks.filter((c) => !c.pass);
console.log("");
console.log(`Visibility floor static checks: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  process.exitCode = 1;
  console.error("Failed:", failed.map((f) => f.name).join(", "));
} else {
  console.log("Operator proof next: run discovery on a quiet officer lead; confirm entity ledger > 0 and contact_evidence rows with candidate marks.");
}
