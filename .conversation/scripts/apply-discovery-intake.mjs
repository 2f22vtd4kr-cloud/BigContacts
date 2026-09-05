#!/usr/bin/env node
/**
 * Idempotent wiring for Apex Atlas discovery intake + approachable ranking.
 * Safe to re-run on Replit after pull.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const atlas = path.join(root, "artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
const caseBureau = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const broad = path.join(root, "artifacts/api-server/src/src/lib/enrichment/broad-discovery.ts");

function patchAtlas() {
  if (!fs.existsSync(atlas)) {
    console.warn("skip atlas-orchestrator — missing");
    return;
  }
  let src = fs.readFileSync(atlas, "utf8");
  let changed = false;

  if (!src.includes('from "./discovery-intake"') && !src.includes("buildSourcesToRun")) {
    const anchors = ['from "./logger";', 'from "./job-queue";'];
    for (const a of anchors) {
      if (src.includes(a)) {
        src = src.replace(a, a + '\nimport { buildSourcesToRun } from "./discovery-intake";');
        changed = true;
        console.log("atlas: import discovery-intake");
        break;
      }
    }
  }

  if (src.includes("buildSourcesToRun({")) {
    console.log("atlas: sourcesToRun already wired");
  } else if (src.includes("selectedBroadCategories") && src.includes(".slice(0, Math.max(1, opts.broadCategories))")) {
    const re = /const includeFaa = !\(opts\.skipFaa \?\? true\);[\s\S]*?const sourcesToRun = selectedBroadCategories[\s\S]*?: DISCOVERY_SOURCES;/;
    const neu = `const includeFaa = !(opts.skipFaa ?? true); // optional lane — not a hard requirement
  // Discovery-first: sample broad themes randomly (not first-N Europe-first order)
  // and interleave with shuffled registry rounds. Keeps intake mixed and bounded.
  const sourcesToRun = buildSourcesToRun({
    sources: DISCOVERY_SOURCES,
    discoveryFirst: opts.discoveryFirst,
    broadCategories: opts.discoveryFirst ? (opts.broadCategories ?? 3) : null,
    includeFaa,
  });`;
    if (re.test(src)) {
      src = src.replace(re, neu);
      changed = true;
      console.log("atlas: sourcesToRun via buildSourcesToRun");
    } else {
      console.warn("atlas: selectedBroadCategories block not matched");
    }
  } else {
    console.warn("atlas: sourcesToRun block anchors not found — manual check");
  }

  if (changed) fs.writeFileSync(atlas, src);
  else console.log("atlas: no file write needed");
}

function patchCaseBureau() {
  if (!fs.existsSync(caseBureau)) return;
  let src = fs.readFileSync(caseBureau, "utf8");
  let changed = false;
  const old = `bossPremise: "Start broad. Discover realistic public-world investor routes before resolving any one target in depth.",`;
  const neu = `bossPremise: "Start broad and mixed. Prefer active operators, founders, and approachable principals with practical public routes over famous-but-unreachable trophy names. Discover realistic investor routes before resolving any one target in depth.",`;
  if (src.includes(old)) {
    src = src.replace(old, neu);
    changed = true;
    console.log("case-bureau: discovery premise preference");
  }
  const rule = `"Famous or wealthy does not mean reachable.",`;
  const rule2 = `"Famous or wealthy does not mean reachable.",
      "Prefer operators and principals who show public activity or practical access signals over passive trophy wealth.",`;
  if (src.includes(rule) && !src.includes("Prefer operators and principals who show public activity")) {
    src = src.replace(rule, rule2);
    changed = true;
    console.log("case-bureau: discovery rule preference");
  }
  if (changed) fs.writeFileSync(caseBureau, src);
}

function patchBroad() {
  if (!fs.existsSync(broad)) {
    console.warn("skip broad-discovery — missing");
    return;
  }
  let src = fs.readFileSync(broad, "utf8");
  let changed = false;

  if (!src.includes('from "../discovery-intake"')) {
    const a = 'import { getPermanentClient } from "../redis";';
    if (src.includes(a)) {
      src = src.replace(
        a,
        a + '\nimport { rankCandidatesForAdmission, scoreApproachableCandidate } from "../discovery-intake";',
      );
      changed = true;
      console.log("broad-discovery: import discovery-intake");
    }
  }

  if (src.includes("rankCandidatesForAdmission(newEntities)")) {
    console.log("broad-discovery: rank already wired");
  } else if (src.includes("  // Insert new entities\n  let inserted = 0;")) {
    src = src.replace(
      "  // Insert new entities\n  let inserted = 0;",
      `  // Prefer operator / approachable public signals when the admission budget is tight
  newEntities = rankCandidatesForAdmission(newEntities);
  if (newEntities.length > 0) {
    logger.info(
      {
        top: newEntities.slice(0, 5).map((e) => ({
          name: e.name,
          score: scoreApproachableCandidate(e),
        })),
      },
      "Broad discovery: ranked candidates for approachable/operator preference",
    );
  }

  // Insert new entities
  let inserted = 0;`,
    );
    changed = true;
    console.log("broad-discovery: rank before insert");
  } else {
    console.warn("broad-discovery: rank anchor not found");
  }

  if (src.includes("bayesianScore: 0.3,") && src.includes("scoreApproachableCandidate")) {
    src = src.replace(
      "bayesianScore: 0.3,",
      "bayesianScore: scoreApproachableCandidate({ name: finalName, snippet, query }),",
    );
    changed = true;
    console.log("broad-discovery: approachable bayesianScore");
  } else if (src.includes("scoreApproachableCandidate({ name: finalName")) {
    console.log("broad-discovery: bayesianScore already approachable");
  }

  if (changed) fs.writeFileSync(broad, src);
  else console.log("broad-discovery: no file write needed");
}

patchAtlas();
patchCaseBureau();
patchBroad();
console.log("DONE apply-discovery-intake");
