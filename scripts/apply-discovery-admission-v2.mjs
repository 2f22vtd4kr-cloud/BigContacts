import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const discoveryFile = path.join(repoRoot, "artifacts/api-server/src/src/lib/discovery-agent.ts");
const discoverySource = fs.readFileSync(discoveryFile, "utf8");

const admissionOld = '    if (f.scope !== "candidate") continue;\n';
const admissionReplacement = `    // A named person discovered on an organization page is still a valid
    // discovery identity. Scope describes the evidence/contact surface, not
    // whether the named human may become a candidate. Require an explicit
    // personName or person: value below; never promote generic organization
    // contact facts.
    const hasExplicitPersonIdentity = Boolean(String(f.personName ?? "").trim()) || /^person:\\s*/i.test(String(f.value ?? ""));
    if (f.scope !== "candidate" && !hasExplicitPersonIdentity) continue;
`;

let nextDiscovery = discoverySource;
if (!nextDiscovery.includes('const hasExplicitPersonIdentity = Boolean(String(f.personName ?? "").trim())')) {
  if (!nextDiscovery.includes(admissionOld)) throw new Error("discovery admission anchor not found");
  nextDiscovery = nextDiscovery.replace(admissionOld, admissionReplacement);
}

// Deterministic identity safety: reject generic job titles/role phrases even
// when they look like a capitalized two-to-five-word human name. This is a
// safety gate, not a discovery strategy; the model still chooses whom to find.
const titleAnchor = `const INVALID_PERSON_NAME_PHRASES = [\n`;
const titleInsert = `const INVALID_PERSON_TITLE_PATTERNS = [\n  /^head of (?:marketing|sales|finance|operations|engineering|product|security|legal|hr|human resources|technology|it|strategy|business development)$/i,\n  /^(?:chief|global chief) (?:marketing|sales|financial|operating|technology|information|security|product|strategy|revenue|people) officer$/i,\n  /^(?:chief executive officer|chief financial officer|chief operating officer|chief technology officer|chief information officer|chief marketing officer|chief revenue officer|chief product officer)$/i,\n  /^(?:vice president|vp|senior vice president|svp) (?:of )?(?:marketing|sales|finance|operations|engineering|product|security|legal|technology|strategy|business development|investments?)$/i,\n  /^(?:managing director|executive director|marketing director|sales director|finance director|operations director|investment director|portfolio manager|fund manager)$/i,\n  /^(?:president|founder|co-founder|owner|partner|managing partner|general counsel|chairman|chairwoman|chairperson)$/i,\n];\n\n`;
if (!nextDiscovery.includes("const INVALID_PERSON_TITLE_PATTERNS = [")) {
  if (!nextDiscovery.includes(titleAnchor)) throw new Error("discovery identity phrase anchor not found");
  nextDiscovery = nextDiscovery.replace(titleAnchor, titleInsert + titleAnchor);
}

const gateAnchor = `  if (isInvalidIdentityPhrase(normalized)) return false;\n  if (!words.some((w) => /^\\p{Lu}/u.test(w))) return false;\n`;
const gateReplacement = `  if (isInvalidIdentityPhrase(normalized)) return false;\n  if (INVALID_PERSON_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))) return false;\n  if (!words.some((w) => /^\\p{Lu}/u.test(w))) return false;\n`;
if (!nextDiscovery.includes("INVALID_PERSON_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))")) {
  if (!nextDiscovery.includes(gateAnchor)) throw new Error("discovery identity gate anchor not found");
  nextDiscovery = nextDiscovery.replace(gateAnchor, gateReplacement);
}

if (nextDiscovery !== discoverySource) {
  fs.writeFileSync(discoveryFile, nextDiscovery);
  console.log("Applied discovery admission v2 + generic-title identity gate");
} else {
  console.log("discovery admission v2 + generic-title identity gate already applied");
}

const researchFile = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const researchSource = fs.readFileSync(researchFile, "utf8");
const telemetryAnchor = `    findings = mergeFindings(findings, action.findings);\n    history.push(\n      \`step\${i + 1}: done findings=\${findings.length}\` +`;
const telemetryReplacement = `    findings = mergeFindings(findings, action.findings);\n    // Preserve a compact forensic record of model-declared findings. This is\n    // observability only; admission still applies the normal identity/provenance\n    // boundary. Never persist arbitrary model prose as an entity here.\n    const doneFindingSummary = action.findings\n      .slice(0, 12)\n      .map((f) => JSON.stringify({ vectorType: f.vectorType, value: f.value.slice(0, 120), personName: f.personName, role: f.role, scope: f.scope, sourceUrls: f.sourceUrls.slice(0, 3) }))\n      .join(" | ");\n    if (doneFindingSummary) history.push(\`step\${i + 1}: done_findings=\${doneFindingSummary.slice(0, 1800)}\`);\n    history.push(\n      \`step\${i + 1}: done findings=\${findings.length}\` +`;

if (!researchSource.includes("done_findings=")) {
  if (!researchSource.includes(telemetryAnchor)) throw new Error("done telemetry anchor not found");
  fs.writeFileSync(researchFile, researchSource.replace(telemetryAnchor, telemetryReplacement));
  console.log("Applied discovery telemetry v2: model-declared done findings are auditable in trajectory");
} else {
  console.log("discovery telemetry v2 already applied");
}
