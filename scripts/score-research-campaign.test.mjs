import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCORER = join(ROOT, "scripts/score-research-campaign.mjs");
const CASE_COUNT = 50;
const TRIALS_PER_CASE = 3;
const taskEnvelope = {
  maxIterations: 64,
  maxObservations: 16000,
  maxTrajectoryRecords: 512,
};

function createCampaignFiles({ outcomeForRun = () => "insufficient_evidence", omitOutcomeForRun = () => false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "apex-campaign-score-"));
  const groundTruthFile = join(directory, "ground-truth.json");
  const runsFile = join(directory, "runs.json");
  const reportFile = join(directory, "report.json");
  const cases = Array.from({ length: CASE_COUNT }, (_, index) => ({
    caseId: `RG-${String(index + 1).padStart(3, "0")}`,
  }));
  const runs = cases.flatMap((item) =>
    Array.from({ length: TRIALS_PER_CASE }, (_, index) => {
      const run = {
        runId: `${item.caseId}-run-${index + 1}`,
        caseId: item.caseId,
        trialId: `trial-${String(index + 1).padStart(3, "0")}`,
        taskEnvelope,
        observations: [],
        trajectory: [],
      };
      if (!omitOutcomeForRun(run)) run.outcome = outcomeForRun(run);
      return run;
    }),
  );
  writeFileSync(groundTruthFile, JSON.stringify({
    schemaVersion: "research-gauntlet-v1",
    version: "1.1.1",
    status: "grounded-reviewed",
    cases,
  }, null, 2));
  writeFileSync(runsFile, JSON.stringify({
    schemaVersion: "research-runs-v1",
    runs,
  }, null, 2));
  const execution = spawnSync(process.execPath, [SCORER, groundTruthFile, runsFile, reportFile], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ...execution,
    reportFile,
    cleanup() { rmSync(directory, { recursive: true, force: true }); },
  };
}

function parseCampaignReport(stdout) {
  const marker = '{\n  "schemaVersion": "research-campaign-results-v1"';
  const start = stdout.lastIndexOf(marker);
  assert.notEqual(start, -1, "scorer did not print a campaign results report");
  return JSON.parse(stdout.slice(start));
}

test("writes parseable JSON and accepts completed insufficient-evidence trials", () => {
  const run = createCampaignFiles();
  try {
    assert.equal(run.status, 0, run.stderr);
    const printed = parseCampaignReport(run.stdout);
    const savedText = readFileSync(run.reportFile, "utf8");
    const saved = JSON.parse(savedText);
    assert.deepEqual(saved, printed);
    assert.ok(savedText.endsWith("\n"), "JSON report should end with a real newline");
    assert.equal(printed.runCount, CASE_COUNT * TRIALS_PER_CASE);
    assert.equal(printed.releaseGateEligible, true);
    assert.equal(printed.systemFailures, 0);
    assert.equal(printed.cancelledRuns, 0);
    assert.equal(printed.outcomes.insufficient_evidence, CASE_COUNT * TRIALS_PER_CASE);
  } finally {
    run.cleanup();
  }
});

test("cancellation is reported separately and blocks campaign eligibility", () => {
  let first = true;
  const run = createCampaignFiles({
    outcomeForRun() {
      if (first) {
        first = false;
        return "cancelled";
      }
      return "insufficient_evidence";
    },
  });
  try {
    assert.equal(run.status, 1, "cancelled trials must make the scorer exit non-zero");
    const report = JSON.parse(readFileSync(run.reportFile, "utf8"));
    assert.equal(report.cancelledRuns, 1);
    assert.equal(report.systemFailures, 0, "cancellation must not be relabelled as a system failure");
    assert.equal(report.releaseGateEligible, false);
  } finally {
    run.cleanup();
  }
});

for (const invalid of [
  { name: "a missing outcome", outcome: undefined },
  { name: "an unrecognized outcome", outcome: "mystery_state" },
]) {
  test(`rejects ${invalid.name} instead of treating it as a valid sample`, () => {
    let first = true;
    const run = createCampaignFiles({
      outcomeForRun() { return invalid.outcome ?? "insufficient_evidence"; },
      omitOutcomeForRun() {
        if (first) {
          first = false;
          return invalid.outcome === undefined;
        }
        return false;
      },
    });
    try {
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /unsupported outcome/i);
      assert.match(run.stderr, /research-campaign-results-v1|scripts\/score-research-campaign\.mjs|Error:/);
    } finally {
      run.cleanup();
    }
  });
}
