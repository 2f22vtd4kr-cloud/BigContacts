import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const research = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"), "utf8");
const context = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-execution-context.ts"), "utf8");
const core = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"), "utf8");
const browser = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/browser-fetch.ts"), "utf8");
const browserCore = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/browser-fetch-core.ts"), "utf8");
const provider = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/provider-gate.ts"), "utf8");

const checks = [
  ["canonical agentic module owns the guarded entrypoint", research.includes("safeOutboundFetch") && research.includes("getAgenticExecutionScope")],
  ["shared execution context is AsyncLocalStorage-backed", context.includes("AsyncLocalStorage") && context.includes("withAgenticExecutionScope")],
  ["canonical module does not statically import the core run function", !research.includes('import { runAgenticWebResearch } from "./agentic-web-research-core"')],
  ["core still contains the actual ReAct implementation", core.includes("function toolVisit") && core.includes("parseAction") && core.includes("runAgenticWebResearch")],
  ["browser escalation validates the model-selected destination", browser.includes("assertSafeOutboundUrl(url)")],
  ["canonical visit path imports the guarded browser wrapper", core.includes('import("./browser-fetch")')],
  ["ReAct browser escalation receives the run-scoped abort signal", core.includes("browserFetchHtml(action.url, { signal: runController.signal })")],
  ["browser provider responses are byte-capped", browserCore.includes("MAX_BROWSER_RESPONSE_BYTES") && browserCore.includes("readJsonCapped")],
  ["browser provider has no forced US locale", !browserCore.includes('u.searchParams.set("country", "us")')],
  ["agentic wrapper can detect the outer provider quota guard", research.includes("__apexQuotaGuard")],
  ["agentic wrapper avoids nested quota accounting when provider-gate is outer", research.includes("return safeOutboundFetch(input, init)")],
  ["agentic wrapper has a local provider-quota fallback when no global guard exists", research.includes("runProviderCall({ provider, account: \"agentic-fetch\" }")],
  ["provider gate exposes its process-level guard marker", provider.includes("__apexQuotaGuard")],
];

let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log("Agentic SSRF/provider/browser boundary: PASS");
