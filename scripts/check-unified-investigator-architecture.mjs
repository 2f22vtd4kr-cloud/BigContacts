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
  finalReview: path.join(root, "artifacts/api-server/src/lib/ai-extractor.ts"),
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

// Groq/Mistral are investigators, not a sequential research architecture or reviewer tier.
assert(!/Groq\s*[→>-]+\s*Mistral|Mistral\s*[→>-]+\s*Groq/.test(source.research + source.bureau + source.prompt), "Active runtime still contains a Groq→Mistral Investigator chain.");
assert(!/Prefer\s+Serper.*Tavily.*Exa/i.test(source.research), "Active research runtime contains a ranked Serper→Tavily→Exa preference list.");
assert(!/const\s+serper\s*=.*\n\s*if\s*\(serper.*\n\s*const\s+tavily\s*=.*\n\s*if\s*\(tavily.*\n\s*const\s+exa\s*=/s.test(source.research), "Active research runtime contains deterministic sequential search-provider selection.");
assert(!/web_search routes Serper\s*[→>-]+\s*Tavily/i.test(source.orientation), "Investigator orientation still teaches a fixed search-provider route.");

// Groq/Mistral must never become a Boss/Right-hand/final-review decision layer.
assert(!/generateGroqBossText|Groq text fallback for Boss/i.test(source.bureau), "Groq is still exposed as a Boss planning fallback.");
assert(!/groq-final-review-fallback|Boss \(Gemini\).*NVIDIA.*Groq|Final card publication review.*Groq/i.test(source.finalReview), "Groq is still exposed as a final card review/decision layer.");

// The selected Investigator must propagate from the Boss plan all the way into the ReAct pass.
assert(/investigatorLlm/.test(source.bureau), "Boss plan does not expose investigatorLlm.");
assert(/investigatorLlm/.test(source.cases), "Case route does not persist/pass investigatorLlm.");
assert(/investigatorLlm/.test(source.pass), "ReAct pass does not accept investigatorLlm.");
assert(/investigatorLlm/.test(source.research), "ReAct research runtime does not receive investigatorLlm.");
assert(/runBureauAgenticWebPass\(\{[\s\S]*?investigatorLlm\s*:/.test(source.cases), "Case route invokes the agentic pass without explicitly binding the Boss-selected Investigator.");
assert(/runTargetContactAgent\(\{[\s\S]*?investigatorLlm\s*:/.test(source.cases + source.bureau) || /runTargetContactAgent\(\{[\s\S]*?investigatorLlm\s*:/.test(source.research), "Canonical target Dig call is not visibly bound to an explicit Investigator selection.");

// Case discovery must not bypass the ReAct Investigator with fixed model/tool lanes.
assert(!/\brunMistralWebSearch\s*\(/.test(source.cases), "Case route still invokes Mistral as a fixed web-search lane instead of as the selected ReAct Investigator.");
assert(!/\brunBroadDiscovery\s*\(/.test(source.cases), "Case route still invokes deterministic broad-discovery machinery as a fixed research stage.");
assert(!/\bsearchRegistry\s*\(/.test(source.cases), "Case route still invokes registry research directly instead of exposing it only as a model-selected capability.");

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
console.log("- Groq/Mistral remain Investigator LLMs, not a sequential chain or reviewer tier");
console.log("- Investigator selection propagates into ReAct");
console.log("- Search/browser/registry/OSINT remain model-selected capabilities");