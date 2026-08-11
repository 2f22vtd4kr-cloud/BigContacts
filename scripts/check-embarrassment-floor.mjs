#!/usr/bin/env node
/**
 * Static anti-embarrassment floor — blocks known prior failure modes:
 * empty related surface after "done", 555 trash, ungrounded contacts,
 * EDGAR co-filer date/name issues, missing Boss↔right-hand disposition.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
function read(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

let pass = 0;
let fail = 0;
function ok(name, cond) {
  if (cond) {
    console.log(`PASS  ${name}`);
    pass++;
  } else {
    console.log(`FAIL  ${name}`);
    fail++;
  }
}

const persist = read("artifacts/api-server/src/src/lib/bureau-contact-persist.ts");
const edgar = persist;
const atlas = read("artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
const contactVal = read("artifacts/api-server/src/src/lib/contact-validation.ts");
const prompt = read("artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const cases = read("artifacts/api-server/src/src/routes/research/cases.ts");
const entities = read("artifacts/api-server/src/src/routes/entities.ts");
const passage = read("artifacts/api-server/src/src/lib/passage-filter.ts");
const queries = read("artifacts/api-server/src/src/lib/web-search-queries.ts");
const mistral = read("artifacts/api-server/src/src/lib/mistral-web-search.ts");
const nim = read("artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts");

// 1) Soft admission boundary closed for email/phone
ok("persist requires claim URL for email/phone",
  persist.includes('needsClaimUrl') &&
  persist.includes('if (needsClaimUrl && urls.length === 0) continue'));

// 2) Trash 555
ok("555 trash gate",
  contactVal.includes('exchange === "555"') && contactVal.includes("isTrashContactValue"));

// 3) EDGAR co-filer date + LAST-FIRST + denylist
ok("EDGAR startdt 1995", edgar.includes("startdt=1995-01-01"));
ok("EDGAR token-overlap exclude", edgar.includes("excludeTokens") || edgar.includes("Token-overlap"));
ok("EDGAR corp denylist CO/MFG", /corpRe[\s\S]*?\bmfg\b/i.test(edgar) || edgar.includes("mfg"));

// 4) Empty ledger recovery
ok("G5 organization_contact promotion",
  atlas.includes('contactOutcome: "organization_contact"'));
ok("Atlas expandSecondary called", atlas.includes("expandSecondaryPublicSurface"));
ok("companyNameForSecondary notes recovery",
  atlas.includes("companyNameForSecondary") && atlas.includes("Manufacturing"));
ok("refresh-surface route", entities.includes("refresh-surface"));
ok("refresh purges trash", entities.includes("isTrashContactValue") && entities.includes("trashIds"));

// 5) Related surface not silent
ok("G7 related-person peers", atlas.includes("related-person:") && atlas.includes("same_issuer_peer"));
ok("Boss no erase related", prompt.includes("Never instruct erasure of related") || prompt.includes("never instruct erasure"));

// 6) Gemini ↔ z-AI coordination
ok("Boss rightHandDisposition", prompt.includes("rightHandDisposition"));
ok("SSE surfaces disposition", cases.includes("rightHandDisposition"));
ok("NIM complementarity confidence", nim.includes("Complementarity") || nim.includes("complementarity"));

// 7) Web search quality path
ok("passage filter module", passage.includes("filterPassagesForQuery"));
ok("claim URL filter", passage.includes("filterClaimUrls"));
ok("shared sub-query planner", queries.includes("buildWebSearchSubQueries"));
ok("Mistral uses sub-queries", mistral.includes("buildWebSearchSubQueries"));
ok("deep-web uses passage filter",
  read("artifacts/api-server/src/src/lib/deep-web-osint.ts").includes("filterPassagesForQuery"));

// 8) Secondary email/phone only with website URL
ok("secondary email requires website URL",
  persist.includes("result.email && result.website"));

console.log(`\n${pass}/${pass + fail} embarrassment-floor checks passed`);
process.exit(fail ? 1 : 0);
