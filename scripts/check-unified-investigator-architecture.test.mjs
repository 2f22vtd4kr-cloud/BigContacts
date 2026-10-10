import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guardPath = path.join(repoRoot, "scripts/check-unified-investigator-architecture.mjs");
const guardText = readFileSync(guardPath, "utf8");
const guardedPaths = [...new Set([...guardText.matchAll(/path\.join\(root,\s*"([^"]+)"\)/g)].map((match) => match[1]))];
assert.ok(guardedPaths.length >= 15, "expected to discover the guard's repository fixture inputs");

function findControlCall(sourceText) {
  const parsed = ts.createSourceFile("canonical-atlas-discovery.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let owner = null;
  const findOwner = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "runCanonicalAtlasPipeline") { owner = node; return; }
    if (!owner) ts.forEachChild(node, findOwner);
  };
  findOwner(parsed);
  assert.ok(owner?.body, "canonical Atlas pipeline function must exist in fixture");
  let call = null;
  const visit = (node) => {
    if (call) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "decideAtlasNextAction") {
      call = node;
      return;
    }
    ts.forEachChild(node, (child) => {
      if (ts.isFunctionLike(child) || ts.isClassLike(child)) return;
      visit(child);
    });
  };
  visit(owner.body);
  assert.ok(call, "canonical Atlas pipeline must contain an executable Boss-directed control call");
  return { parsed, call };
}

function runGuard(cwd) {
  return spawnSync(process.execPath, [guardPath], { cwd, encoding: "utf8" });
}

const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "apex-unified-investigator-guard-"));
try {
  for (const relative of guardedPaths) {
    const originalPath = path.join(repoRoot, relative);
    if (!existsSync(originalPath)) continue; // The guard has two explicitly optional retired review paths.
    const fixturePath = path.join(fixtureRoot, relative);
    mkdirSync(path.dirname(fixturePath), { recursive: true });
    copyFileSync(originalPath, fixturePath);
  }

  const baseline = runGuard(fixtureRoot);
  assert.equal(baseline.status, 0, `guard must pass on the unmodified main-source fixture:\\n${baseline.stdout}\\n${baseline.stderr}`);

  const canonicalPath = path.join(fixtureRoot, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
  const canonicalSource = readFileSync(canonicalPath, "utf8");
  const { call } = findControlCall(canonicalSource);
  const replacement = "/* stale marker only: decideAtlasNextAction( is no longer executed */ Promise.resolve(null as unknown as Awaited<ReturnType<typeof decideAtlasNextAction>>)";
  const mutated = canonicalSource.slice(0, call.getStart()) + replacement + canonicalSource.slice(call.end);
  // Prove the pre-fix whole-file text predicate would have accepted this exact mutation.
  assert.equal(/decideAtlasNextAction\\s*\\(/.test(mutated), true, "legacy text-only marker should still match even after the executable call is removed");
  writeFileSync(canonicalPath, mutated, "utf8");

  const mutatedResult = runGuard(fixtureRoot);
  assert.notEqual(mutatedResult.status, 0, `guard must reject losing the executable Boss-directed control call even when its old text survives in a comment:\\n${mutatedResult.stdout}\\n${mutatedResult.stderr}`);
  assert.match(mutatedResult.stderr + mutatedResult.stdout, /model-owned next-action decision in its control loop/i);

  console.log("PASS: unified Investigator guard rejects a comment-only Boss control marker after the executable transition call is removed.");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
