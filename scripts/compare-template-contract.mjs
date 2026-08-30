#!/usr/bin/env node
/**
 * Static contract test for the Apex-vs-baseline research report.
 * This does not score Apex and deliberately cannot manufacture a win.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const template = readFileSync(resolve(root, "scripts/compare-template.mjs"), "utf8");

const required = [
  "baseline primary",
  "Apex outcome",
  "score",
  "Free dig spans (search/visit) present for every trial?",
  "discoveryFirst used?",
  "any -1 (wrong person): yes/no",
  "verdict: Apex wins / tie / Apex loses",
];

for (const marker of required) {
  if (!template.includes(marker)) {
    throw new Error(`comparison contract missing: ${marker}`);
  }
}

if (!template.includes("evidence URLs")) {
  throw new Error("comparison contract must capture evidence URLs");
}

if (!template.includes("tool calls")) {
  throw new Error("comparison contract must capture tool-call trajectory data");
}

console.log("comparison-template-contract: PASS");
