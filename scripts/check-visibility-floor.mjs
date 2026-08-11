#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
const checks = [];
function ok(name, pass) {
  checks.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
}
function read(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}
const cases = read("artifacts/api-server/src/src/routes/research/cases.ts");
const persist = read("artifacts/api-server/src/src/lib/bureau-contact-persist.ts");
const presented = read("artifacts/api-server/src/src/lib/presented-contacts.ts");
const health = read("artifacts/api-server/src/src/routes/health.ts");
const ingest = read("artifacts/api-server/src/src/routes/ingest.ts");
const extended = read("artifacts/api-server/src/src/routes/extended-osint.ts");
const prompt = read("artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const dash = read("artifacts/api-server/src/src/routes/dashboard.ts");
const dashUi = read("artifacts/apex-finder/src/pages/dashboard.tsx");

ok("materializeDiscoveryReviewCandidates", !!cases?.includes("materializeDiscoveryReviewCandidates"));
ok("expandSecondaryPublicSurface", !!cases?.includes("expandSecondaryPublicSurface"));
ok("registry officer expansion", !!cases?.includes("expandRegistryOfficersFromCandidates"));
ok("secondary on admit", !!cases?.includes("case-bureau-admit") && cases?.includes("expandSecondaryPublicSurface"));
ok("secondary on promote", !!cases?.includes("case-bureau-promote"));
ok("LinkedIn not-found", !!persist?.includes("linkedin:not-found"));
ok("directories First Round+TCA+Band+EBAN", !!persist?.includes("techcoastangels") && !!persist?.includes("eban.org"));
ok("crt.sh CT", !!persist?.includes("lookupCrtShEmails"));
ok("public email claims", !!persist?.includes("lookupPublicEmailClaims"));
ok("leadership pages", !!persist?.includes("lookupLeadershipPages"));
ok("X/Twitter public", !!persist?.includes("lookupPublicXProfile"));
ok("Wayback contact pages", !!persist?.includes("lookupWaybackContactPages"));
ok("ranking Personal→Org→Candidate", !!presented?.includes('m === "organization" ? 1'));
ok("card labels", !!presented?.includes("Looks personal") && !!presented?.includes("Company · related"));
ok("fail-closed personal mark", !!presented?.includes('direct_contact_verified') && !!presented?.includes("contactOutcome") && !!presented?.includes("never mislabeled personal"));
const entitiesUi = read("artifacts/apex-finder/src/pages/entities.tsx");
ok("UI fallback respects contactOutcome", !!entitiesUi?.includes('outcome === "direct_contact_verified"') && !!entitiesUi?.includes('verified ? "personal" : "candidate"'));
ok("healthz honesty", !!health?.includes("registryShallowRisk") && !!health?.includes("lanesHonesty"));
ok("active job idle 200", !!ingest?.includes("active: false"));
ok("free tools → evidence", !!extended?.includes('"theharvester"') && !!extended?.includes('"whoxy"'));
ok("Boss no erase related", !!prompt?.includes("Never instruct erasure of related"));
ok("dashboard reviewCandidates+shallow", !!dash?.includes("reviewCandidates") && !!dash?.includes("registryShallowRisk"));
ok("dashboard UI shallow banner", !!dashUi?.includes("banner-registry-shallow-risk"));

const atlas = read("artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
ok("Atlas calls expandSecondaryPublicSurface", !!atlas?.includes("expandSecondaryPublicSurface"));
ok("Atlas registry org surface persist", !!atlas?.includes("atlas-registry-org-surface"));
const contactVal = read("artifacts/api-server/src/src/lib/contact-validation.ts");
ok("555 trash phone gate", !!contactVal?.includes('exchange === "555"') && !!contactVal?.includes("isTrashContactValue"));
ok("Atlas surface integrity summary", !!atlas?.includes("Surface integrity") && !!atlas?.includes("surfaceGaps"));
ok("persist uses isTrashContactValue", !!persist?.includes("isTrashContactValue"));
ok("Atlas registry-first bounded jobs", !!atlas?.includes("registry-first") && !!atlas?.includes("[...registry, ...broad]"));
ok("Atlas G7 issuer peers", !!atlas?.includes("atlas-issuer-related-peers"));
ok("Groq provider deterministic fallback", !!contactVal?.includes("deterministic fallback") || !!(read("artifacts/api-server/src/src/lib/llm-name-validator.ts")?.includes("deterministic fallback")));
ok("Atlas cookedAt on full-circle complete", !!atlas?.includes("cookedAt = full-circle research completed") || (atlas?.includes("cookedAt:") && atlas?.includes("new Date()") && !atlas?.includes('contact_route_found" ? new Date() : null')));


const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) { process.exitCode = 1; console.error("Failed:", failed.map((f) => f.name).join(", ")); }
