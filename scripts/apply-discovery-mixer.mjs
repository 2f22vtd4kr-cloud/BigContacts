#!/usr/bin/env node
/**
 * Idempotent Replit wire-up for randomized mixed Western discovery.
 * Safe to re-run. Does not invent data — only source selection + prompts.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const broadPath = path.join(root, "artifacts/api-server/src/src/lib/enrichment/broad-discovery.ts");
const caseBureauPath = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const atlasPath = path.join(root, "artifacts/api-server/src/src/lib/atlas-orchestrator.ts");

function patchBroad() {
  if (!fs.existsSync(broadPath)) {
    console.warn("skip broad-discovery — missing");
    return;
  }
  let src = fs.readFileSync(broadPath, "utf8");
  let changed = false;

  if (!src.includes('from "../discovery-source-mixer"')) {
    const anchor = 'import { getPermanentClient } from "../redis";';
    if (src.includes(anchor)) {
      src = src.replace(
        anchor,
        anchor + '\nimport { pickWesternBroadCategory, WESTERN_BROAD_CATEGORY_IDS } from "../discovery-source-mixer";',
      );
      changed = true;
      console.log("broad-discovery: import mixer");
    }
  }

  const oldRot = `async function getNextTemplateSet(rotate: boolean): Promise<number> {
  if (!rotate) return 1;
  const catKeys = Object.keys(TEMPLATE_CATEGORIES).map(Number);
  try {
    const client = await getPermanentClient();
    let lastUsed = 0;
    if (client) {
      const last = await client.get(ROTATION_KEY);
      lastUsed = last ? parseInt(last, 10) : 0;
    }
    // Pick randomly, avoiding the same category twice in a row for true diversity
    const available = catKeys.filter(k => k !== lastUsed);
    const picked = available[Math.floor(Math.random() * available.length)];
    if (client) await client.set(ROTATION_KEY, String(picked));
    return picked;
  } catch {
    return catKeys[Math.floor(Math.random() * catKeys.length)];
  }
}`;

  const newRot = `async function getNextTemplateSet(rotate: boolean): Promise<number> {
  if (!rotate) return 1;
  // Western-ally categories only (Japan→USA + UAE-capable sets); excludes LatAm/non-ally EE default
  const catKeys = WESTERN_BROAD_CATEGORY_IDS.filter((id) => TEMPLATE_CATEGORIES[id]);
  try {
    const client = await getPermanentClient();
    let lastUsed = 0;
    if (client) {
      const last = await client.get(ROTATION_KEY);
      lastUsed = last ? parseInt(last, 10) : 0;
    }
    const picked = pickWesternBroadCategory(lastUsed);
    if (client) await client.set(ROTATION_KEY, String(picked));
    return picked;
  } catch {
    return catKeys[Math.floor(Math.random() * Math.max(1, catKeys.length))] ?? 1;
  }
}`;

  if (src.includes(oldRot)) {
    src = src.replace(oldRot, newRot);
    changed = true;
    console.log("broad-discovery: western-only randomized rotation");
  } else if (src.includes("pickWesternBroadCategory")) {
    console.log("broad-discovery: rotation already patched");
  } else {
    console.warn("broad-discovery: rotation block not exact — check manually");
  }

  if (changed) fs.writeFileSync(broadPath, src);
}

function patchCaseBureau() {
  if (!fs.existsSync(caseBureauPath)) {
    console.warn("skip case-bureau — missing");
    return;
  }
  let src = fs.readFileSync(caseBureauPath, "utf8");
  let changed = false;

  if (!src.includes("discovery-source-mixer")) {
    const anchors = [
      'import { logger } from "./logger";',
      'from "./investigation-progress";',
      'from "./research-depth";',
    ];
    for (const a of anchors) {
      if (src.includes(a)) {
        src = src.replace(
          a,
          a +
            '\nimport {\n  buildMixedDiscoveryCandidateLanes,\n  formatMixedDiscoveryGuidance,\n  MIXED_DISCOVERY_GEOGRAPHY,\n  pickMixedDiscoverySlots,\n} from "./discovery-source-mixer";',
        );
        changed = true;
        console.log("case-bureau: import discovery mixer");
        break;
      }
    }
  }

  const oldGeo = `export const DEFAULT_DISCOVERY_GEOGRAPHY = "Western countries, prioritizing realistic regional and professional access over fame.";`;
  const newGeo = `export const DEFAULT_DISCOVERY_GEOGRAPHY = MIXED_DISCOVERY_GEOGRAPHY;`;
  if (src.includes(oldGeo)) {
    src = src.replace(oldGeo, newGeo);
    changed = true;
    console.log("case-bureau: DEFAULT_DISCOVERY_GEOGRAPHY → mixer");
  }

  const lanesOld = `    candidateLanes: [
      "Founder and operator-investors",
      "Family offices and investment groups",
      "Regional business owners and private-company principals",
      "Portfolio-company and advisor relationships",
      "Professional intermediaries and practical introduction routes",
      "Public social and organization routes",
    ],`;
  const lanesNew = `    candidateLanes: buildMixedDiscoveryCandidateLanes(),`;
  if (src.includes(lanesOld)) {
    src = src.replace(lanesOld, lanesNew);
    changed = true;
    console.log("case-bureau: candidateLanes → mixed lanes");
  } else if (src.includes("buildMixedDiscoveryCandidateLanes()")) {
    console.log("case-bureau: candidateLanes already mixed");
  }

  if (src.includes("runGeminiBossDiscovery") && !src.includes("formatMixedDiscoveryGuidance()")) {
    const needle = "The independent search lane is randomized within the Apex Atlas Western-world goal.";
    if (src.includes(needle)) {
      src = src.replace(
        needle,
        "The independent search lane is randomized within the Apex Atlas Western-world goal.\n\n${formatMixedDiscoveryGuidance()}\n\nMix registry anchors, FAA aviation owners when scheduled, and web recipes (e.g. investment companies of Norway, Dubai tech companies, Japan principals) — Western ally geography only.",
      );
      changed = true;
      console.log("case-bureau: Boss discovery mixed guidance");
    }
  }

  if (changed) fs.writeFileSync(caseBureauPath, src);
}

function patchAtlas() {
  if (!fs.existsSync(atlasPath)) {
    console.warn("skip atlas-orchestrator — missing");
    return;
  }
  let src = fs.readFileSync(atlasPath, "utf8");
  let changed = false;

  if (!src.includes("discovery-source-mixer")) {
    if (src.includes('from "./enrichment/broad-discovery"')) {
      src = src.replace(
        'from "./enrichment/broad-discovery"',
        'from "./enrichment/broad-discovery";\nimport { pickMixedDiscoverySlots, slotsToAtlasSources } from "./discovery-source-mixer"',
      );
      changed = true;
      console.log("atlas: import discovery mixer");
    } else if (src.includes('from "./logger"')) {
      src = src.replace(
        'from "./logger";',
        'from "./logger";\nimport { pickMixedDiscoverySlots, slotsToAtlasSources } from "./discovery-source-mixer";',
      );
      changed = true;
      console.log("atlas: import discovery mixer via logger anchor");
    }
  }

  if (!src.includes("pickMixedDiscoverySlots(") && src.includes("const DISCOVERY_SOURCES: DiscoverySource[]")) {
    src = src.replace(
      `  type DiscoverySource =
    | { kind: "broad"; category: number; label: string }
    | { kind: "registry"; label: string; clearFirst?: boolean };`,
      `  type DiscoverySource =
    | { kind: "broad"; category: number; label: string; slotId?: string }
    | { kind: "registry"; label: string; clearFirst?: boolean; slotId?: string }
    | { kind: "faa"; label: string; slotId?: string };`,
    );

    if (src.includes("const includeFaa = !(opts.skipFaa ?? true);")) {
      src = src.replace(
        "const includeFaa = !(opts.skipFaa ?? true); // skip FAA by default",
        `const includeFaa = opts.skipFaa === false; // FAA participates in randomized mix when not skipped
  // Randomized mixed Western slate (registry + web + optional FAA) — not a fixed sequential list
  const mixedSlots = pickMixedDiscoverySlots({
    count: Math.max(6, Math.min(12, opts.discoverySourceCount ?? 8)),
    includeFaa,
  });
  const MIXED_ATLAS_SOURCES: DiscoverySource[] = slotsToAtlasSources(mixedSlots).map((s) => {
    if (s.kind === "broad") return { kind: "broad" as const, category: s.category, label: s.label, slotId: s.slotId };
    if (s.kind === "faa") return { kind: "faa" as const, label: s.label, slotId: s.slotId };
    return { kind: "registry" as const, label: s.label, slotId: s.slotId };
  });`,
      );
      changed = true;
      console.log("atlas: randomized mixed slots builder");
    }

    if (src.includes("const sourcesToRun = selectedBroadCategories") && src.includes("MIXED_ATLAS_SOURCES")) {
      src = src.replace(
        `  const sourcesToRun = selectedBroadCategories
    ? DISCOVERY_SOURCES.filter(source => source.kind === "registry" || selectedBroadCategories.has(source.category))
    : DISCOVERY_SOURCES;`,
        `  const sourcesToRun = selectedBroadCategories
    ? MIXED_ATLAS_SOURCES.filter(source => source.kind === "registry" || source.kind === "faa" || (source.kind === "broad" && selectedBroadCategories.has(source.category)))
    : MIXED_ATLAS_SOURCES;`,
      );
      changed = true;
      console.log("atlas: sourcesToRun uses mixed slate");
    }
  }

  if (src.includes('if (source.kind === "broad")') && !src.includes('source.kind === "faa"') && src.includes("runFaaIngestion")) {
    if (src.includes("Optional FAA between registry")) {
      src = src.replace(
        "// Optional FAA between registry batches 3 and 4\n        if (includeFaa && sourceRound === 8) {",
        `if (source.kind === "faa") {
          const faaJobId = await createJob("faa");
          await setActiveJob("faa", faaJobId);
          const faaRes = await runFaaIngestion({ jobId: faaJobId, maxRecords: 1, forceRefresh: false })
            .catch(e => { logger.error({ err: e.message }, "[Atlas] FAA mixed-slot failed"); return { inserted: 0 }; });
          await setActiveJob("faa", "");
          totalIngested += faaRes.inserted;
        }

        // Legacy optional FAA between registry batches (kept for non-mix paths)
        if (includeFaa && sourceRound === 8 && source.kind === "registry") {`,
      );
      changed = true;
      console.log("atlas: explicit faa slot handler");
    }
  }

  if (changed) fs.writeFileSync(atlasPath, src);
  else console.log("atlas: no changes or already wired");
}

patchBroad();
patchCaseBureau();
patchAtlas();
console.log("DONE apply-discovery-mixer");
