import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(file, "utf8");

const marker = "INVESTIGATOR_LLM_CAPABILITY_POOL";

// The investigator boundary is a model-decision boundary, not a vendor/tool pool.
// DeepSeek is deliberately excluded: it is the NVIDIA NIM right-hand model and
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

// Normalize the investigator LLM adapter list. This is the only LLM decision pool
// in Dig. Tool vendors (Tavily/Exa/Serper, Scrapfly/ZenRows, registries, OSINT)
// remain capabilities selected by the investigator model; they are not LLMs.
const start = s.indexOf("const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]>");
if (start < 0) throw new Error("investigator capability pool: provider array not found");
const end = s.indexOf("    ];", start);
if (end < 0) throw new Error("investigator capability pool: provider array terminator not found");

const replacement = `const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]> = [
      // Investigator LLM adapters only. Order is availability/fallback, not role hierarchy.
      ...(process.env.GROQ_API_KEY ? [["groq", callGroqJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
      ...(process.env.MISTRAL_API_KEY ? [["mistral", callMistralJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),
    ];`;
s = s.slice(0, start) + replacement + s.slice(end + 6);

if (!s.includes(marker)) {
  s = s.replace(
    "/**\n * DIG_INVESTIGATOR_FAILOVER_CHAIN:",
    "/**\n * INVESTIGATOR_LLM_CAPABILITY_POOL: the model-decision boundary for free ReAct.\n * Investigator adapters are separate from Boss/right-hand models and from research tools.\n * DeepSeek via NVIDIA NIM remains right-hand only; Gemini remains Boss only.\n *\n * DIG_INVESTIGATOR_FAILOVER_CHAIN:"
  );
}

// The canonical prompt must expose the complete research surface to the investigator.
// This is a capability surface, not an instruction to use every tool.
if (!s.includes('provider=serper, tavily, or exa')) {
  s = s.replace(
    'Guidelines (not a script):\n- Search snippets are leads, not identity evidence.',
    'Guidelines (not a script):\n- You are the investigator decision-maker for this turn. You may choose any available research capability based on information gain; no tool order is prescribed.\n- Search snippets are leads, not identity evidence.',
  );
}

fs.writeFileSync(file, s);
console.log("Investigator LLM capability pool applied.");
