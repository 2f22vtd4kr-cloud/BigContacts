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

// Export the identity/provenance gate so regression tests exercise the real
// admission boundary rather than a duplicated test-only implementation.
if (s.includes("function hasStrongIdentityEvidence") && !s.includes("export function hasStrongIdentityEvidence")) {
  s = s.replace("function hasStrongIdentityEvidence", "export function hasStrongIdentityEvidence");
}

if (s === original) {
  // Idempotent success: the strict source is already installed.
  console.log("Free-ReAct purity repair already present; no changes needed");
  process.exit(0);
}

if (/llm_all_failed — deterministic recovery|DETERMINISTIC SEARCH \(no LLM\)|det_visit/.test(s)) {
  throw new Error("free-ReAct purity repair incomplete: deterministic recovery markers remain");
}

fs.writeFileSync(path, s);
console.log("Applied strict free-ReAct purity repair: no deterministic research fallback or auto tool hops");
