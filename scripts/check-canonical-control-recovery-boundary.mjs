#!/usr/bin/env node
import fs from "node:fs";

const continuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts", "utf8");
const client = fs.readFileSync("artifacts/apex-finder/src/lib/launch-atlas.ts", "utf8");

const checks = [
  ["recovery route is mounted on the canonical continuation handler", continuation.includes('"/research/bureau/cases/:caseId/recover-control"')],
  ["recovery is restricted to durable canonical control failure states", continuation.includes('new Set(["groq-right-hand-unavailable","canonical-control-unavailable","canonical-investigator-provider-unavailable"])')],
  ["ordinary continuation remains available", continuation.includes('"/research/bureau/cases/:caseId/run-next-pass"')],
  ["recovery uses the existing canonical lock path", continuation.includes('claimCanonicalJob("atlas-run",jobId)')],
  ["recovery uses the durable cancellation fence", continuation.includes("cancellationFenceSql(caseId)")],
  ["recovery starts from durable shared context", continuation.includes("contextOf(file)")],
  ["recovery validates Right-hand output before Boss", continuation.includes("validateContinuationRightHand(parsed)")],
  ["recovery fails closed before Boss when Right-hand is unavailable or invalid", continuation.includes('if(rightHand.status!=="completed"||rightHand.error)') && continuation.indexOf('if(rightHand.status!=="completed"||rightHand.error)') < continuation.indexOf("const boss=await runGroqBossDiscovery")],
  ["control-unavailable recovery is parked at a recoverable canonical action", continuation.includes('code:"ATLAS_CONTROL_UNAVAILABLE"') && continuation.includes('controlUnavailable?"canonical-control-unavailable"')],

  ["recovery never substitutes an oversight provider for the model-owned Investigator", !continuation.includes('investigatorLlm: "groq"') && !continuation.includes('investigatorLlm: "mistral"')],
  ["desk exposes the recovery helper", client.includes("export async function recoverAtlasControl(caseId: number)")],
  ["desk recovery targets only the canonical recovery endpoint", client.includes("/recover-control")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
