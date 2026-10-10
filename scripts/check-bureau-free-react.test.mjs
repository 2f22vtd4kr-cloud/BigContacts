import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const guardPath = fileURLToPath(new URL("./check-bureau-free-react.mjs", import.meta.url));
const completeActionUnion = `type AgentAction = { action: "web_search"; } | { action: "visit"; } | { action: "footprint_email"; } | { action: "footprint_username_maigret"; } | { action: "footprint_username_sherlock"; } | { action: "domain_lookup"; } | { action: "registry_search"; } | { action: "harvest_domain"; } | { action: "browser_fetch"; } | { action: "done"; };
function boundedPositiveNumber() {}`;
const requiredMarkers = [
  'action: "web_search"', 'action: "visit"', 'action: "footprint_email"',
  'action: "footprint_username_maigret"', 'action: "footprint_username_sherlock"',
  'action: "domain_lookup"', 'action: "registry_search"', 'action: "harvest_domain"',
  'action: "browser_fetch"', 'action: "done"',
];

function runGuard(coreSource) {
  const root = mkdtempSync(path.join(os.tmpdir(), "apex-free-react-"));
  try {
    const scriptsDir = path.join(root, "scripts");
    const coreDir = path.join(root, "artifacts/api-server/src/src/lib");
    mkdirSync(scriptsDir, { recursive: true });
    mkdirSync(coreDir, { recursive: true });
    const copiedGuard = path.join(scriptsDir, "check-bureau-free-react.mjs");
    copyFileSync(guardPath, copiedGuard);
    writeFileSync(path.join(coreDir, "agentic-web-research-core.ts"), coreSource);
    return spawnSync(process.execPath, [copiedGuard], { encoding: "utf8" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts the active AgentAction union with required capabilities", () => {
  const result = runGuard(completeActionUnion);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("rejects action markers left only in comments after capabilities disappear", () => {
  const commentOnlyMarkers = requiredMarkers.map((marker) => `// ${marker}`).join("\n");
  const brokenCore = `${commentOnlyMarkers}\ntype AgentAction = { action: "visit"; };\nfunction boundedPositiveNumber() {}`;
  const result = runGuard(brokenCore);
  assert.notEqual(result.status, 0, `guard incorrectly passed a comment-only action surface: ${result.stdout}`);
  assert.match(result.stderr, /missing action surface/);
});
