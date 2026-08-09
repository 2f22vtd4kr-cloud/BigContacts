#!/usr/bin/env node
/**
 * Idempotent: wire discovery-intake (shuffle + approachable preference) into Atlas.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const atlas = path.join(root, "artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
const caseBureau = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");

function patchAtlas() {
  if (!fs.existsSync(atlas)) {
    console.warn("skip atlas-orchestrator — missing");
    return;
  }
  let src = fs.readFileSync(atlas, "utf8");
  let changed = false;

  if (!src.includes('from "./discovery-intake"')) {
    const anchors = [
      'from "./logger";',
      'from "./job-queue";',
    ];
    for (const a of anchors) {
      if (src.includes(a)) {
        src = src.replace(
          a,
          a + '\nimport { buildSourcesToRun } from "./discovery-intake";',
        );
        changed = true;
        console.log("atlas: import discovery-intake");
        break;
      }
    }
  }

  const oldBlock = `  const includeFaa = !(opts.skipFaa ?? true); // skip FAA by default
  // Discovery-first mode is intentionally bounded. Keep all registry anchor
  // rounds, but honor broadCategories so a "3 category" launch does not
  // silently expand into every broad source and recreate the prior OOM risk.
  const selectedBroadCategories = opts.discoveryFirst && opts.broadCategories
    ? new Set(
        DISCOVERY_SOURCES
          .filter((source): source is Extract<DiscoverySource, { kind: "broad" }> => source.kind === "broad")
          .slice(0, Math.max(1, opts.broadCategories))
          .map(source => source.category),
      )
    : null;
  const sourcesToRun = selectedBroadCategories
    ? DISCOVERY_SOURCES.filter(source => source.kind === "registry" || selectedBroadCategories.has(source.category))
    : DISCOVERY_SOURCES;`;

  const newBlock = `  const includeFaa = !(opts.skipFaa ?? true); // optional lane — not a hard requirement
  // Discovery-first: sample broad themes randomly (not first-N Europe-first order)
  // and interleave with shuffled registry rounds. Keeps intake mixed and bounded.
  const sourcesToRun = buildSourcesToRun({
    sources: DISCOVERY_SOURCES,
    discoveryFirst: opts.discoveryFirst,
    broadCategories: opts.discoveryFirst ? (opts.broadCategories ?? 3) : null,
    includeFaa,
  });`;

  if (src.includes(oldBlock)) {
    src = src.replace(oldBlock, newBlock);
    changed = true;
    console.log("atlas: sourcesToRun via buildSourcesToRun");
  } else if (src.includes("buildSourcesToRun({")) {
    console.log("atlas: sourcesToRun already wired");
  } else {
    console.warn("atlas: sourcesToRun block anchors not found — manual check");
  }

  if (src.includes("Number of randomised broad-discovery categories") && !src.includes("sampled without replacement")) {
    src = src.replace(
      "Number of randomised broad-discovery categories to run in Phase 0.",
      "Number of broad-discovery categories to sample without replacement (mixed themes, not first-N fixed order).",
    );
    changed = true;
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

patchAtlas();
patchCaseBureau();
console.log("DONE apply-discovery-intake");
