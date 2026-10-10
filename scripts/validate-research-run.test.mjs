import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const validator = fileURLToPath(
  new URL("./validate-research-run.mjs", import.meta.url),
);

function sampleRun() {
  return {
    schemaVersion: "research-run-v1",
    caseId: "RG-X",
    system: "apex-canonical",
    trialId: "trial-1",
    identities: [],
    claims: [],
    contacts: [],
    contradictions: [],
    observations: [{ id: "o1" }],
    trajectory: [{ turn: 1, action: "visit", status: "success" }],
    outcome: "insufficient_evidence",
    failureRecords: [],
  };
}

function runValidator(doc) {
  const directory = mkdtempSync(join(tmpdir(), "apex-run-validator-test-"));
  try {
    const input = join(directory, "run.json");
    writeFileSync(input, JSON.stringify(doc));
    return spawnSync(process.execPath, [validator, input], {
      encoding: "utf8",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("accepts a well-shaped research run", () => {
  const result = runValidator(sampleRun());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"valid": true/);
});

test("rejects any missing documented collection array", () => {
  for (const field of [
    "identities",
    "claims",
    "contacts",
    "contradictions",
    "observations",
    "trajectory",
  ]) {
    const run = sampleRun();
    delete run[field];
    const result = runValidator(run);
    assert.equal(result.status, 1, `${field} unexpectedly passed: ${result.stdout}`);
    assert.match(result.stderr, new RegExp(`${field} must be an array`));
  }
});

test("accepts a system-failure run with no observations or trajectory", () => {
  const run = sampleRun();
  run.observations = [];
  run.trajectory = [];
  run.outcome = "system_failure";

  const result = runValidator(run);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"observations": 0/);
  assert.match(result.stdout, /"trajectory": 0/);
});

test("rejects verified outcomes without observations and trajectory", () => {
  const run = sampleRun();
  run.observations = [];
  run.trajectory = [];
  run.outcome = "verified";
  const result = runValidator(run);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Verified runs require non-empty observations and trajectory/);
});

test("still rejects blank and duplicate observation IDs", () => {
  const blank = sampleRun();
  blank.observations = [{ id: " " }];
  const blankResult = runValidator(blank);
  assert.equal(blankResult.status, 1);
  assert.match(blankResult.stderr, /Observation IDs must be unique and non-empty/);

  const duplicate = sampleRun();
  duplicate.observations = [{ id: "o1" }, { id: "o1" }];
  const duplicateResult = runValidator(duplicate);
  assert.equal(duplicateResult.status, 1);
  assert.match(duplicateResult.stderr, /Observation IDs must be unique and non-empty/);
});

test("still rejects evidence references to unknown observations", () => {
  const run = sampleRun();
  run.claims = [{ supportingObservationIds: ["missing"] }];
  const result = runValidator(run);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /claims references unknown observation missing/);
});
