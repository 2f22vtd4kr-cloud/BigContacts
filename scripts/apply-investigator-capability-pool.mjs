import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const researchFile = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const bureauFile = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const promptFile = path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const passFile = path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");

let s = fs.readFileSync(researchFile, "utf8");
let bureau = fs.readFileSync(bureauFile, "utf8");
let prompt = fs.readFileSync(promptFile, "utf8");
let pass = fs.readFileSync(passFile, "utf8");

// TWO AI LAYERS ONLY:
//   1) Gemini Boss + DeepSeek/NVIDIA Right-hand: assignment, challenge, oversight.
//   2) Selected Investigator LLM + non-LLM research tools: actual investigation.
// The Investigator LLM owns the research trajectory and decides what findings to promote.
// DeepSeek/NVIDIA is never an Investigator. Gemini is never an Investigator.
// Groq/Mistral are Investigator LLMs themselves, never a separate decision layer.

// -----------------------------
// Investigator action capabilities
// -----------------------------
if (!/\| \{ action: "web_search"; query: string; provider\?:/.test(s)) {
  s = s.replace(
    '| { action: "web_search"; query: string; thought?: string }',
    '| { action: "web_search"; query: string; provider?: "serper" | "tavily" | "exa"; thought?: string }',
  );
}
const searchReturn = 'return { action: "web_search", query: o.query.trim().slice(0, 300), thought: typeof o.thought === "string" ? o.thought : undefined };';
if (s.includes(searchReturn) && !s.includes('provider: requestedProvider')) {
  s = s.replace(
    searchReturn,
    'const requestedProvider = ["serper", "tavily", "exa"].includes(String(o.provider)) ? (String(o.provider) as "serper" | "tavily" | "exa") : undefined;\n      return { action: "web_search", query: o.query.trim().slice(0, 300), provider: requestedProvider, thought: typeof o.thought === "string" ? o.thought : undefined };',
  );
}
if (!/provider:\s*\{ type: "string", enum: \["serper", "tavily", "exa"\] \}/.test(s)) {
  s = s.replace(
    'query: { type: "string" },\n    url: { type: "string" },',
    'query: { type: "string" },\n    provider: { type: "string", enum: ["serper", "tavily", "exa"] },\n    url: { type: "string" },',
  );
}

// -----------------------------
// Make Boss-selected Investigator LLM a first-class runtime input.
// -----------------------------
const sigNeedle = '  objective?: string;\n  maxIterations?: number;';
if (s.includes(sigNeedle) && !s.includes('  investigatorLlm?: "groq" | "mistral";')) {
  s = s.replace(sigNeedle, '  objective?: string;\n  /** Boss-selected Investigator LLM. DeepSeek/NVIDIA and Gemini are intentionally excluded. */\n  investigatorLlm?: "groq" | "mistral";\n  maxIterations?: number;');
}

const llmStart = 'async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {';
if (s.includes(llmStart) && !s.includes('async function llmStep(prompt: string, selectedInvestigatorLlm?: "groq" | "mistral")')) {
  s = s.replace(
    llmStart,
    'async function llmStep(prompt: string, selectedInvestigatorLlm?: "groq" | "mistral"): Promise<{ model: string; raw: string } | null> {'
  );
}

// Normalize the Investigator pool: adapters are the investigators themselves.
const start = s.indexOf('const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]>');
if (start < 0) throw new Error("investigator LLM pool: provider array not found");
const end = s.indexOf('    ];', start);
if (end < 0) throw new Error("investigator LLM pool: provider array terminator not found");
const replacement = `const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]> = [
      // These adapters are the Investigator LLMs themselves. Boss + Right-hand choose the assignment.
      ...(process.env.GROQ_API_KEY ? [["groq", callGroqJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
      ...(process.env.MISTRAL_API_KEY ? [["mistral", callMistralJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
    ];`;
s = s.slice(0, start) + replacement + s.slice(end + 6);

// Selection is authoritative for the normal path. If the selected Investigator is
// unavailable, an explicitly recorded pool-level emergency retry may use another
// Investigator; it never crosses into Boss/Right-hand models.
const providersLoopNeedle = '    for (const [name, fn] of providers) {';
if (s.includes(providersLoopNeedle) && !s.includes('selectedInvestigatorLlm && name !== selectedInvestigatorLlm')) {
  s = s.replace(
    providersLoopNeedle,
    '    const orderedProviders = selectedInvestigatorLlm\n      ? [...providers.filter(([name]) => name === selectedInvestigatorLlm), ...providers.filter(([name]) => name !== selectedInvestigatorLlm)]\n      : providers;\n    for (const [name, fn] of orderedProviders) {'
  );
}

// Remove obsolete failover-chain marker prose if present.
s = s.replace(/\/\*\*\n \* DIG_INVESTIGATOR_FAILOVER_CHAIN:[\s\S]*?\*\/\n/g, '');
s = s.replace(/DIG_INVESTIGATOR_FAILOVER_CHAIN/g, 'INVESTIGATOR_POOL_RETRY');

// Ensure the investigator prompt explicitly grants tool choice and promotion authority.
if (!s.includes('You are the Investigator LLM for this assignment.')) {
  s = s.replace(
    'Guidelines (not a script):\n- Search snippets are leads, not identity evidence.',
    'Guidelines (not a script):\n- You are the Investigator LLM for this assignment. You own the research trajectory, choose the next action from evidence, and decide which findings are strong enough to promote. Boss/Right-hand guidance is oversight, not a tool order.\n- You may independently choose permitted non-LLM capabilities including Serper, Tavily, Exa, browser/fetch, Scrapfly, ZenRows, registries, RDAP/Whois, Holehe, Maigret, Sherlock, and theHarvester when they increase information gain.\n- Search snippets are leads, not identity evidence.'
  );
}

// -----------------------------
// Boss plan schema/state: selected investigator becomes durable assignment.
// -----------------------------
const bossPlanTypeNeedle = '    investigatorPrompt: string | null;\n    restrictions: string[];';
if (bureau.includes(bossPlanTypeNeedle) && !bureau.includes('    investigatorLlm?: "groq" | "mistral" | null;')) {
  bureau = bureau.replace(bossPlanTypeNeedle, '    investigatorPrompt: string | null;\n    /** Investigator LLM selected by Gemini Boss after consulting DeepSeek Right-hand. */\n    investigatorLlm?: "groq" | "mistral" | null;\n    restrictions: string[];');
}
const bossResultNeedle = '  investigatorPrompt: string | null;\n  restrictions: string[];';
const firstResultIndex = bureau.indexOf('export type GeminiBossPlanResult =');
const resultPos = bureau.indexOf(bossResultNeedle, firstResultIndex);
if (resultPos >= 0 && !bureau.slice(resultPos - 200, resultPos + 200).includes('investigatorLlm')) {
  bureau = bureau.slice(0, resultPos) + bureau.slice(resultPos).replace(bossResultNeedle, '  investigatorPrompt: string | null;\n  /** Gemini Boss selection of the actual Investigator LLM. */\n  investigatorLlm: "groq" | "mistral" | null;\n  restrictions: string[];', 1);
}

// Parse Boss-selected Investigator LLM and require it for proceed decisions.
const parseMarker = '    const investigatorPrompt = typeof parsed.investigatorPrompt === "string" ? parsed.investigatorPrompt.trim() : "";';
if (bureau.includes(parseMarker) && !bureau.includes('const rawInvestigatorLlm =')) {
  bureau = bureau.replace(
    parseMarker,
    '    const rawInvestigatorLlm = typeof parsed.investigatorLlm === "string" ? parsed.investigatorLlm.trim().toLowerCase() : "";\n    const investigatorLlm: "groq" | "mistral" | null = rawInvestigatorLlm === "groq" || rawInvestigatorLlm === "mistral" ? rawInvestigatorLlm : null;\n    const investigatorLlmAvailable = investigatorLlm === "groq" ? Boolean(process.env.GROQ_API_KEY) : investigatorLlm === "mistral" ? Boolean(process.env.MISTRAL_API_KEY) : false;\n    const investigatorPrompt = typeof parsed.investigatorPrompt === "string" ? parsed.investigatorPrompt.trim() : "";'
  );
}
const planValidation = '    if (!decision || !reason || investigatorPrompt.length < 20) return null;';
if (bureau.includes(planValidation) && !bureau.includes('investigatorLlmAvailable)')) {
  bureau = bureau.replace(planValidation, '    if (!decision || !reason || investigatorPrompt.length < 20 || !investigatorLlm || !investigatorLlmAvailable) return null;');
}

// Include selection in parsed plan result.
const returnPlanNeedle = '      investigatorPrompt: investigatorPrompt.slice(0, 4000),';
if (bureau.includes(returnPlanNeedle) && !bureau.includes('      investigatorLlm,\n      restrictions:')) {
  bureau = bureau.replace(returnPlanNeedle, '      investigatorPrompt: investigatorPrompt.slice(0, 4000),\n      investigatorLlm,', 1);
}

// Both unavailable/reject shapes need the field to keep the durable object schema stable.
const unavailableNeedle = '    investigatorPrompt: null,\n    restrictions: [],';
if (bureau.includes(unavailableNeedle) && !bureau.includes('    investigatorLlm: null,\n    restrictions: [],')) {
  bureau = bureau.replace(unavailableNeedle, '    investigatorPrompt: null,\n    investigatorLlm: null,\n    restrictions: [],');
}
const rejectReturnNeedle = '        investigatorPrompt: null,\n        restrictions: [],';
if (bureau.includes(rejectReturnNeedle) && !bureau.includes('        investigatorLlm: null,\n        restrictions: [],')) {
  bureau = bureau.replace(rejectReturnNeedle, '        investigatorPrompt: null,\n        investigatorLlm: null,\n        restrictions: [],');
}

// Boss is Gemini. Never use Groq as a Boss fallback.
const groqFirstPlan = /    \/\/ Groq-first: avoid Gemini text-gen 429 stalls on plan steps[\s\S]*?    if \(!generated\.raw\) return unavailable\(generated\.error \?\? "Boss plan text generation returned no text\."\);/;
if (groqFirstPlan.test(bureau)) {
  bureau = bureau.replace(
    groqFirstPlan,
    '    const generated = await generateGeminiBossText(selection, planPrompt);\n    if (!generated.raw) return unavailable(generated.error ?? "Gemini Boss plan generation returned no text.");'
  );
}
const groqFirstDiscovery = /    \/\/ Groq-first for discovery brief text:[\s\S]*?    if \(!generated\.raw\) \{[\s\S]*?    \}\n    const parsed = parseBossDiscoveryResponse\(generated\.raw\);/;
if (groqFirstDiscovery.test(bureau)) {
  bureau = bureau.replace(
    groqFirstDiscovery,
    '    const generated = await generateGeminiBossText(selection, prompt);\n    if (!generated.raw) {\n      return { status: "unavailable", model: generated.model, report: null, candidates: [], citations: [], nextDirections: [], uncertainties: [], error: generated.error ?? "Gemini Boss discovery generation returned no text." };\n    }\n    const parsed = parseBossDiscoveryResponse(generated.raw);'
  );
}

// -----------------------------
// Boss prompt: make the actual investigator choice explicit.
// -----------------------------
if (!prompt.includes('"investigatorLlm": "groq | mistral"')) {
  prompt = prompt.replace(
    'You are a text-only planning model. You have no web access and must not use or request Google Search grounding.',
    'You are a text-only planning model. You have no web access and must not use or request Google Search grounding.\n\nINVESTIGATOR LLM POOL (actual investigators): choose exactly one configured member for a proceed assignment: Groq or Mistral. These are investigators, not a decision layer. DeepSeek via NVIDIA NIM is the Right-hand only; Gemini is you, the Boss. Non-LLM tools are capabilities the selected Investigator may choose independently.'
  );
}
if (!prompt.includes('"investigatorLlm": "groq"')) {
  prompt = prompt.replace(
    '  "actionId": "one exact queued action id",\n  "rightHandDisposition":',
    '  "actionId": "one exact queued action id",\n  "investigatorLlm": "groq" | "mistral",\n  "rightHandDisposition":'
  );
}

// -----------------------------
// Pass the Boss assignment into the actual Investigator invocation.
// -----------------------------
const passInputNeedle = '  objective?: string;\n  caseId?: string | number;';
if (pass.includes(passInputNeedle) && !pass.includes('  investigatorLlm?: "groq" | "mistral";')) {
  pass = pass.replace(passInputNeedle, '  objective?: string;\n  /** Gemini Boss-selected Investigator LLM. */\n  investigatorLlm?: "groq" | "mistral";\n  caseId?: string | number;');
}
const passResearchNeedle = '      objective: input.objective\n        ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,\n      maxIterations:';
if (pass.includes(passResearchNeedle) && !pass.includes('      investigatorLlm: input.investigatorLlm,\n      maxIterations:')) {
  pass = pass.replace(passResearchNeedle, '      objective: input.objective\n        ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,\n      investigatorLlm: input.investigatorLlm,\n      maxIterations:');
}

fs.writeFileSync(researchFile, s);
fs.writeFileSync(bureauFile, bureau);
fs.writeFileSync(promptFile, prompt);
fs.writeFileSync(passFile, pass);
console.log("Applied two-layer runtime: Gemini Boss + DeepSeek/NVIDIA Right-hand -> selected Investigator LLM -> non-LLM tools; Boss selection is persisted and passed into the ReAct invocation.");