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

// Discovery quality matters more than latency, but a sequential provider chain can
// exceed the Atlas 90s idle-job safety window before producing the first action.
// Keep the Boss + right-hand lanes first, run them concurrently, and only fall
// through to Groq/Mistral if both primary lanes fail. This changes transport
// resilience only; the winning model still owns the next research action.
const providerBlock = /async function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nfunction formatFindingsBag/;
if (!/Promise\.any\(primaryAttempts\)/.test(s)) {
  if (!providerBlock.test(s)) throw new Error("llmStep provider block anchor missing");
  s = s.replace(
    providerBlock,
    `async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {
  // Primary control plane: Boss (Gemini) + right-hand (NVIDIA) race together.
  // If both are unavailable, the documented dig failover lanes race together.
  // No provider is allowed to select a research action on behalf of the model.
  const stages: Array<Array<[string, () => Promise<{ model: string; raw: string } | null>]>> = [
    [
      ["gemini", callGeminiJson],
      ["nvidia", callNvidiaJson],
    ],
    [
      ["groq", callGroqJson],
      ["mistral", callMistralJson],
    ],
  ];
  const errors: string[] = [];
  for (const stage of stages) {
    const attempts = stage.map(async ([name, fn]) => {
      try {
        const out = await fn(prompt);
        if (!out?.raw) throw new Error(`${name}:empty`);
        return out;
      } catch (err: any) {
        throw new Error(`${name}:${err?.message ?? "fail"}`);
      }
    });
    try {
      const out = await Promise.any(attempts);
      setAgenticLlmHealth(true, out.model, null);
      return out;
    } catch (err: any) {
      const reasons = Array.isArray(err?.errors) ? err.errors.map((e: unknown) => String(e)).join(";") : String(err?.message ?? "all_failed");
      errors.push(reasons.slice(0, 400));
    }
  }
  setAgenticLlmHealth(false, null, errors.join("; ").slice(0, 800));
  logger.warn({ errors }, "[agentic] all LLM providers failed for step");
  return null;
}

function formatFindingsBag`,
  );
}

// A long provider wait must remain visible to the job status plane. Otherwise a
// healthy-but-slow model call can be mistaken for a dead job and auto-cleared.
// This is telemetry only: it never emits or selects a research action.
if (!s.includes("const llmStepWithHeartbeat = async (stepPrompt: string)") ) {
  const heartbeatAnchor = '    const prompt = buildStepPrompt({';
  if (!s.includes(heartbeatAnchor)) throw new Error("llm heartbeat anchor missing");
  const helper = `    const llmStepWithHeartbeat = async (stepPrompt: string) => {
      const started = Date.now();
      emitLive({ action: "llm_wait", provider: "agentic-provider-pool", summary: "waiting for model decision" });
      const timer = setInterval(() => {
        emitLive({ action: "llm_wait", provider: "agentic-provider-pool", summary: \`model decision still pending · \${Math.round((Date.now() - started) / 1000)}s\` });
      }, 15_000);
      try {
        return await llmStep(stepPrompt);
      } finally {
        clearInterval(timer);
      }
    };

`;
  s = s.replace(heartbeatAnchor, helper + heartbeatAnchor);
}
s = s.replace(/const llm = await llmStep\(prompt\);/, "const llm = await llmStepWithHeartbeat(prompt);");
s = s.replace(/const repair = await llmStep\(\n/, "const repair = await llmStepWithHeartbeat(\n");

// The provider calls must remain independent of model action choice. The only
// allowed static role instruction is the product orientation; queries, visits,
// pivots, OSINT tools and stopping remain model-selected.
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
if (!/Promise\.any\(attempts\)/.test(s) || !s.includes("llmStepWithHeartbeat")) {
  throw new Error("provider resilience repair incomplete: concurrent provider control/heartbeat missing");
}

fs.writeFileSync(path, s);
fs.writeFileSync(discoveryPath, d);
console.log("Applied strict free-ReAct/provider/discovery-context repair: model-only tools, staged concurrent provider control, live LLM heartbeat, shared non-prescriptive trajectory context");
