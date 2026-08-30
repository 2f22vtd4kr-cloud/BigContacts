import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const rightHandPath = "artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts";
let s = fs.readFileSync(path, "utf8");
let r = fs.readFileSync(rightHandPath, "utf8");

// Research-path autonomy: remove historical per-tool counters. Lifecycle and
// provider budgets remain the only runtime ceilings.
s = s.replace(/\n      if \(footprintCalls >= 4\) \{[\s\S]*?\n      \}\n/g, "\n");
s = s.replace(/\n      if \(footprintCalls >= 3\) \{[\s\S]*?\n      \}\n/g, "\n");

// The old hosted/free NVIDIA aliases returned HTTP 410 in the live audit. These
// current inference API models are documented as active chat-completion models.
const currentNvidia = "nvidia/nemotron-3-nano-30b-a3b";
const secondaryNvidia = "nvidia/nemotron-3.5-lightning-30b-a3b";
const nvidiaModelsRe = /const models = \[\s*process\.env\.NVIDIA_AGENTIC_MODEL,[\s\S]*?\n  \]\.filter\(\(m\): m is string => Boolean\(m && m\.trim\(\)\)\);/;
const nvidiaModels = `const models = [\n    process.env.NVIDIA_AGENTIC_MODEL,\n    process.env.NVIDIA_NIM_MODEL,\n    "${currentNvidia}",\n    "${secondaryNvidia}",\n  ].filter((m): m is string => Boolean(m && m.trim()));`;
if (!nvidiaModelsRe.test(s)) throw new Error("NVIDIA model list anchor missing");
s = s.replace(nvidiaModelsRe, nvidiaModels);
r = r.replace(/"nvidia\/llama-3\.3-nemotron-super-49b-v1\.5"/g, `"${currentNvidia}"`);
r = r.replace(/"z-ai\/glm-5\.2"/g, `"${currentNvidia}"`);

// Direct current Gemini adapter. Gemini 3.7 Flash is a current GA model; quota
// and lifecycle errors are exposed rather than swallowed.
const geminiRe = /async function callGeminiJson\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nasync function callMistralJson/;
if (!/gemini-3\.7-flash/.test(s)) {
  if (!geminiRe.test(s)) throw new Error("Gemini adapter anchor missing");
  const geminiFn = [
    'async function callGeminiJson(prompt: string): Promise<{ model: string; raw: string } | null> {',
    '  const key = process.env.GEMINI_API_KEY?.trim();',
    '  if (!key) return null;',
    '  const model = (process.env.GEMINI_AGENTIC_MODEL || process.env.GEMINI_BOSS_MODEL || "gemini-3.7-flash").trim();',
    '  try {',
    '    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {',
    '      method: "POST",',
    '      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },',
    '      body: JSON.stringify({',
    '        systemInstruction: { parts: [{ text: apexOrientationFor("dig_agent") + "\\nReply with ONE JSON object only for this ReAct step." }] },',
    '        contents: [{ role: "user", parts: [{ text: prompt }] }],',
    '        generationConfig: { maxOutputTokens: 1536, thinkingConfig: { thinkingLevel: "medium" } },',
    '      }),',
    '      signal: AbortSignal.timeout(30_000),',
    '    });',
    '    if (!resp.ok) {',
    '      const body = (await resp.text()).slice(0, 600);',
    '      logger.warn({ provider: "gemini", status: resp.status, model, body }, "agentic provider rejected request");',
    '      return null;',
    '    }',
    '    const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };',
    '    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";',
    '    if (raw) return { model: "gemini:" + model, raw };',
    '  } catch (err: any) {',
    '    logger.warn({ provider: "gemini", model, error: err?.message }, "agentic Gemini call failed");',
    '  }',
    '  return null;',
    '}',
    '',
    'async function callMistralJson',
  ].join("\n");
  s = s.replace(geminiRe, geminiFn);
}

