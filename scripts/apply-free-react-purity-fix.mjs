import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const discoveryPath = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let s = fs.readFileSync(path, "utf8");
let d = fs.readFileSync(discoveryPath, "utf8");
const original = s;
const originalDiscovery = d;

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
s = s.replace(/\n\s*response_format: \{ type: "json_object" \},/g, "");

// Discovery quality matters more than latency: use the Boss model first, then
// the right-hand NVIDIA lane, then Groq and finally Mistral. Provider fallback
// is failure handling only; it never selects research actions or targets.
s = s.replace(
  'const chain: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [\n    ["groq", callGroqJson],\n    ["mistral", callMistralJson],\n    ["gemini", callGeminiJson],\n    ["nvidia", callNvidiaJson],\n  ];',
  'const chain: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [\n    ["gemini", callGeminiJson],\n    ["nvidia", callNvidiaJson],\n    ["groq", callGroqJson],\n    ["mistral", callMistralJson],\n  ];',
);
s = s.replace(/max_tokens: 2048,/g, "max_tokens: 1536,");

if (s.includes("function hasStrongIdentityEvidence") && !s.includes("export function hasStrongIdentityEvidence")) {
  s = s.replace("function hasStrongIdentityEvidence", "export function hasStrongIdentityEvidence");
}

// Discovery slots are bounded, but they must not be memoryless. Carry a compact
// model-generated trajectory from prior slots so the next model can see failed
// avenues, useful URLs, and already-explored directions. This is context sharing,
// not a scripted query plan: the next model still owns the next action completely.
if (!d.includes("const batchHistory: string[] = []")) {
  const stateAnchor = '  let lastMessage = "";';
  if (!d.includes(stateAnchor)) throw new Error("discovery state anchor missing");
  d = d.replace(stateAnchor, `${stateAnchor}\n  const batchHistory: string[] = [];`);
}
if (!d.includes("const recentBatchTrajectory = batchHistory.slice(-10).join(\"\\n\");")) {
  const objectiveAnchor = '      const objective = [';
  if (!d.includes(objectiveAnchor)) throw new Error("discovery objective anchor missing");
  d = d.replace(objectiveAnchor, '      const recentBatchTrajectory = batchHistory.slice(-10).join("\\n");\n      const objective = [');
  const alreadyLine = '        already ? `ALREADY SELECTED IN THIS BATCH — do not repeat these people; find a genuinely different principal/operator: ${already}` : "This is the first slot; choose the strongest promising person you can find.",';
  if (!d.includes(alreadyLine)) throw new Error("discovery objective context anchor missing");
  d = d.replace(alreadyLine, `${alreadyLine}\n        recentBatchTrajectory ? \`RECENT BATCH TRAJECTORY (context only — do not copy its actions; use it to avoid repeating dead ends):\\n\${recentBatchTrajectory}\` : "No prior batch trajectory is available.",`);
}
if (!d.includes("batchHistory.push(...(result.trajectory ?? []).slice(-8));")) {
  const resultAnchor = '        lastMessage = result.error || result.status || "completed";';
  if (!d.includes(resultAnchor)) throw new Error("discovery result anchor missing");
  d = d.replace(resultAnchor, `${resultAnchor}\n        batchHistory.push(...(result.trajectory ?? []).slice(-8));`);
}

if (s === original && d === originalDiscovery) {
  console.log("Free-ReAct/provider/discovery-context repair already present; no changes needed");
  process.exit(0);
}

if (/llm_all_failed — deterministic recovery|DETERMINISTIC SEARCH \(no LLM\)|det_visit/.test(s)) {
  throw new Error("free-ReAct purity repair incomplete: deterministic recovery markers remain");
}

fs.writeFileSync(path, s);
fs.writeFileSync(discoveryPath, d);
console.log("Applied strict free-ReAct/provider/discovery-context repair: model-only tools, resilient provider transport, shared non-prescriptive trajectory context");
