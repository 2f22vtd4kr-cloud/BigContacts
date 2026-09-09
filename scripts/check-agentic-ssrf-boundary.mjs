import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const research = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"), "utf8");
const core = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"), "utf8");
const browser = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/browser-fetch.ts"), "utf8");

const checks = [
  ["canonical agentic module owns the guarded entrypoint", research.includes("safeOutboundFetch") && research.includes("AsyncLocalStorage")],
  ["core implementation is not the canonical import target", !research.includes("from \"./agentic-web-research-core\";\n\nexport async function runAgenticWebResearch")],
  ["core still contains the actual ReAct implementation", core.includes("function toolVisit") && core.includes("parseAction") && core.includes("runAgenticWebResearch")],
  ["browser escalation validates the model-selected destination", browser.includes("assertSafeOutboundUrl(url)")],
  ["canonical visit path imports the guarded browser wrapper", core.includes('import("./browser-fetch")')],
  ["raw global fetch is not exposed by the canonical wrapper", research.includes("safeOutboundFetch(input, init, nativeFetch)")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
