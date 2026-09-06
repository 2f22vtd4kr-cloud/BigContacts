import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const researchFile = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const bureauFile = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const promptFile = path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const passFile = path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");
const casesFile = path.join(root, "artifacts/api-server/src/src/routes/research/cases.ts");

let s = fs.readFileSync(researchFile, "utf8");
let bureau = fs.readFileSync(bureauFile, "utf8");
let prompt = fs.readFileSync(promptFile, "utf8");
let pass = fs.readFileSync(passFile, "utf8");
let cases = fs.readFileSync(casesFile, "utf8");

// TWO AI LAYERS ONLY:
//   1) Gemini Boss + DeepSeek/NVIDIA Right-hand: assignment, challenge, oversight.
//   2) Selected Investigator LLM + non-LLM research tools: actual investigation.
// The Investigator LLM owns the research trajectory and decides what findings to promote.
// DeepSeek/NVIDIA is never an Investigator. Gemini is never an Investigator.
// Groq/Mistral are Investigator LLMs themselves, never a separate decision layer.

// Investigator capabilities: web search provider is a tool choice made by the Investigator.
if (!/\| \{ action: "web_search"; query: string; provider\?:/.test(s)) {
  s = s.replace('| { action: "web_search"; query: string; thought?: string }', '| { action: "web_search"; query: string; provider?: "serper" | "tavily" | "exa"; thought?: string }');
}
const searchReturn = 'return { action: "web_search", query: o.query.trim().slice(0, 300), thought: typeof o.thought === "string" ? o.thought : undefined };';
if (s.includes(searchReturn) && !s.includes('provider: requestedProvider')) {
  s = s.replace(searchReturn, 'const requestedProvider = ["serper", "tavily", "exa"].includes(String(o.provider)) ? (String(o.provider) as "serper" | "tavily" | "exa") : undefined;\n      return { action: "web_search", query: o.query.trim().slice(0, 300), provider: requestedProvider, thought: typeof o.thought === "string" ? o.thought : undefined };');
}
if (!/provider:\s*\{ type: "string", enum: \["serper", "tavily", "exa"\] \}/.test(s)) {
  s = s.replace('query: { type: "string" },\n    url: { type: "string" },', 'query: { type: "string" },\n    provider: { type: "string", enum: ["serper", "tavily", "exa"] },\n    url: { type: "string" },');
}

// Boss-selected Investigator LLM is a first-class input to the actual ReAct engine.
const sigNeedle = '  objective?: string;\n  maxIterations?: number;';
if (s.includes(sigNeedle) && !s.includes('  investigatorLlm?: "groq" | "mistral";')) {
  s = s.replace(sigNeedle, '  objective?: string;\n  /** Gemini Boss-selected Investigator LLM. DeepSeek/NVIDIA and Gemini are excluded. */\n  investigatorLlm?: "groq" | "mistral";\n  maxIterations?: number;');
}
const llmStart = 'async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {';
if (s.includes(llmStart) && !s.includes('async function llmStep(prompt: string, selectedInvestigatorLlm?: "groq" | "mistral")')) {
  s = s.replace(llmStart, 'async function llmStep(prompt: string, selectedInvestigatorLlm?: "groq" | "mistral"): Promise<{ model: string; raw: string } | null> {');
}

// The Investigator pool contains the investigators themselves. No extra model-decision hop.
const start = s.indexOf('const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]>');
if (start < 0) throw new Error("investigator LLM pool: provider array not found");
const end = s.indexOf('    ];', start);
if (end < 0) throw new Error("investigator LLM pool: provider array terminator not found");
const replacement = `const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]> = [
      ...(process.env.GROQ_API_KEY ? [["groq", callGroqJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
      ...(process.env.MISTRAL_API_KEY ? [["mistral", callMistralJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
    ];`;
s = s.slice(0, start) + replacement + s.slice(end + 6);
const providersLoopNeedle = '    for (const [name, fn] of providers) {';
if (s.includes(providersLoopNeedle) && !s.includes('const orderedProviders = selectedInvestigatorLlm')) {
  s = s.replace(providersLoopNeedle, '    const orderedProviders = selectedInvestigatorLlm\n      ? [...providers.filter(([name]) => name === selectedInvestigatorLlm), ...providers.filter(([name]) => name !== selectedInvestigatorLlm)]\n      : providers;\n    for (const [name, fn] of orderedProviders) {');
}

// Remove obsolete architecture marker text.
s = s.replace(/\/\*\*\n \* DIG_INVESTIGATOR_FAILOVER_CHAIN:[\s\S]*?\*\/\n/g, '');
s = s.replace(/DIG_INVESTIGATOR_FAILOVER_CHAIN/g, 'INVESTIGATOR_POOL_RETRY');
if (!s.includes('You are the Investigator LLM for this assignment.')) {
  s = s.replace('Guidelines (not a script):\n- Search snippets are leads, not identity evidence.', 'Guidelines (not a script):\n- You are the Investigator LLM for this assignment. You own the research trajectory, choose the next action from evidence, and decide which findings are strong enough to promote. Boss/Right-hand guidance is oversight, not a tool order.\n- You may independently choose permitted non-LLM capabilities including Serper, Tavily, Exa, browser/fetch, Scrapfly, ZenRows, registries, RDAP/Whois, Holehe, Maigret, Sherlock, and theHarvester when they increase information gain.\n- Search snippets are leads, not identity evidence.');
}

// Durable Boss plan state.
const bossPlanTypeNeedle = '    investigatorPrompt: string | null;\n    restrictions: string[];';
if (bureau.includes(bossPlanTypeNeedle) && !bureau.includes('    investigatorLlm?: "groq" | "mistral" | null;')) {
  bureau = bureau.replace(bossPlanTypeNeedle, '    investigatorPrompt: string | null;\n    investigatorLlm?: "groq" | "mistral" | null;\n    restrictions: string[];');
}
const firstResultIndex = bureau.indexOf('export type GeminiBossPlanResult =');
const resultPos = bureau.indexOf('  investigatorPrompt: string | null;\n  restrictions: string[];', firstResultIndex);
if (resultPos >= 0 && !bureau.slice(resultPos - 200, resultPos + 200).includes('investigatorLlm')) {
  bureau = bureau.slice(0, resultPos) + bureau.slice(resultPos).replace('  investigatorPrompt: string | null;\n  restrictions: string[];', '  investigatorPrompt: string | null;\n  investigatorLlm: "groq" | "mistral" | null;\n  restrictions: string[];', 1);
}
const parseMarker = '    const investigatorPrompt = typeof parsed.investigatorPrompt === "string" ? parsed.investigatorPrompt.trim() : "";';
if (bureau.includes(parseMarker) && !bureau.includes('const rawInvestigatorLlm =')) {
  bureau = bureau.replace(parseMarker, '    const rawInvestigatorLlm = typeof parsed.investigatorLlm === "string" ? parsed.investigatorLlm.trim().toLowerCase() : "";\n    const investigatorLlm: "groq" | "mistral" | null = rawInvestigatorLlm === "groq" || rawInvestigatorLlm === "mistral" ? rawInvestigatorLlm : null;\n    const investigatorLlmAvailable = investigatorLlm === "groq" ? Boolean(process.env.GROQ_API_KEY) : investigatorLlm === "mistral" ? Boolean(process.env.MISTRAL_API_KEY) : false;\n    const investigatorPrompt = typeof parsed.investigatorPrompt === "string" ? parsed.investigatorPrompt.trim() : "";');
}
if (bureau.includes('    if (!decision || !reason || investigatorPrompt.length < 20) return null;') && !bureau.includes('!investigatorLlmAvailable')) {
  bureau = bureau.replace('    if (!decision || !reason || investigatorPrompt.length < 20) return null;', '    if (!decision || !reason || investigatorPrompt.length < 20 || !investigatorLlm || !investigatorLlmAvailable) return null;');
}
if (bureau.includes('      investigatorPrompt: investigatorPrompt.slice(0, 4000),') && !bureau.includes('      investigatorLlm,\n      restrictions:')) {
  bureau = bureau.replace('      investigatorPrompt: investigatorPrompt.slice(0, 4000),', '      investigatorPrompt: investigatorPrompt.slice(0, 4000),\n      investigatorLlm,', 1);
}
if (bureau.includes('    investigatorPrompt: null,\n    restrictions: [],') && !bureau.includes('    investigatorLlm: null,\n    restrictions: [],')) {
  bureau = bureau.replace('    investigatorPrompt: null,\n    restrictions: [],', '    investigatorPrompt: null,\n    investigatorLlm: null,\n    restrictions: [],');
}
if (bureau.includes('        investigatorPrompt: null,\n        restrictions: [],') && !bureau.includes('        investigatorLlm: null,\n        restrictions: [],')) {
  bureau = bureau.replace('        investigatorPrompt: null,\n        restrictions: [],', '        investigatorPrompt: null,\n        investigatorLlm: null,\n        restrictions: [],');
}

// Gemini is the Boss. There is no Groq fallback in the Boss lane.
const groqFirstPlan = /    \/\/ Groq-first: avoid Gemini text-gen 429 stalls on plan steps[\s\S]*?    if \(!generated\.raw\) return unavailable\(generated\.error \?\? "Boss plan text generation returned no text\."\);/;
if (groqFirstPlan.test(bureau)) bureau = bureau.replace(groqFirstPlan, '    const generated = await generateGeminiBossText(selection, planPrompt);\n    if (!generated.raw) return unavailable(generated.error ?? "Gemini Boss plan generation returned no text.");');
const groqFirstDiscovery = /    \/\/ Groq-first for discovery brief text:[\s\S]*?    const parsed = parseBossDiscoveryResponse\(generated\.raw\);/;
if (groqFirstDiscovery.test(bureau)) bureau = bureau.replace(groqFirstDiscovery, '    const generated = await generateGeminiBossText(selection, prompt);\n    if (!generated.raw) {\n      return { status: "unavailable", model: generated.model, report: null, candidates: [], citations: [], nextDirections: [], uncertainties: [], error: generated.error ?? "Gemini Boss discovery generation returned no text." };\n    }\n    const parsed = parseBossDiscoveryResponse(generated.raw);');

// Ensure applyGeminiBossPlan carries the assignment into the living case file.
const applyInputNeedle = '    investigatorPrompt: string | null;\n    restrictions: string[];';
const applyFn = bureau.indexOf('export function applyGeminiBossPlan(');
const applyInputPos = bureau.indexOf(applyInputNeedle, applyFn);
if (applyInputPos >= 0 && !bureau.slice(applyInputPos - 100, applyInputPos + 180).includes('investigatorLlm')) {
  bureau = bureau.slice(0, applyInputPos) + bureau.slice(applyInputPos).replace(applyInputNeedle, '    investigatorPrompt: string | null;\n    investigatorLlm?: "groq" | "mistral" | null;\n    restrictions: string[];', 1);
}
const applyAssignNeedle = '      investigatorPrompt: input.investigatorPrompt,\n      restrictions: input.restrictions,';
if (bureau.includes(applyAssignNeedle) && !bureau.includes('      investigatorLlm: input.investigatorLlm,')) {
  bureau = bureau.replace(applyAssignNeedle, '      investigatorPrompt: input.investigatorPrompt,\n      investigatorLlm: input.investigatorLlm ?? null,\n      restrictions: input.restrictions,');
}

// Boss prompt: explicit pool selection, no hidden second model.
if (!prompt.includes('INVESTIGATOR LLM POOL (actual investigators)')) {
  prompt = prompt.replace('You are a text-only planning model. You have no web access and must not use or request Google Search grounding.', 'You are a text-only planning model. You have no web access and must not use or request Google Search grounding.\n\nINVESTIGATOR LLM POOL (actual investigators): select exactly one configured Investigator LLM for every proceed decision: Groq or Mistral. They are the investigators themselves, not a decision layer. DeepSeek via NVIDIA NIM is Right-hand only. Gemini is the Boss. Non-LLM research tools are chosen by the selected Investigator based on evidence.');
}
if (!prompt.includes('"investigatorLlm": "groq" | "mistral"')) {
  prompt = prompt.replace('  "actionId": "one exact queued action id",\n  "rightHandDisposition":', '  "actionId": "one exact queued action id",\n  "investigatorLlm": "groq" | "mistral",\n  "rightHandDisposition":');
}

// Pass assignment into Bureau ReAct wrapper.
const passInputNeedle = '  objective?: string;\n  caseId?: string | number;';
if (pass.includes(passInputNeedle) && !pass.includes('  investigatorLlm?: "groq" | "mistral";')) pass = pass.replace(passInputNeedle, '  objective?: string;\n  investigatorLlm?: "groq" | "mistral";\n  caseId?: string | number;');
const passResearchNeedle = '      objective: input.objective\n        ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,\n      maxIterations:';
if (pass.includes(passResearchNeedle) && !pass.includes('      investigatorLlm: input.investigatorLlm,')) pass = pass.replace(passResearchNeedle, '      objective: input.objective\n        ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,\n      investigatorLlm: input.investigatorLlm,\n      maxIterations:');

// Next-pass execution uses exactly the Investigator chosen by Boss.
const nextPassCall = '      const agenticAdv = await runBureauAgenticWebPass({';
if (cases.includes(nextPassCall) && !cases.includes('investigatorLlm: bossPlan.investigatorLlm')) {
  const callPos = cases.indexOf(nextPassCall);
  const objectivePos = cases.indexOf('        objective:', callPos);
  if (objectivePos >= 0) {
    cases = cases.slice(0, objectivePos) + '        investigatorLlm: bossPlan.investigatorLlm ?? undefined,\n' + cases.slice(objectivePos);
  }
}

// Persist selected investigator in the Boss assignment event for auditability.
if (cases.includes('responseSummary: `OUT: ${bossPlan.status}; outcome=${bossPlan.outcome}; actionId=${bossPlan.actionId ?? "none"};')) {
  cases = cases.replace(
    'responseSummary: `OUT: ${bossPlan.status}; outcome=${bossPlan.outcome}; actionId=${bossPlan.actionId ?? "none"};',
    'responseSummary: `OUT: ${bossPlan.status}; outcome=${bossPlan.outcome}; actionId=${bossPlan.actionId ?? "none"}; investigator=${bossPlan.investigatorLlm ?? "none"};'
  );
}

fs.writeFileSync(researchFile, s);
fs.writeFileSync(bureauFile, bureau);
fs.writeFileSync(promptFile, prompt);
fs.writeFileSync(passFile, pass);
fs.writeFileSync(casesFile, cases);
console.log("Applied: Gemini Boss + DeepSeek/NVIDIA Right-hand select a real Investigator LLM; selected Investigator owns ReAct/tool choice/promotion; assignment is persisted and passed to runtime.");