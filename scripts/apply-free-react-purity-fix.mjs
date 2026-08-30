import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let s = fs.readFileSync(path, "utf8");
const original = s;

// Free-ReAct must fail closed when no LLM is available. The old implementation
// switched to a deterministic search/visit recovery path, which is precisely
// the scripted research behavior this architecture forbids.
const recoveryRe = /\n    if \(!llm\) \{[\s\S]*?\n    \}\n    modelUsed = llm\.model;/;
if (recoveryRe.test(s)) {
  s = s.replace(
    recoveryRe,
    `
    if (!llm) {
      history.push(\`step\${i + 1}: llm_unavailable — no deterministic research fallback\`);
      return {
        status: "unavailable",
        model: "none",
        iterations: i + 1,
        searches,
        visits,
        findings,
        trajectory: history,
        error: "No agentic LLM provider available; free-ReAct pass stopped without scripted research",
      };
    }
    modelUsed = llm.model;`,
  );
}

// A model-selected visit may extract facts from that page, but it must not
// automatically trigger a second tool such as RDAP/Whois. The next tool choice
// belongs to the model on the next ReAct turn.
const autoDomainHopRe = /\n      \/\/ Permanent domain surface hop \(RDAP-first \+ WhoisJSON\)[\s\S]*?\n      emitLive\(\{/g;
s = s.replace(autoDomainHopRe, "\n      emitLive({");

// These helpers existed solely to support the deterministic recovery route.
// Remove them so future edits cannot accidentally revive a hidden scripted path.
s = s.replace(/\n  const rankVisitUrl = \(u: string\): number => \{[\s\S]*?\n  \};\n/, "\n");
s = s.replace(/\n  const seedCompanyContactPaths = \(urls: string\[\]\) => \{[\s\S]*?\n  \};\n/, "\n");
s = s.replace(/\n  const detVisitNext = async \(stepLabel: string\): Promise<boolean> => \{[\s\S]*?\n  \};\n/, "\n");
s = s.replace(/\n\s*seedCompanyContactPaths\(sr\.urls\);\n/g, "\n");

// Provider calls must not depend on vendor-specific JSON response_format support.
// The prompt already requires one JSON object and parseAction is fail-closed.
// Removing the optional response_format makes Groq/NVIDIA/Mistral usable when a
// provider/model rejects that parameter, while preserving the exact same action
// surface and keeping provider choice in the model control plane.
s = s.replace(/\n\s*response_format: \{ type: "json_object" \},/g, "");

// Discovery quality matters more than latency: use the Boss model first, then
// the right-hand NVIDIA lane, then Groq and finally Mistral. Provider fallback
// is failure handling only; it never selects research actions or targets.
s = s.replace(
  'const chain: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [\n    ["groq", callGroqJson],\n    ["mistral", callMistralJson],\n    ["gemini", callGeminiJson],\n    ["nvidia", callNvidiaJson],\n  ];',
  'const chain: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [\n    ["gemini", callGeminiJson],\n    ["nvidia", callNvidiaJson],\n    ["groq", callGroqJson],\n    ["mistral", callMistralJson],\n  ];',
);

// Keep the provider budget modest so one control-plane step does not consume a
// disproportionate share of a provider quota while still leaving the model
// enough room for a JSON action plus reasoning summary.
s = s.replace(/max_tokens: 2048,/g, "max_tokens: 1536,");

// Export the production identity gate so regression tests exercise the real
// admission boundary rather than maintaining a second test-only implementation.
if (s.includes("function hasStrongIdentityEvidence") && !s.includes("export function hasStrongIdentityEvidence")) {
  s = s.replace("function hasStrongIdentityEvidence", "export function hasStrongIdentityEvidence");
}

if (s === original) {
  console.log("Free-ReAct purity/provider repair already present; no changes needed");
  process.exit(0);
}

if (/llm_all_failed — deterministic recovery|DETERMINISTIC SEARCH \(no LLM\)|det_visit/.test(s)) {
  throw new Error("free-ReAct purity repair incomplete: deterministic recovery markers remain");
}

fs.writeFileSync(path, s);
console.log("Applied strict free-ReAct/provider repair: model-only tool choice, resilient JSON transport, quality-first provider fallback");
