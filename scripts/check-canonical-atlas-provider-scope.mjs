import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

const providerGate = read("./artifacts/api-server/src/src/lib/provider-gate.ts");
const caseBureau = read("./artifacts/api-server/src/src/lib/case-bureau.ts");
const launch = read("./artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts");
const continuation = read("./artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");
const targetContinuation = read("./artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts");
const targetControl = read("./artifacts/api-server/src/src/lib/target-control-decision.ts");
const investigator = read("./artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const boss = read("./artifacts/api-server/src/src/lib/groq-boss.ts");
const rightHand = read("./artifacts/api-server/src/src/lib/groq-right-hand-reasoning.ts");
const activeControlFiles = [boss, rightHand, investigator, caseBureau, targetControl, targetContinuation].join("\n");

const checks = [
  [providerGate.includes('scope.startsWith("atlas-run:")'), "Atlas jobs must receive a distinct provider-gate scope."],
  [providerGate.includes('APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE",80,1,80'), "Atlas scope budget must remain bounded at 80 by default/max."],
  [launch.includes("withProviderScope(`atlas-run:${atlasJobId}`"), "Canonical launch must bind all provider calls to the unique Atlas job scope."],
  [continuation.includes("withProviderScope(`atlas-run:${jobId}`"), "Canonical continuation/recovery must bind provider calls to the unique Atlas job scope."],
  [targetContinuation.includes("withProviderScope(`atlas-run:${jobId}`"), "Canonical target continuation must bind both control and resumed Investigator calls to the unique Atlas job scope."],
  [targetContinuation.includes("latestControlTurn"), "Canonical target continuation must derive control turns from durable target-control history so continuation runs remain monotonic."],
  [!/gemini/i.test(targetContinuation), "Canonical target continuation must not retain retired Gemini control labels or state transitions."],
  [!/gemini/i.test(targetControl), "Canonical target control must not retain retired Gemini control labels or state transitions."],
  [targetControl.includes("compactControlContext(input.contextDocument)"), "Canonical target control must bound durable context before both control-plane model calls."],
  [targetControl.includes("compactTrajectory(input.trajectoryRecords ?? [])"), "Canonical target control must use a bounded trajectory projection rather than serializing durable trajectory wholesale."],
  [targetControl.includes("compactRightHandAdvice(rightHand)"), "Canonical target control must bound model-generated Right-hand advice before embedding it in the Boss prompt."],
  [targetControl.includes("history.splice(0, Math.max(0, history.length - 32))"), "Target control case-file projection must remain bounded."],
  [targetControl.includes('if (rightHand.status !== "completed")'), "Canonical target control must fail closed before invoking Groq Boss when Right-hand review is unavailable."],
  [investigator.includes("isLocalProviderQuotaError(error)"), "Investigator must recognize local provider-gate quota failures."],
  [investigator.includes("if (isLocalProviderQuotaError(error)) return null;"), "Investigator must stop futile same-provider fallback after a local gate block."],
  [boss.includes("isLocalProviderQuotaError(error)"), "Boss must recognize local provider-gate quota failures."],
  [boss.includes("Groq Boss local provider gate blocked further attempts"), "Boss must fail fast and emit a privacy-safe local-gate diagnostic."],
  [boss.includes('provider: "groq"'), "Canonical Boss provider must be Groq."],
  [rightHand.includes('provider: "groq"'), "Canonical Right-hand provider must be Groq."],
  [!/return \{ model, raw: null, error: lastError, attempts \};/.test(boss.match(/if \(response\.status === 429\)[\\s\\S]*?\\n\\s*\\}/)?.[0] ?? ""), "Groq Boss HTTP 429 handling must fall through to the bounded model/key fallback chain rather than terminate the whole control call."],
  [!/return \{raw:"",error:.*rate_limited HTTP 429/.test(rightHand.match(/if\(response\.status===429&&hardRateLimit[\s\S]*?\n/ )?.[0] ?? ""), "Groq Right-hand hard HTTP 429 handling must fall through to the bounded model/key fallback chain rather than terminate the whole control call."],
  [rightHand.includes('if(response.status===429)break;'), "Groq Right-hand generic HTTP 429 handling must advance to the next bounded candidate after its retry budget is exhausted."],
  [!rightHand.includes('withProviderScope("atlas-right-hand"'), "Right-hand transport must preserve the caller's canonical Atlas provider scope rather than replacing it with a shared scope."],
  [investigator.includes("getAvailableInvestigatorCapabilities") && investigator.includes("investigatorCapabilityKeyName"), "Canonical Investigator selection must use the runtime capability registry."],
  [investigator.includes("classifyExternalProvider") && investigator.includes("gatedSafeOutboundFetch") && investigator.includes("runProviderCall({ provider, account, signal: init.signal"), "Canonical Investigator web/search egress must pass through the provider gate."],
  [investigator.includes("gatedSafeOutboundFetch(url") && !investigator.includes("safeOutboundFetch(url, { signal"), "Canonical page visits must not bypass the provider gate."],
  [caseBureau.includes("generateGroqBossText(selection, prompt, options)"), "Legacy Gemini Boss compatibility wrapper must delegate to Groq."],
  [caseBureau.includes("export const runGeminiBossDiscovery = runGroqBossDiscovery"), "Legacy Gemini discovery name must alias the canonical Groq implementation."],
  [caseBureau.includes("investigatorLlm: InvestigatorCapability | null"), "Compatibility control contracts must expose the runtime Investigator capability type."],
  [!/generativelanguage\\.googleapis\\.com|GEMINI_API_KEY|GOOGLE_API_KEY/i.test(activeControlFiles), "Canonical Atlas control files must not contain an active Gemini endpoint or credential."],
  [!/mistral\\.ai|MISTRAL_API_KEY/i.test(activeControlFiles), "Canonical Atlas control files must not contain an active Mistral endpoint or credential."],
  [providerGate.includes('"mistral"') && providerGate.includes('"gemini"'), "Dormant provider-gate classifications for Gemini/Mistral must remain preserved."],
  [read("./artifacts/api-server/src/src/lib/groq-right-hand-reasoning.ts").includes('return kind === "requests" || kind === "tokens";'), "Unknown Right-hand 429s must remain eligible for bounded transient retry."],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(message);
  process.exit(1);
}
console.log("canonical Atlas provider scope checks passed");
