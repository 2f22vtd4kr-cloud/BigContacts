import fs from "node:fs";

const agenticPath = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const discoveryPath = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let a = fs.readFileSync(agenticPath, "utf8");
let d = fs.readFileSync(discoveryPath, "utf8");
let changes = 0;

function replaceIfPresent(text, pattern, replacement, label) {
  if (!pattern.test(text)) return text;
  const next = text.replace(pattern, replacement);
  if (next !== text) changes++;
  return next;
}

// Provider logger correctness. Apply only when the old copy/paste defect exists.
a = replaceIfPresent(a,
  /logger\.warn\(\{ provider: "mistral", status: resp\.status, model \}, "agentic provider rejected request"\);/,
  'logger.warn({ provider: "serper", status: resp.status }, "agentic provider rejected request");',
  "Serper logger",
);
a = replaceIfPresent(a,
  /logger\.warn\(\{ provider: "nvidia", status: resp\.status, model \}, "agentic provider rejected request"\);/,
  'logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");',
  "Mistral logger",
);

// Remove the old outer 18s deadline. Provider functions are allowed to use their
// own meaningful deadlines; a model decision is not a 2-second autocomplete.
a = replaceIfPresent(a, /const providerDecisionTimeoutMs = 18_000;/, "const providerDecisionTimeoutMs = 55_000;", "provider deadline");

// Remove any old deterministic path steering. These are not research safety;
// they are hidden policy that can make a capable model behave unlike a human agent.
a = replaceIfPresent(a,
  /\n    \/\/ Soft stagnation:[\s\S]*?\n    \}\n\n    const llmStepWithHeartbeat/,
  "\n\n    const llmStepWithHeartbeat",
  "stagnation steering",
);
a = replaceIfPresent(a,
  /\n      \/\/ Soft nudge: if we already have company-looking URLs and no visits yet, tell the model to visit[\s\S]*?\n      \}\n      emitLive\(\{\n        action: "web_search",/,
  "\n      emitLive({\n        action: \"web_search\",",
  "post-search steering",
);
a = replaceIfPresent(a,
  /\n    \/\/ done — only soft-reject pure no-ops[\s\S]*?\n    findings = mergeFindings\(findings, action\.findings\);/,
  "\n    // done is model-owned; deterministic validation only applies to returned findings.\n    findings = mergeFindings(findings, action.findings);",
  "forced completion steering",
);

// The model owns OSINT-tool choice. Remove legacy footprint counters if they
// still exist, while leaving lifecycle wall-clock/operator cancellation intact.
a = replaceIfPresent(a,
  /\n\s*if \(footprintCalls >= 4\) \{[\s\S]*?\n\s*\}\n/g,
  "\n",
  "footprint cap 4",
);
a = replaceIfPresent(a,
  /\n\s*if \(footprintCalls >= 3\) \{[\s\S]*?\n\s*\}\n/g,
  "\n",
  "footprint cap 3",
);

// Current Gemini action schema. This is inserted once and then left untouched.
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
    findings: { type: "array", items: {
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
    } },
  },
  required: ["action"],
  additionalProperties: false,
};

`;
  a = a.replace("async function callGeminiJson", schema + "async function callGeminiJson");
  changes++;
}

// Add structured output only when the current Gemini block has not already got it.
if (!a.includes("mimeType: \"application/json\", schema: AGENTIC_ACTION_SCHEMA")) {
  a = replaceIfPresent(a,
    /generationConfig: \{\n\s*maxOutputTokens: 4096,\n\s*thinkingConfig: \{ thinkingLevel: "high" \},\n\s*\}/,
    `generationConfig: {
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingLevel: "high" },
                responseFormat: { text: { mimeType: "application/json", schema: AGENTIC_ACTION_SCHEMA } },
              }`,
    "Gemini structured output",
  );
}

// Gemini 3.x performs better when its native reasoning controls are used rather
// than a low temperature clamp. Other provider temperatures are likewise left
// to provider/model defaults unless explicitly configured elsewhere.
a = a.replace(/\n\s*temperature: 0\.25,\n/g, "\n");

// Do not silently reduce a caller-supplied iteration budget. The budget is still
// finite when the caller supplies one; otherwise the model gets a larger default.
a = replaceIfPresent(a, /const MAX_ITER = 20;/, "const MAX_ITER = 40;", "default iteration budget");
a = replaceIfPresent(a, /const maxIter = Math\.min\(input\.maxIterations \?\? MAX_ITER, 24\);/, "const maxIter = Math.max(1, input.maxIterations ?? MAX_ITER);", "hidden iteration ceiling");

// Discovery admission keeps only unmistakable transport/metadata junk in the
// deterministic gate. Semantic identity judgment remains with the research model.
d = replaceIfPresent(d,
  /const INVALID_PERSON_NAME_WORDS = new Set\(\[[\s\S]*?\]\);\nconst INVALID_PERSON_NAME_PHRASES = \[[\s\S]*?\];/,
  `const INVALID_PERSON_NAME_WORDS = new Set(["email", "phone", "address", "street", "product", "comparison", "person", "www", "com"]);
const INVALID_PERSON_NAME_PHRASES = ["security issues", "security issue", "chief executive officer", "executive officer", "forbes list", "forbes billionaires", "the billionaire", "the billionaires"];`,
  "discovery semantic gate",
);

fs.writeFileSync(agenticPath, a);
fs.writeFileSync(discoveryPath, d);
console.log(`[apex-agentic-final] runtime normalized; ${changes} change(s)`);
