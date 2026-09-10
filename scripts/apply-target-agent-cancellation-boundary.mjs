import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts");
let source = fs.readFileSync(file, "utf8");

const signatureNeedle = 'contextDocument?: string }): Promise<TargetContactAgentResult>';
if (source.includes(signatureNeedle) && !source.includes('shouldCancel?: () => boolean | Promise<boolean>')) {
  source = source.replace(signatureNeedle, 'contextDocument?: string; shouldCancel?: () => boolean | Promise<boolean> }): Promise<TargetContactAgentResult>');
}
const callNeedle = 'jobId: input.jobId ?? null, onLiveStep:';
if (source.includes(callNeedle) && !source.includes('shouldCancel: input.shouldCancel')) {
  source = source.replace(callNeedle, 'jobId: input.jobId ?? null, shouldCancel: input.shouldCancel, onLiveStep:');
}
if (!source.includes('shouldCancel?: () => boolean | Promise<boolean>')) throw new Error('target-agent cancellation signature was not installed');
if (!source.includes('shouldCancel: input.shouldCancel')) throw new Error('target-agent cancellation was not propagated to canonical ReAct');
fs.writeFileSync(file, source);
console.log('Target Investigator cancellation boundary applied.');
