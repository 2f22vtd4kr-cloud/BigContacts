#!/usr/bin/env node
/**
 * Idempotent: wire RESEARCH_DEPTH into web-enricher adaptive budget
 * and stamp researchDepth on Case Bureau case files when possible.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webEnricher = path.join(root, "artifacts/api-server/src/src/lib/web-enricher.ts");
const caseBureau = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");

function patchWeb() {
  if (!fs.existsSync(webEnricher)) {
    console.warn("skip web-enricher — missing");
    return;
  }
  let src = fs.readFileSync(webEnricher, "utf8");
  let changed = false;
  if (!src.includes('from "./research-depth"')) {
    const anchor = 'from "./adaptive-research-director";';
    if (src.includes(anchor)) {
      src = src.replace(
        anchor,
        `from "./adaptive-research-director";\nimport { resolveResearchDepth } from "./research-depth";`,
      );
      changed = true;
      console.log("web-enricher: import research-depth");
    }
  }
  if (src.includes("maxActions: 5,") && !src.includes("resolveResearchDepth().adaptiveMaxActions")) {
    src = src.replace(
      "maxActions: 5,",
      "maxActions: resolveResearchDepth().adaptiveMaxActions,",
    );
    changed = true;
    console.log("web-enricher: depth-aware maxActions");
  }
  if (changed) fs.writeFileSync(webEnricher, src);
  else console.log("web-enricher: already wired or anchors missing");
}

function patchCaseBureau() {
  if (!fs.existsSync(caseBureau)) {
    console.warn("skip case-bureau — missing");
    return;
  }
  let src = fs.readFileSync(caseBureau, "utf8");
  let changed = false;
  if (!src.includes('from "./research-depth"')) {
    const anchors = [
      'import { logger } from "./logger";',
      'from "./investigation-progress";',
    ];
    for (const a of anchors) {
      if (src.includes(a) && !src.includes('from "./research-depth"')) {
        src = src.replace(
          a,
          a + '\nimport { resolveResearchDepth, type ResearchDepth } from "./research-depth";',
        );
        changed = true;
        console.log("case-bureau: import research-depth");
        break;
      }
    }
  }
  if (!src.includes("researchDepth?: ResearchDepth") && src.includes("contactRoutes: BureauContactRoute[]")) {
    src = src.replace(
      "contactRoutes: BureauContactRoute[];",
      "contactRoutes: BureauContactRoute[];\n  /** fast | standard | deep — controls adaptive budget bias */\n  researchDepth?: ResearchDepth;",
    );
    changed = true;
    console.log("case-bureau: researchDepth field");
  }
  if (src.includes("buildGeminiBossPlanPrompt(input)") && src.includes("buildApexAtlasBossPlanPrompt")) {
    src = src.replace(/buildGeminiBossPlanPrompt\(input\)/g, "buildApexAtlasBossPlanPrompt(input)");
    changed = true;
    console.log("case-bureau: switch Boss to Apex prompt");
  }
  if (changed) fs.writeFileSync(caseBureau, src);
  else console.log("case-bureau: already wired or anchors missing");
}

patchWeb();
patchCaseBureau();
console.log("DONE apply-research-depth");
