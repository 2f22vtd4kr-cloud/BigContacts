import fs from "node:fs";

const agenticPath = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const discoveryPath = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let a = fs.readFileSync(agenticPath, "utf8");
let d = fs.readFileSync(discoveryPath, "utf8");
let changes = 0;

function once(text, pattern, replacement, label) {
  if (!pattern.test(text)) throw new Error(`quality-v2 anchor missing: ${label}`);
  return text.replace(pattern, replacement);
}

// Give Gemini a real structured action contract instead of relying on free-form
// JSON parsing. The model still chooses the action; the schema only removes the
// transport ambiguity that was producing malformed / polluted action objects.
if (!a.includes("const AGENTIC_ACTION_SCHEMA =")) {
  const schema = `const AGENTIC_ACTION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["web_search", "visit", "footprint_email", "footprint_username", "domain_lookup", "registry_search", "harvest_domain", "browser_fetch", "reverse_whois", "done"] },
    query: { type: "string" },
    url: { type: "string" },
    email: { type: "string" },
    username: { type: "string" },
    domain: { type: "string" },
    registry: { type: "string" },
    thought: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          vectorType: { type: "string", enum: ["email", "phone", "linkedin", "website", "social", "other"] },
          value: { type: "string" },
          personName: { type: ["string", "null"] },
          role: { type: ["string", "null"] },
          scope: { type: "string", enum: ["organization", "candidate", "unknown"] },
          sourceUrls: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
        required: ["vectorType", "value", "sourceUrls", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["action"],
  additionalProperties: false,
};

`;
  a = once(a, /async function callGeminiJson/, schema + "async function callGeminiJson", "structured action schema insertion");
  changes++;
}

a = once(
  a,
  /generationConfig: \{\n                maxOutputTokens: 4096,\n                thinkingConfig: \{ thinkingLevel: "high" \},\n              \}/,
  `generationConfig: {
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingLevel: "high" },
                responseFormat: { text: { mimeType: "application/json", schema: AGENTIC_ACTION_SCHEMA } },
              }`,
  "Gemini structured response format",
);
changes++;

// Gemini 3.x should not be temperature-clamped. The agentic quality problem is
// reasoning depth, not creativity suppression. Other providers likewise use
// their native defaults unless an operator explicitly supplies a setting.
a = a.replace(/\n\s*temperature: 0\.25,\n/g, "\n");
changes++;

// Increase the default lifecycle budget and stop truncating an operator-supplied
// maxIterations to 24. The caller can still set a finite budget per run; the
// harness must not secretly reduce the model's requested research latitude.
a = once(a, /const MAX_ITER = 20;/, "const MAX_ITER = 40;", "default iteration budget");
a = once(a, /const maxIter = Math\.min\(input\.maxIterations \?\? MAX_ITER, 24\);/, "const maxIter = Math.max(1, input.maxIterations ?? MAX_ITER);", "hidden iteration ceiling");
changes += 2;

// Discovery currently carries a large hand-maintained semantic blacklist. Keep
// only structural junk that is unambiguously metadata; research judgment about
// whether a phrase denotes a person is left to the model and the source-backed
// admission contract. This prevents the blacklist itself from becoming a hidden
// ranking/discovery policy.
d = once(
  d,
  /const INVALID_PERSON_NAME_WORDS = new Set\(\[[\s\S]*?\]\);\nconst INVALID_PERSON_NAME_PHRASES = \[[\s\S]*?\];/,
  `const INVALID_PERSON_NAME_WORDS = new Set(["email", "phone", "address", "street", "product", "comparison", "person", "www", "com"]);
const INVALID_PERSON_NAME_PHRASES = ["security issues", "security issue", "chief executive officer", "executive officer", "forbes list", "forbes billionaires", "the billionaire", "the billionaires"];`,
  "discovery semantic blacklist reduction",
);
changes++;

fs.writeFileSync(agenticPath, a);
fs.writeFileSync(discoveryPath, d);
console.log(`[apex-agentic-quality-v2] applied ${changes} change(s)`);