// Provider diagnostics: status, model and transport error are observable, but
// secrets and prompts are never logged.
const providerSectionRe = /(async function callGroqJson[\s\S]*?)(\nfunction formatFindingsBag)/;
const providerSection = s.match(providerSectionRe)?.[1];
if (providerSection) {
  const diagnosed = providerSection
    .replace(/if \(!resp\.ok\) continue;/g, 'if (!resp.ok) { logger.warn({ provider: "agentic", status: resp.status, model }, "agentic provider rejected request"); continue; }')
    .replace(/catch \{\n\s*continue;\n\s*\}/g, 'catch (err: any) { logger.warn({ provider: "agentic", model, error: err?.message }, "agentic provider call failed"); continue; }');
  s = s.replace(providerSectionRe, diagnosed + "$2");
}

// Provider circuit: after an all-provider failure, do not burn the remaining
// discovery slots by repeating the same dead network calls. This is transport
// resource protection only; a healthy model still owns every research action.
const llmStepRe = /async function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nfunction formatFindingsBag/;
const llmFn = [
  'let agenticProviderCircuitUntil = 0;',
  '',
  'async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {',
  '  const now = Date.now();',
  '  if (now < agenticProviderCircuitUntil) {',
  '    logger.warn({ until: agenticProviderCircuitUntil }, "[agentic] provider circuit open; skipping repeated failed calls");',
  '    return null;',
  '  }',
  '  const stages: Array<Array<[string, () => Promise<{ model: string; raw: string } | null>]>> = [',
  '    [["gemini", callGeminiJson], ["nvidia", callNvidiaJson]],',
  '    [["groq", callGroqJson], ["mistral", callMistralJson]],',
  '  ];',
  '  const providerDecisionTimeoutMs = 18_000;',
  '  const errors: string[] = [];',
  '  for (const stage of stages) {',
  '    const attempts = stage.map(async ([name, fn]) => {',
  '      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs));',
  '      try {',
  '        const out = await Promise.race([fn(prompt), timeout]);',
  '        if (!out?.raw) throw new Error(name + ":empty");',
  '        return out;',
  '      } catch (err: any) {',
  '        throw new Error(name + ":" + (err?.message ?? "fail"));',
  '      }',
  '    });',
  '    try {',
  '      const out = await Promise.any(attempts);',
  '      agenticProviderCircuitUntil = 0;',
  '      setAgenticLlmHealth(true, out.model, null);',
  '      return out;',
  '    } catch (err: any) {',
  '      const reasons = Array.isArray(err?.errors) ? err.errors.map((e: unknown) => String(e)).join(";") : String(err?.message ?? "all_failed");',
  '      errors.push(reasons.slice(0, 500));',
  '    }',
  '  }',
  '  // A short circuit prevents ten-target batches from hammering a dead/quota-exhausted',
  '  // provider set. The circuit is not a research decision and expires automatically.',
  '  agenticProviderCircuitUntil = Date.now() + 60_000;',
  '  setAgenticLlmHealth(false, null, errors.join(";").slice(0, 1000));',
  '  logger.warn({ errors }, "[agentic] all LLM providers failed for step; circuit opened");',
  '  return null;',
  '}',
  '',
  'function formatFindingsBag',
].join("\n");
if (!llmStepRe.test(s)) throw new Error("llmStep anchor missing");
s = s.replace(llmStepRe, llmFn);

if (!s.includes("Tool choice remains unconstrained by footprint counters")) {
  s = s.replace(
    '    // Model-led only. detVisitNext only on all-LLM-fail recovery.',
    '    // Model-led only. Tool choice remains unconstrained by footprint counters; lifecycle budgets are the only runtime ceiling.',
  );
}

if (/footprintCalls >= [34]/.test(s)) throw new Error("hidden footprint tool cap remains");
if (!s.includes(currentNvidia) || !s.includes(secondaryNvidia) || !r.includes(currentNvidia)) throw new Error("current NVIDIA model fallback missing");
if (!s.includes("gemini-3.7-flash")) throw new Error("current Gemini Boss adapter missing");
if (!s.includes("agenticProviderCircuitUntil")) throw new Error("provider circuit missing");

fs.writeFileSync(path, s);
fs.writeFileSync(rightHandPath, r);
console.log("Applied agentic runtime hardening: current NVIDIA inference models, Gemini diagnostics, provider circuit protection, and no model-path tool caps");
