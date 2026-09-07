import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const orientationFile = path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts");
const source = fs.readFileSync(file, "utf8");
const orientation = fs.readFileSync(orientationFile, "utf8");

// The canonical source is already installed by the preceding build transforms.
// This compatibility script is now an assertion/no-op: it must never reinstall
// an older provider router or rewrite a canonical source on every build.
const canonicalRouting =
  source.includes('provider: "serper" | "tavily" | "exa"') &&
  source.includes('async function toolWebSearch(query: string, requestedProvider: "serper" | "tavily" | "exa")') &&
  source.includes('if (!requestedProvider) throw new Error("web_search requires an explicit Investigator-selected provider")') &&
  orientation.includes("web_search — Investigator-selected Serper / Tavily / Exa") &&
  orientation.includes("there is no cross-provider research fallback");

if (!canonicalRouting) {
  throw new Error(
    "investigator provider routing: canonical explicit Investigator-selected provider contract is missing",
  );
}

if (/Serper\s*→\s*Tavily\s*→\s*Exa|Serper\s*->\s*Tavily\s*->\s*Exa/.test(orientation)) {
  throw new Error("investigator provider routing: obsolete ordered research route remains in orientation");
}

console.log("DONE apply-investigator-provider-routing: canonical explicit provider contract verified; no-op");
