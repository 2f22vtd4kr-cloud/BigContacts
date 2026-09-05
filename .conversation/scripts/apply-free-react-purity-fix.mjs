import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const discoveryPath = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let s = fs.readFileSync(path, "utf8");
let d = fs.readFileSync(discoveryPath, "utf8");

const recoveryRe = /\n    if \(!llm\) \{[\s\S]*?\n    \}\n    modelUsed = llm\.model;/;
if (recoveryRe.test(s)) {
  s = s.replace(recoveryRe, `
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
    modelUsed = llm.model;`);
}

s = s.replace(/\n      \/\/ Permanent domain surface hop \(RDAP-first \+ WhoisJSON\)[\s\S]*?\n      emitLive\(\{/g, "\n      emitLive({");
s = s.replace(/\n  const rankVisitUrl = \(u: string\): number => \{[\s\S]*?\n  \};\n/, "\n");
s = s.replace(/\n  const seedCompanyContactPaths = \(urls: string\[\]\) => \{[\s\S]*?\n  \};\n/, "\n");
s = s.replace(/\n  const detVisitNext = async \(stepLabel: string\): Promise<boolean> => \{[\s\S]*?\n  \};\n/, "\n");
s = s.replace(/\n\s*seedCompanyContactPaths\(sr\.urls\);\n/g, "\n");
s = s.replace(/\n\s*response_format: \{ type: "json_object" \},/g, "");

const providerRe = /async function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nfunction formatFindingsBag/;
if (!/Promise\.any\(attempts\)/.test(s)) {
  if (!providerRe.test(s)) throw new Error("llmStep provider block anchor missing");
  const providerReplacement = [
    'async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {',
    '  const stages: Array<Array<[string, () => Promise<{ model: string; raw: string } | null>]>> = [',
    '    [["gemini", callGeminiJson], ["nvidia", callNvidiaJson]],',
    '    [["groq", callGroqJson], ["mistral", callMistralJson]],',
    '  ];',
    '  const errors: string[] = [];',
    '  for (const stage of stages) {',
    '    const attempts = stage.map(async ([name, fn]) => {',
    '      try {',
    '        const out = await fn(prompt);',
    '        if (!out?.raw) throw new Error(name + ":empty");',
    '        return out;',
    '      } catch (err: any) {',
    '        throw new Error(name + ":" + (err?.message ?? "fail"));',
    '      }',
    '    });',
    '    try {',
    '      const out = await Promise.any(attempts);',
    '      setAgenticLlmHealth(true, out.model, null);',
    '      return out;',
    '    } catch (err: any) {',
    '      const reasons = Array.isArray(err?.errors) ? err.errors.map((e: unknown) => String(e)).join(";") : String(err?.message ?? "all_failed");',
    '      errors.push(reasons.slice(0, 400));',
    '    }',
    '  }',
    '  setAgenticLlmHealth(false, null, errors.join(";").slice(0, 800));',
    '  logger.warn({ errors }, "[agentic] all LLM providers failed for step");',
    '  return null;',
    '}',
    '',
    'function formatFindingsBag',
  ].join("\n");
  s = s.replace(providerRe, providerReplacement);
}

if (!s.includes("const llmStepWithHeartbeat = async (stepPrompt: string)")) {
  const anchor = '    const prompt = buildStepPrompt({';
  if (!s.includes(anchor)) throw new Error("llm heartbeat anchor missing");
  const helper = [
    '    const llmStepWithHeartbeat = async (stepPrompt: string) => {',
    '      const started = Date.now();',
    '      emitLive({ action: "llm_wait", provider: "agentic-provider-pool", summary: "waiting for model decision" });',
    '      const timer = setInterval(() => {',
    '        emitLive({ action: "llm_wait", provider: "agentic-provider-pool", summary: "model decision still pending · " + Math.round((Date.now() - started) / 1000) + "s" });',
    '      }, 15_000);',
    '      try { return await llmStep(stepPrompt); } finally { clearInterval(timer); }',
    '    };',
    '',
  ].join("\n");
  s = s.replace(anchor, helper + anchor);
}
s = s.replace(/const llm = await llmStep\(prompt\);/, "const llm = await llmStepWithHeartbeat(prompt);");
s = s.replace(/const repair = await llmStep\(\n/, "const repair = await llmStepWithHeartbeat(\n");
s = s.replace(/max_tokens: 2048,/g, "max_tokens: 1536,");

if (!d.includes("const batchHistory: string[] = []")) {
  const anchor = '  let lastMessage = "";';
  if (!d.includes(anchor)) throw new Error("discovery state anchor missing");
  d = d.replace(anchor, anchor + '\n  const batchHistory: string[] = [];');
}
if (!d.includes("const recentBatchTrajectory = batchHistory.slice(-10).join(\"\\n\");")) {
  const anchor = '      const objective = [';
  if (!d.includes(anchor)) throw new Error("discovery objective anchor missing");
  d = d.replace(anchor, '      const recentBatchTrajectory = batchHistory.slice(-10).join("\\n");\n      const objective = [');
  const already = '        already ? `ALREADY SELECTED IN THIS BATCH — do not repeat these people; find a genuinely different principal/operator: ${already}` : "This is the first slot; choose the strongest promising person you can find.",';
  if (!d.includes(already)) throw new Error("discovery context anchor missing");
  d = d.replace(already, already + '\n        recentBatchTrajectory ? `RECENT BATCH TRAJECTORY (context only — do not copy its actions; use it to avoid repeating dead ends):\\n${recentBatchTrajectory}` : "No prior batch trajectory is available.",');
}
if (!d.includes("batchHistory.push(...(result.trajectory ?? []).slice(-8));")) {
  const anchor = '        lastMessage = result.error || result.status || "completed";';
  if (!d.includes(anchor)) throw new Error("discovery result anchor missing");
  d = d.replace(anchor, anchor + '\n        batchHistory.push(...(result.trajectory ?? []).slice(-8));');
}

if (s.includes("function hasStrongIdentityEvidence") && !s.includes("export function hasStrongIdentityEvidence")) {
  s = s.replace("function hasStrongIdentityEvidence", "export function hasStrongIdentityEvidence");
}
if (/DETERMINISTIC SEARCH \(no LLM\)|det_visit/.test(s)) throw new Error("deterministic recovery marker remains");
if (!/Promise\.any\(attempts\)/.test(s) || !s.includes("llmStepWithHeartbeat")) throw new Error("provider resilience repair incomplete");

fs.writeFileSync(path, s);
fs.writeFileSync(discoveryPath, d);
console.log("Applied free-ReAct purity, staged concurrent provider control, live LLM heartbeat, and non-prescriptive discovery context sharing");
