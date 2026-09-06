import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  research: path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"),
  bureau: path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts"),
  prompt: path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts"),
  pass: path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"),
  cases: path.join(root, "artifacts/api-server/src/src/routes/research/cases.ts"),
  orientation: path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts"),
  architecture: path.join(root, "docs/BUREAU_REACT_ARCHITECTURE.md"),
};

const source = Object.fromEntries(
  Object.entries(files).map(([name, file]) => {
    if (!fs.existsSync(file)) throw new Error(`missing required architecture file: ${file}`);
    return [name, fs.readFileSync(file, "utf8")];
  }),
);

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

// DeepSeek/Gemini must never enter the Investigator LLM pool.
assert(!/DEEPSEEK_INVESTIGATOR_MODEL|\["deepseek",\s*callDeepSeekJson\]|\bname === "deepseek"/.test(source.research), "DeepSeek is present in the Investigator adapter pool; DeepSeek must remain Right-hand only.");
assert(!/Gemini.*Investigator fallback|investigator.*Gemini.*fallback/i.test(source.prompt + source.bureau), "Gemini appears to be described as an Investigator fallback.");

// Groq/Mistral are investigators, not a sequential research architecture.
assert(!/Groq\s*[→>-]+\s*Mistral|Mistral\s*[→>-]+\s*Groq/.test(source.research + source.bureau + source.prompt), "Active runtime still contains a Groq→Mistral Investigator chain.");

// Search providers are capabilities. A model may explicitly request one; the runtime must not encode a ranked research preference list.
assert(!/Prefer\s+Serper.*Tavily.*Exa/i.test(source.research), "Active research runtime contains a ranked Serper→Tavily→Exa preference list.");
assert(!/const\s+serper\s*=.*\n\s*if\s*\(serper.*\n\s*const\s+tavily\s*=.*\n\s*if\s*\(tavily.*\n\s*const\s+exa\s*=/s.test(source.research), "Active research runtime contains deterministic sequential search-provider selection.");
assert(!/web_search routes Serper\s*[→>-]+\s*Tavily/i.test(source.orientation), "Investigator orientation still teaches a fixed search-provider route.");

// The selected Investigator must propagate from the Boss plan to the ReAct pass.
assert(/investigatorLlm/.test(source.bureau), "Boss plan does not expose investigatorLlm.");
assert(/investigatorLlm/.test(source.cases), "Case route does not persist/pass investigatorLlm.");
assert(/investigatorLlm/.test(source.pass), "ReAct pass does not accept investigatorLlm.");
assert(/investigatorLlm/.test(source.research), "ReAct research runtime does not receive investigatorLlm.");

// The architecture document must describe the same two-layer law.
assert(/Gemini/.test(source.architecture) && /DeepSeek/.test(source.architecture) && /Investigator LLM pool/.test(source.architecture), "Canonical ReAct architecture document is missing the two-layer role law.");
assert(/no forced search order/i.test(source.architecture), "Canonical ReAct architecture document does not state the no-forced-search-order invariant.");

if (failures.length) {
  console.error("UNIFIED INVESTIGATOR ARCHITECTURE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UNIFIED INVESTIGATOR ARCHITECTURE: PASS");
console.log("- Gemini remains Boss only");
console.log("- DeepSeek remains Right-hand only");
console.log("- Groq/Mistral remain Investigator LLMs, not a sequential chain");
console.log("- Investigator selection propagates into ReAct");
console.log("- Search/browser/registry/OSINT remain model-selected capabilities");
