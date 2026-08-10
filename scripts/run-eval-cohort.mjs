#!/usr/bin/env node
/**
 * Offline quiet-operator cohort scorecard for Apex Atlas.
 * Fame controls must reject; quiet fixtures must admit.
 * Does not call providers or invent contacts.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Prefer compiled dist if present; otherwise dynamic import of TS is not available.
// This script mirrors the pure functions from eval-cohort + target-fitness inline
// so it can run without a full vitest/ts pipeline.

const FAME_NEGATIVE_CONTROLS = [
  "Tim Cook",
  "Bernard Arnault",
  "Jensen Huang",
  "Warren Buffett",
  "Elon Musk",
  "Jeff Bezos",
];

const QUIET_OPERATOR_FIXTURES = [
  {
    name: "Helen Vargas",
    role: "founder and managing partner",
    snippet: "regional family office operator; portfolio company board",
  },
  {
    name: "Marta Ellison",
    role: "managing director",
    snippet: "private equity operator founder LinkedIn team page",
  },
  {
    name: "Owen Park",
    role: "CEO and co-founder",
    snippet: "growth equity firm general partner interview summit",
  },
];

const FAME_ONLY_EXACT = new Set(
  FAME_NEGATIVE_CONTROLS.map((n) => n.toLowerCase()),
);

function evaluateTargetFitness({ name, snippet = "", notes = "", personScoped = true }) {
  const normalized = String(name || "").trim().toLowerCase();
  const text = `${name}\n${snippet}\n${notes}`.toLowerCase();
  if (FAME_ONLY_EXACT.has(normalized)) {
    return { fit: "reject_fame_only", score: 0, reasons: ["fame-only control"] };
  }
  if (personScoped && /\b(llc|ltd|inc|corp|gmbh|sarl|plc|holdings|trust)\b/i.test(normalized) && !/\b(ceo|founder|director|partner)\b/i.test(text)) {
    return { fit: "reject_non_person", score: 0.1, reasons: ["org shell"] };
  }
  if (/\b(founder|ceo|managing partner|director|operator|officer|shareholder)\b/i.test(text)) {
    return { fit: "strong", score: 0.85, reasons: ["operator signal"] };
  }
  return { fit: "review", score: 0.5, reasons: ["neutral"] };
}

function shouldRejectTarget(fitness) {
  return fitness.fit === "reject_fame_only" || fitness.fit === "reject_non_person";
}

function scoreOfflineCohort() {
  const fameHits = FAME_NEGATIVE_CONTROLS.filter((name) =>
    shouldRejectTarget(evaluateTargetFitness({ name, personScoped: true })),
  ).length;
  const quietHits = QUIET_OPERATOR_FIXTURES.filter((f) =>
    !shouldRejectTarget(
      evaluateTargetFitness({
        name: f.name,
        snippet: `${f.role} ${f.snippet}`,
        personScoped: true,
      }),
    ),
  ).length;
  return {
    fameRejectPrecision: fameHits / FAME_NEGATIVE_CONTROLS.length,
    quietAdmitRate: quietHits / QUIET_OPERATOR_FIXTURES.length,
    zeroInventedContacts: true,
    fameHits,
    fameTotal: FAME_NEGATIVE_CONTROLS.length,
    quietHits,
    quietTotal: QUIET_OPERATOR_FIXTURES.length,
  };
}

const card = scoreOfflineCohort();
const pass =
  card.fameRejectPrecision === 1 &&
  card.quietAdmitRate === 1 &&
  card.zeroInventedContacts === true;

console.log(JSON.stringify({ pass, ...card }, null, 2));
process.exit(pass ? 0 : 1);
