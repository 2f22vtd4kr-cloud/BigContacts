import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const research = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"),
  "utf8",
);
const architecture = fs.readFileSync(
  path.join(root, "docs/BUREAU_REACT_ARCHITECTURE.md"),
  "utf8",
);
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

// The first ReAct turn must be genuinely open-ended. The harness may describe
// capabilities, but it must not seed a mandatory research action.
assert(
  !/Begin\. Choose an initial web_search query/i.test(research),
  "Investigator loop still seeds a forced initial web_search action.",
);
assert(
  !/initial (?:action|tool)\s*(?:must|should).*web_search/i.test(research),
  "Investigator runtime contains an explicit initial-web-search instruction.",
);

// Provider selection belongs to the model when the tool is provider-selectable.
// Transport retries inside an already-selected provider are allowed; a hidden
// cross-provider research ladder is not.
assert(
  !/Prefer\s+Serper.*Tavily.*Exa/i.test(research),
  "Investigator runtime contains a ranked Serper→Tavily→Exa provider strategy.",
);
assert(
  !/Serper\s*[→>-]+\s*Tavily\s*[→>-]+\s*Exa/i.test(research),
  "Investigator runtime contains a deterministic cross-provider sequence.",
);

assert(
  /no forced search order/i.test(architecture),
  "Architecture contract does not explicitly require no forced search order.",
);

if (failures.length) {
  console.error("FREE-REACT BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("FREE-REACT BOUNDARY: PASS");
console.log("- Initial Investigator action remains model-selected");
console.log("- No hidden cross-provider research ladder");
console.log("- Architecture contract requires no forced search order");
