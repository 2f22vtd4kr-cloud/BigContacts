import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validator = resolve(root, "scripts/validate-research-campaign.mjs");
const scorer = resolve(root, "scripts/score-research-campaign.mjs");
const taskEnvelope = { maxIterations: 64, maxObservations: 16000, maxTrajectoryRecords: 512 };
const observation = runId => [{ id: `${runId}-obs-1`, url: "https://example.test/source" }];
const trajectory = [{ turn: 1, action: "visit", status: "success" }];

function makeFixture({ caseCount = 1, systemFor = () => "apex-canonical", versionFor = () => "test-commit", outcomeFor = () => "verified", observationsFor = runId => observation(runId), trajectoryFor = () => trajectory } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "apex-research-campaign-"));
  const cases = Array.from({ length: caseCount }, (_, index) => ({ caseId: `RG-${String(index + 1).padStart(3, "0")}` }));
  const groundTruth = { schemaVersion: "research-gauntlet-v1", status: "grounded-reviewed", version: "1.1.1", cases };
  const runs = [];
  for (const [caseIndex, item] of cases.entries()) {
    for (let trial = 1; trial <= 3; trial++) {
      const runId = `${item.caseId}-trial-${trial}`;
      runs.push({
        schemaVersion: "research-run-v1",
        caseId: item.caseId,
        system: systemFor(caseIndex, trial),
        trialId: `trial-${trial}`,
        runId,
        registryVersion: groundTruth.version,
        systemVersion: versionFor(caseIndex, trial),
        taskEnvelope,
        configuration: { investigatorPool: ["groq-investigator-1"] },
        identities: [], claims: [], contacts: [], contradictions: [],
        observations: observationsFor(runId),
        trajectory: trajectoryFor(runId),
        outcome: outcomeFor(caseIndex, trial),
        failureRecords: [],
      });
    }
  }
  const groundTruthFile = join(directory, "ground-truth.json");
  const runsFile = join(directory, "runs.json");
  const outputFile = join(directory, "score.json");
  writeFileSync(groundTruthFile, JSON.stringify(groundTruth));
  writeFileSync(runsFile, JSON.stringify({ schemaVersion: "research-runs-v1", runs }));
  return { directory, groundTruthFile, runsFile, outputFile, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

function invoke(script, fixture, extraArgs = []) {
  return spawnSync(process.execPath, [script, fixture.groundTruthFile, fixture.runsFile, ...extraArgs], { cwd: root, encoding: "utf8" });
}

test("rejects a campaign that mixes systems instead of pooling their trials", t => {
  const fixture = makeFixture({ caseCount: 50, systemFor: (_caseIndex, trial) => trial === 1 ? "apex-canonical" : "other-system" });
  t.after(fixture.cleanup);
  const result = invoke(scorer, fixture, [fixture.outputFile]);
  assert.notEqual(result.status, 0, "mixed-system campaign must not pass the scorer");
  assert.match(result.stderr, /Matched campaign requires one shared system/);
});

test("rejects system-version mixtures in matched trials", t => {
  const fixture = makeFixture({ versionFor: (_caseIndex, trial) => trial === 1 ? "commit-a" : "commit-b" });
  t.after(fixture.cleanup);
  const result = invoke(validator, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Matched campaign requires one shared system version/);
});

test("rejects verified outcomes without observations and trajectory", t => {
  const fixture = makeFixture({ observationsFor: () => [], trajectoryFor: () => [] });
  t.after(fixture.cleanup);
  const result = invoke(validator, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot be verified without observations and trajectory/);
});

test("rejects unknown outcome values", t => {
  const fixture = makeFixture({ outcomeFor: () => "made_up_success" });
  t.after(fixture.cleanup);
  const result = invoke(validator, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /has invalid outcome/);
});

test("rejects runs produced against a different registry version", t => {
  const fixture = makeFixture();
  t.after(fixture.cleanup);
  const records = JSON.parse(readFileSync(fixture.runsFile, "utf8"));
  records.runs[0].registryVersion = "1.1.0";
  writeFileSync(fixture.runsFile, JSON.stringify(records));
  const result = invoke(validator, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /registryVersion does not match ground truth/);
});

test("accepts truthful system-failure runs with empty observations and trajectory", t => {
  const fixture = makeFixture({ observationsFor: () => [], trajectoryFor: () => [], outcomeFor: () => "system_failure" });
  t.after(fixture.cleanup);
  const result = invoke(validator, fixture);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"runCount": 3/);
});
