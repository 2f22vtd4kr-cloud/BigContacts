#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const router = fs.readFileSync(path.join(root, "artifacts/apex-finder/src/router.tsx"), "utf8");
const boundary = fs.readFileSync(path.join(root, "artifacts/apex-finder/src/components/profile-error-boundary.tsx"), "utf8");
const profile = fs.readFileSync(path.join(root, "artifacts/apex-finder/src/pages/profile.tsx"), "utf8");

const checks = [
  ["profile route exists", router.includes('path="/profile/:id"')],
  ["profile route uses boundary", router.includes("<ProfileErrorBoundary")],
  ["boundary resets per entity", router.includes("key={id}")],
  ["boundary has visible test id", boundary.includes('data-testid="profile-render-failure"')],
  ["boundary is viewport anchored", boundary.includes("fixed inset-0")],
  ["profile has loading state", profile.includes('data-testid="profile-loading"')],
  ["profile has settled not-found state", profile.includes('data-testid="profile-not-found"')],
  ["profile route parses id defensively", profile.includes('parseInt(params.id ?? "0", 10)')],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) {
  console.error(`Profile route contract failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`Profile route contract: ${checks.length}/${checks.length} checks passed`);
