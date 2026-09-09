import fs from "node:fs";

const core = fs.readFileSync(
  new URL("../artifacts/api-server/src/src/lib/agentic-web-research-core.ts", import.meta.url),
  "utf8",
);

const forcedInitialAction = /let\s+lastObservation\s*=\s*["']Begin\.\s*Choose an initial web_search query/i;
if (forcedInitialAction.test(core)) {
  throw new Error("Investigator ReAct loop must not force web_search as its initial action");
}

const webSearch = core.match(/async function toolWebSearch\([\s\S]*?\n}\n/);
if (!webSearch) {
  throw new Error("Investigator web_search implementation not found");
}
if (!/No search provider was selected by the Investigator\. web_search requires an explicit provider selection\./.test(webSearch[0])) {
  throw new Error("Investigator web_search must fail visibly when no provider is selected");
}
if (!/requestedProvider === "serper"/.test(webSearch[0]) || !/requestedProvider === "tavily"/.test(webSearch[0]) || !/requestedProvider === "exa"/.test(webSearch[0])) {
  throw new Error("Investigator web_search must expose explicit provider branches rather than a hidden provider sequence");
}

console.log("Investigator free-ReAct static boundary: OK");
