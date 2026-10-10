import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");

const required = [
  '"footprint_username_maigret"',
  '"footprint_username_sherlock"',
  '"footprint_email"',
  '"harvest_domain"',
  'action: "footprint_username_maigret"',
  'action: "footprint_username_sherlock"',
  'action: "footprint_email"',
  'action: "harvest_domain"',
];
for (const marker of required) if (!source.includes(marker)) throw new Error(`OSINT capability boundary invariant failed: missing ${marker}`);

if (/action === "footprint_username"/.test(source)) throw new Error("OSINT capability boundary invariant failed: compound footprint_username remains model-selectable");
if (/\["footprint_email", "footprint_username",/.test(source)) throw new Error("OSINT capability boundary invariant failed: legacy username action remains in schema");
if (!/runController\.signal/.test(source)) throw new Error("OSINT capability boundary invariant failed: canonical actions lack run-scoped cancellation");
if (!source.includes("if (!isModelSelectableAgentAction(action)) return null;")) throw new Error("OSINT capability boundary invariant failed: JSON-object fallback can invoke a hidden action");
if (!source.includes("enum: [...MODEL_SELECTABLE_AGENT_ACTIONS]")) throw new Error("OSINT capability boundary invariant failed: structured schema is not tied to the executable action set");
if (!(source.includes('"AVAILABLE ACTIONS: " + availableActions.join(" | ")') || source.includes('MODEL_SELECTABLE_AGENT_ACTIONS.join(" | ")'))) throw new Error("OSINT capability boundary invariant failed: prompt action list is not tied to the executable action set");
if (!source.includes("getAvailableBrowserFetchProviders()") || !source.includes('MODEL_SELECTABLE_AGENT_ACTIONS.filter((action) => action !== "browser_fetch")')) throw new Error("OSINT capability boundary invariant failed: runtime provider filtering is not tied to configured browser capabilities");
if (!source.includes("getAvailableBrowserFetchProviders()") || !source.includes('MODEL_SELECTABLE_AGENT_ACTIONS.filter((action) => action !== "browser_fetch")')) throw new Error("OSINT capability boundary invariant failed: runtime provider filtering is not tied to configured browser capabilities");
if (!source.includes('if (!isModelSelectableAgentAction(action)) return `unsupported_action action=${action}`;')) throw new Error("OSINT capability boundary invariant failed: diagnostics do not reject hidden actions");

console.log("agentic OSINT capability boundary: PASS — atomic model actions, run-scoped cancellation, and no compound username capability");
