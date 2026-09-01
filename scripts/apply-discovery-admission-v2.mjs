import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const discoveryFile = path.join(repoRoot, "artifacts/api-server/src/src/lib/discovery-agent.ts");
const researchFile = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let discoverySource = fs.readFileSync(discoveryFile, "utf8");
let researchSource = fs.readFileSync(researchFile, "utf8");

// Permanent-source rule: once modelFindings is present, discovery admission is
// already separated from auto-extracted findings. Never reapply historical
// admission patches during every build.
if (researchSource.includes("modelFindings: AgenticFinding[]") && discoverySource.includes("result.modelFindings")) {
  console.log("[apex-discovery-admission-v2] canonical modelFindings boundary present; no rewrite");
  process.exit(0);
}

const admissionOld = '    if (f.scope !== "candidate") continue;\n';
const admissionReplacement = `    // A named person discovered on an organization page is still a valid
    // discovery identity. Scope describes the evidence/contact surface, not
    // whether the named human may become a candidate. Require an explicit
    // personName or person: value below; never promote generic organization
    // contact facts.
    const hasExplicitPersonIdentity = Boolean(String(f.personName ?? "").trim()) || /^person:\\s*/i.test(String(f.value ?? ""));
    if (f.scope !== "candidate" && !hasExplicitPersonIdentity) continue;
`;
if (!discoverySource.includes('const hasExplicitPersonIdentity = Boolean(String(f.personName ?? "").trim())')) {
  if (discoverySource.includes(admissionOld)) discoverySource = discoverySource.replace(admissionOld, admissionReplacement);
}

const titleAnchor = `const INVALID_PERSON_NAME_PHRASES = [\n`;
const titleInsert = `const INVALID_PERSON_TITLE_PATTERNS = [\n  /^head of (?:marketing|sales|finance|operations|engineering|product|security|legal|hr|human resources|technology|it|strategy|business development)$/i,\n  /^(?:chief|global chief) (?:marketing|sales|financial|operating|technology|information|security|product|strategy|revenue|people) officer$/i,\n  /^(?:chief executive officer|chief financial officer|chief operating officer|chief technology officer|chief information officer|chief marketing officer|chief revenue officer|chief product officer)$/i,\n  /^(?:vice president|vp|senior vice president|svp) (?:of )?(?:marketing|sales|finance|operations|engineering|product|security|legal|technology|strategy|business development|investments?)$/i,\n  /^(?:managing director|executive director|marketing director|sales director|finance director|operations director|investment director|portfolio manager|fund manager)$/i,\n  /^(?:president|founder|co-founder|owner|partner|managing partner|general counsel|chairman|chairwoman|chairperson)$/i,\n];\n\n`;
if (!discoverySource.includes("const INVALID_PERSON_TITLE_PATTERNS = [") && discoverySource.includes(titleAnchor)) {
  discoverySource = discoverySource.replace(titleAnchor, titleInsert + titleAnchor);
}

const fragmentAnchor = `const INVALID_PERSON_TITLE_PATTERNS = [\n`;
const fragmentInsert = `const INVALID_PERSON_FRAGMENT_PATTERNS = [\n  /^com[a-z]{4,}\\s+[a-z]{2,}(?:\\s+[a-z]{2,})?$/i,\n  /^www[a-z]{2,}\\s+[a-z]{2,}(?:\\s+[a-z]{2,})?$/i,\n  /^https?[a-z]{2,}\\s+[a-z]{2,}(?:\\s+[a-z]{2,})?$/i,\n];\n\n`;
if (!discoverySource.includes("const INVALID_PERSON_FRAGMENT_PATTERNS = [") && discoverySource.includes(fragmentAnchor)) {
  discoverySource = discoverySource.replace(fragmentAnchor, fragmentInsert + fragmentAnchor);
}

const gateAnchor = `  if (isInvalidIdentityPhrase(normalized)) return false;\n  if (!words.some((w) => /^\\p{Lu}/u.test(w))) return false;\n`;
const gateReplacement = `  if (isInvalidIdentityPhrase(normalized)) return false;\n  if (INVALID_PERSON_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))) return false;\n  if (INVALID_PERSON_FRAGMENT_PATTERNS.some((pattern) => pattern.test(normalized))) return false;\n  if (!words.some((w) => /^\\p{Lu}/u.test(w))) return false;\n`;
if (!discoverySource.includes("INVALID_PERSON_FRAGMENT_PATTERNS.some((pattern) => pattern.test(normalized))") && discoverySource.includes(gateAnchor)) {
  discoverySource = discoverySource.replace(gateAnchor, gateReplacement);
}

const promptAnchor = `    "Use personName or value form: person: Full Name | role | company when possible.",\n`;
const promptReplacement = `    "Use personName or value form: person: Full Name | role | company when possible.",\n    "When a visited source names a specific person, emit that person explicitly as person: Full Name | role | company (or personName). Do not emit a company name, email address, contact label, domain fragment, or generic organization fact as the person. If the source is organization-scoped but names a human, the finding may remain organization-scoped; the human identity must still be explicit.",\n`;
if (!discoverySource.includes("When a visited source names a specific person, emit that person explicitly") && discoverySource.includes(promptAnchor)) {
  discoverySource = discoverySource.replace(promptAnchor, promptReplacement);
}

if (discoverySource !== fs.readFileSync(discoveryFile, "utf8")) fs.writeFileSync(discoveryFile, discoverySource);

// Telemetry patch is intentionally optional: the canonical source's modelFindings
// field is the authoritative forensic record. Do not fail a build because an old
// telemetry text anchor has disappeared.
console.log("[apex-discovery-admission-v2] compatibility gate complete; canonical source preserved");
