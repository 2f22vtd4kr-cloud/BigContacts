import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(file, "utf8");

const marker = "INVESTIGATOR_LLM_CAPABILITY_POOL";

// Canonical architecture: Boss + Right-hand select an Investigator LLM from this pool.
// The pool contains the investigators themselves. There is no extra Investigator
// decision model between the oversight layer and the selected Investigator.
// DeepSeek via NVIDIA NIM is deliberately excluded: it is the Right-hand model and
// advises the Boss / analyses bureau work rather than conducting investigation.

// Make search-provider choice a real model action instead of documentation-only.
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

// Ensure the JSON schema advertises the search-provider selector.
if (!/provider:\s*\{ type: "string", enum: \["serper", "tavily", "exa"\] \}/.test(s)) {
  s = s.replace(
    'query: { type: "string" },\n    url: { type: "string" },',
    'query: { type: "string" },\n    provider: { type: "string", enum: ["serper", "tavily", "exa"] },\n    url: { type: "string" },',
  );
}

// Normalize the Investigator LLM pool. These are the investigators themselves.
// Tool vendors (Tavily/Exa/Serper, Scrapfly/ZenRows, registries, OSINT) remain
// non-LLM capabilities available to the Investigator. Boss/Right-hand may suggest
// capabilities, but the Investigator can independently choose any permitted one.
const start = s.indexOf("const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]>");
if (start < 0) throw new Error("investigator LLM pool: provider array not found");
const end = s.indexOf("    ];", start);
if (end < 0) throw new Error("investigator LLM pool: provider array terminator not found");

const replacement = `const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]> = [
      // These adapters are the Investigator LLMs themselves. Boss + Right-hand choose the assignment/model.
      ...(process.env.GROQ_API_KEY ? [["groq", callGroqJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
      ...(process.env.MISTRAL_API_KEY ? [["mistral", callMistralJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
    ];`;
s = s.slice(0, start) + replacement + s.slice(end + 6);

// Rewrite stale source prose from older hardeners even when the marker already exists.
s = s.replace(
  /\/\*\*\n \* This is the actual web-research LLM lane\.[\s\S]*?\*\/\n/, 
  "/**\n * INVESTIGATOR_LLM_POOL: the actual investigation actors. Boss + Right-hand select the investigator; the selected model may freely choose tools.\n * DeepSeek via NVIDIA NIM remains Right-hand only; Gemini remains Boss only.\n * Every investigation act is reported into the target/run research document for continuous oversight.\n */\n",
);

if (!s.includes(marker)) {
  s = s.replace(
    "/**\n * DIG_INVESTIGATOR_FAILOVER_CHAIN:",
    "/**\n * INVESTIGATOR_LLM_POOL: the actual investigation actors. Boss + Right-hand select the investigator; the selected model may freely choose tools.\n * DeepSeek via NVIDIA NIM remains Right-hand only; Gemini remains Boss only.\n * Every investigation act is reported into the target/run research document for continuous oversight.\n *\n * DIG_INVESTIGATOR_FAILOVER_CHAIN:"
  );
}

// The canonical investigator prompt must expose the complete research surface.
// This is a capability surface, not an instruction to use every tool.
if (!s.includes('provider=serper, tavily, or exa')) {
  s = s.replace(
    'Guidelines (not a script):\n- Search snippets are leads, not identity evidence.',
    'Guidelines (not a script):\n- You are the Investigator LLM for this assignment. You own the research trajectory and may choose any permitted capability based on information gain; Boss/Right-hand suggestions are guidance, not a tool order.\n- Search snippets are leads, not identity evidence.',
  );
}

fs.writeFileSync(file, s);
console.log("Investigator LLM two-layer architecture applied.");