import fs from "node:fs";

const core = fs.readFileSync(
  new URL("../artifacts/api-server/src/src/lib/agentic-web-research-core.ts", import.meta.url),
  "utf8",
);

const forbiddenInitialSearch = /Begin\.\s*Choose an initial web_search query/i;
if (forbiddenInitialSearch.test(core)) {
  throw new Error("Investigator ReAct loop must not force web_search as its initial action");
}

// Provider adapters may coexist in the core; the contract is that the ReAct loop
// delegates provider choice to the model and does not invoke them as a fixed sequence.
const loopStart = core.indexOf("for (let i = 0; i < maxIter; i++)");
const loopEnd = core.indexOf("return resultBase", loopStart);
const loop = loopStart >= 0 && loopEnd > loopStart ? core.slice(loopStart, loopEnd) : "";
if (!loop) {
  throw new Error("Could not locate Investigator ReAct loop for provider-sequencing check");
}
if (/webSearchSerper\([^)]*\)[\s\S]{0,1200}webSearchTavily\([^)]*\)[\s\S]{0,1200}webSearchExa\([^)]*\)/i.test(loop)) {
  throw new Error("Investigator ReAct loop must not encode a deterministic Serper -> Tavily -> Exa provider sequence");
}

console.log("Investigator free-ReAct static boundary: OK");
