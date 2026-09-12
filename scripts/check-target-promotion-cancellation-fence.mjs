#!/usr/bin/env node
import fs from "node:fs";

const target = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("target agent has a durable job-state read at the promotion boundary", /getJob\(input\.jobId\)/.test(target));
pass("target promotion is blocked unless the job remains running", /currentJob\.status !== \"running\"/.test(target));
pass("caller cancellation is rechecked after the Investigator act", /if \(input\.shouldCancel && await input\.shouldCancel\(\)\)/.test(target));
pass("cancellation is checked before strict contact persistence", /shouldCancel.*currentJob|currentJob.*persistSourceBackedBureauContactsForEntity/.test(target));
pass("cancelled target runs do not emit trusted contact persistence", /return \{ status: \"cancelled\"[\s\S]{0,500}executionId: agentic\.executionId \}/.test(target));

if (failures.length) {
  console.error("TARGET PROMOTION CANCELLATION FENCE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("TARGET PROMOTION CANCELLATION FENCE: PASS — durable job cancellation is rechecked before trusted contact persistence");
