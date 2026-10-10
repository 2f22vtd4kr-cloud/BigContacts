import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const guard = fs.readFileSync(path.join(root, "scripts/check-agentic-timeout.mjs"), "utf8");
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"), "utf8");
const apiPackage = fs.readFileSync(path.join(root, "artifacts/api-server/package.json"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/apex-live-audit-resilient.yml"), "utf8");

function executeGuard({ sourceText = source, workflowText = workflow } = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apex-timeout-guard-"));
  const write = (relativePath, content) => {
    const fullPath = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  };
  try {
    write("scripts/check-agentic-timeout.mjs", guard);
    write("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", sourceText);
    write("artifacts/api-server/package.json", apiPackage);
    write(".github/workflows/apex-live-audit-resilient.yml", workflowText);
    return spawnSync(process.execPath, ["scripts/check-agentic-timeout.mjs"], {
      cwd: fixtureRoot,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test("accepts the current bounded provider-timeout configuration", () => {
  const result = executeGuard();
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("rejects a too-short active fallback when the workflow has no override", () => {
  const currentSetting = "AGENTIC_PROVIDER_DECISION_TIMEOUT_MS, 125_000, 55_000, 10 * 60_000";
  const unsafeSetting = "AGENTIC_PROVIDER_DECISION_TIMEOUT_MS, 18_000, 55_000, 10 * 60_000";
  assert.ok(source.includes(currentSetting), "fixture must contain the active fallback declaration");
  const sourceText = source.replace(currentSetting, unsafeSetting);
  const workflowText = workflow.replace(
    /^\s*AGENTIC_PROVIDER_DECISION_TIMEOUT_MS:\s*.*\r?\n/m,
    "",
  );
  assert.ok(!/^\s*AGENTIC_PROVIDER_DECISION_TIMEOUT_MS\s*:/m.test(workflowText));
  const result = executeGuard({ sourceText, workflowText });
  assert.notEqual(result.status, 0, "the guard must reject an 18-second fallback without a workflow override");
  assert.match(result.stderr, /agentic provider\/run timeout hardening is missing/i);
});
