import fs from "node:fs";

const core = fs.readFileSync(
  new URL("../artifacts/api-server/src/src/lib/agentic-web-research-core.ts", import.meta.url),
  "utf8",
);

const forbiddenInitialSearch = /Begin\.\s*Choose an initial web_search query/i;
if (forbiddenInitialSearch.test(core)) {
  throw new Error("Investigator ReAct loop must not force web_search as its initial action");
}

const forcedProviderSequence = /Serper[\s\S]{0,500}Tavily[\s\S]{0,500}Exa/i;
if (forcedProviderSequence.test(core)) {
  throw new Error("Investigator ReAct loop must not encode a deterministic Serper -> Tavily -> Exa provider sequence");
}

console.log("Investigator free-ReAct static boundary: OK");
