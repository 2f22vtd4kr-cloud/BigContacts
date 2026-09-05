#!/usr/bin/env node
/**
 * apply-bureau-progress.mjs
 *
 * Idempotent wire-up of investigation progress into Case Bureau + research UI.
 * Safe to run multiple times. Real public data only; no synthetic contacts.
 *
 * Usage (from repo root):
 *   node scripts/apply-bureau-progress.mjs
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const caseBureauPath = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const researchPath = path.join(root, "artifacts/apex-finder/src/pages/research.tsx");
const promptPath = path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
const progressPath = path.join(root, "artifacts/api-server/src/src/lib/investigation-progress.ts");

function mustExist(p) {
  if (!fs.existsSync(p)) {
    console.error("Missing required file:", p);
    process.exit(1);
  }
}

mustExist(progressPath);
mustExist(promptPath);
mustExist(caseBureauPath);
mustExist(researchPath);

let caseBureau = fs.readFileSync(caseBureauPath, "utf8");
let research = fs.readFileSync(researchPath, "utf8");
let changed = false;

// ── case-bureau.ts ──────────────────────────────────────────────────────────

if (!caseBureau.includes('from "./investigation-progress"')) {
  const old = 'import { logger } from "./logger";';
  const neu = `import { logger } from "./logger";
import {
  computeInvestigationProgress,
  formatProgressForPrompt,
  classifyRouteMarker,
  type InvestigationProgress,
} from "./investigation-progress";
export type { InvestigationProgress, ContactVectorProgress, ContactVectorId } from "./investigation-progress";
import { buildApexAtlasBossPlanPrompt } from "./case-bureau-prompt";`;
  if (caseBureau.includes(old)) {
    caseBureau = caseBureau.replace(old, neu);
    changed = true;
    console.log("Applied: case-bureau imports");
  } else {
    console.warn("WARN: logger import anchor missing");
  }
} else {
  console.log("Already applied: case-bureau imports");
  if (!caseBureau.includes("buildApexAtlasBossPlanPrompt")) {
    caseBureau = caseBureau.replace(
      'from "./investigation-progress";',
      `from "./investigation-progress";
import { buildApexAtlasBossPlanPrompt } from "./case-bureau-prompt";`,
    );
    changed = true;
    console.log("Applied: case-bureau-prompt import");
  }
}

if (!caseBureau.includes("markerLabel: string")) {
  const old = `  rationale: string;
  humanReview: "use_judgment";
};`;
  const neu = `  rationale: string;
  humanReview: "use_judgment";
  /** UI marker: verified personal contacts are highlighted; all routes remain visible. */
  marker: "verified_personal" | "personal_review" | "organization" | "context";
  markerLabel: string;
};`;
  if (caseBureau.includes(old)) {
    caseBureau = caseBureau.replace(old, neu);
    changed = true;
    console.log("Applied: BureauContactRoute marker fields");
  }
} else {
  console.log("Already applied: BureauContactRoute markers");
}

if (!caseBureau.includes("investigationProgress: InvestigationProgress")) {
  const old = `  contactRoutes: BureauContactRoute[];
  humanDirectives: string[];`;
  const neu = `  contactRoutes: BureauContactRoute[];
  /** Sentient coverage map of standard contact vectors for this case. */
  investigationProgress: InvestigationProgress;
  humanDirectives: string[];`;
  if (caseBureau.includes(old)) {
    caseBureau = caseBureau.replace(old, neu);
    changed = true;
    console.log("Applied: ResearchCaseFile.investigationProgress");
  }
} else {
  console.log("Already applied: ResearchCaseFile.investigationProgress");
}

if (caseBureau.includes("buildGeminiBossPlanPrompt(input)") && caseBureau.includes("runGeminiBossPlan")) {
  if (!caseBureau.includes("buildApexAtlasBossPlanPrompt(input)")) {
    caseBureau = caseBureau.replace(
      "buildGeminiBossPlanPrompt(input)",
      "buildApexAtlasBossPlanPrompt(input)",
    );
    changed = true;
    console.log("Applied: runGeminiBossPlan uses Apex Atlas prompt");
  } else {
    console.log("Already applied: Apex Atlas prompt in runGeminiBossPlan");
  }
}

if (!caseBureau.includes("classifyRouteMarker({")) {
  const old = `      return {
        rank: index + 1,
        tier: tier.tier,
        tierLabel: tier.label,
        value: String(route.value ?? ""),
        vectorType: String(route.vectorType ?? "route"),
        personName: typeof route.personName === "string" ? route.personName : null,
        role: typeof route.role === "string" ? route.role : null,
        relationship: typeof route.relationship === "string" ? route.relationship : null,
        score: Math.max(0, Math.min(100, Math.round(confidence))),
        state: String(route.state ?? "review"),
        sourceUrls: urls,
        sourceDomains: uniqueStrings(
          Array.isArray(route.sourceDomains) ? route.sourceDomains : domainsFromUrls(urls),
        ),
        rationale: String(route.note ?? "Public route retained for human review."),
        humanReview: "use_judgment" as const,
      };`;
  const neu = `      const marker = classifyRouteMarker({
        vectorType: String(route.vectorType ?? "route"),
        value: String(route.value ?? ""),
        tier: tier.tier,
        state: String(route.state ?? "review"),
        relationship: typeof route.relationship === "string" ? route.relationship : null,
        personName: typeof route.personName === "string" ? route.personName : null,
        score: typeof route.score === "number" ? route.score : confidence,
      });
      return {
        rank: index + 1,
        tier: tier.tier,
        tierLabel: tier.label,
        value: String(route.value ?? ""),
        vectorType: String(route.vectorType ?? "route"),
        personName: typeof route.personName === "string" ? route.personName : null,
        role: typeof route.role === "string" ? route.role : null,
        relationship: typeof route.relationship === "string" ? route.relationship : null,
        score: Math.max(0, Math.min(100, Math.round(confidence))),
        state: String(route.state ?? "review"),
        sourceUrls: urls,
        sourceDomains: uniqueStrings(
          Array.isArray(route.sourceDomains) ? route.sourceDomains : domainsFromUrls(urls),
        ),
        rationale: String(route.note ?? "Public route retained for human review."),
        humanReview: "use_judgment" as const,
        marker: marker.marker,
        markerLabel: marker.label,
      };`;
  if (caseBureau.includes(old)) {
    caseBureau = caseBureau.replace(old, neu);
    changed = true;
    console.log("Applied: normalizeRoutes markers");
  } else {
    console.warn("WARN: normalizeRoutes return block not found exactly");
  }
} else {
  console.log("Already applied: normalizeRoutes markers");
}

if (!caseBureau.includes("const investigationProgress = computeInvestigationProgress")) {
  const old = `  const base = {
    version: 1 as const,
    target: {
      name: entity.name,
      type: entity.type,
      nationality: entity.nationality,
      knownResidences: uniqueStrings(knownResidences),
      knownDomains,
    },
    hypotheses: [
      \`The target identity is \${entity.type.toLowerCase()} "\${entity.name}" and should be resolved before trusting adjacent people.\`,
      "Useful access may exist through a named person, operator, executive, intermediary, social presence, or organization.",
    ],
    evidenceSummary,
    specialistRoster: SPECIALISTS,
    contactRoutes: normalizeRoutes(metadata),
    humanDirectives: [],
    decisionLog: [],
    lastUpdatedBy: "boss-local-planner",
  };`;
  const neu = `  const contactRoutes = normalizeRoutes(metadata);
  const investigationProgress = computeInvestigationProgress({
    routes: contactRoutes,
    sourceRegistries: evidenceSummary.sourceRegistries,
    searchGaps: evidenceSummary.searchGaps,
    negativeFindings: evidenceSummary.negativeFindings,
  });
  const base = {
    version: 1 as const,
    target: {
      name: entity.name,
      type: entity.type,
      nationality: entity.nationality,
      knownResidences: uniqueStrings(knownResidences),
      knownDomains,
    },
    hypotheses: [
      \`The target identity is \${entity.type.toLowerCase()} "\${entity.name}" and should be resolved before trusting adjacent people.\`,
      "Useful access may exist through a named person, operator, executive, intermediary, social presence, or organization.",
      "Standard contact vectors (email, phone, LinkedIn, Instagram, Telegram, TikTok, X, website, registries, username footprint) should each be attempted or explicitly marked negative before the case is considered complete.",
    ],
    evidenceSummary,
    specialistRoster: SPECIALISTS,
    contactRoutes,
    investigationProgress,
    humanDirectives: [],
    decisionLog: [],
    lastUpdatedBy: "boss-local-planner",
  };`;
  if (caseBureau.includes(old)) {
    caseBureau = caseBureau.replace(old, neu);
    changed = true;
    console.log("Applied: buildInitialCaseFile investigationProgress");
  } else {
    console.warn("WARN: buildInitialCaseFile base block not found exactly");
  }
} else {
  console.log("Already applied: buildInitialCaseFile investigationProgress");
}

if (!caseBureau.includes("if (!parsed.investigationProgress)")) {
  const old = `export function parseCaseFile(value: string): ResearchCaseFile | null {
  try {
    const parsed = JSON.parse(value) as ResearchCaseFile;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}`;
  const neu = `export function parseCaseFile(value: string): ResearchCaseFile | null {
  try {
    const parsed = JSON.parse(value) as ResearchCaseFile;
    if (!parsed || parsed.version !== 1) return null;
    if (!parsed.investigationProgress) {
      parsed.investigationProgress = computeInvestigationProgress({
        routes: parsed.contactRoutes ?? [],
        sourceRegistries: parsed.evidenceSummary?.sourceRegistries ?? [],
        searchGaps: parsed.evidenceSummary?.searchGaps ?? [],
        negativeFindings: parsed.evidenceSummary?.negativeFindings ?? [],
        completedActionIds: (parsed.actionQueue ?? [])
          .filter((action) => action.status === "complete" || action.status === "active")
          .map((action) => action.id),
      });
    }
    if (Array.isArray(parsed.contactRoutes)) {
      parsed.contactRoutes = parsed.contactRoutes.map((route) => {
        if (route.marker && route.markerLabel) return route;
        const marker = classifyRouteMarker(route);
        return { ...route, marker: marker.marker, markerLabel: marker.label };
      });
    }
    return parsed;
  } catch {
    return null;
  }
}`;
  if (caseBureau.includes(old)) {
    caseBureau = caseBureau.replace(old, neu);
    changed = true;
    console.log("Applied: parseCaseFile backfill");
  } else {
    console.warn("WARN: parseCaseFile block not found exactly");
  }
} else {
  console.log("Already applied: parseCaseFile backfill");
}

if (!caseBureau.includes("pendingSocialList") && caseBureau.includes('id: "expand-contact-routes"')) {
  const oldStart = 'function buildActions(file: Omit<ResearchCaseFile, "actionQueue" | "nextBestAction">): BureauAction[] {';
  if (caseBureau.includes(oldStart)) {
    caseBureau = caseBureau.replace(
      oldStart + "\n  const actions: BureauAction[] = [];\n  const { evidenceSummary, target } = file;",
      oldStart + `\n  const actions: BureauAction[] = [];\n  const { evidenceSummary, target } = file;\n  const progress = file.investigationProgress ?? computeInvestigationProgress({\n    routes: file.contactRoutes,\n    sourceRegistries: evidenceSummary.sourceRegistries,\n    searchGaps: evidenceSummary.searchGaps,\n    negativeFindings: evidenceSummary.negativeFindings,\n  });\n  const pending = new Set(progress.pendingVectors);\n  const socialPending = ["instagram", "twitter", "telegram", "tiktok", "linkedin"].some((id) => pending.has(id as any));\n  const phoneOrEmailPending = pending.has("email") || pending.has("phone");\n  const footprintPending = pending.has("username_footprint");\n  const registryPending = pending.has("registries");\n  const pendingSocialList = ["instagram", "telegram", "tiktok", "twitter", "linkedin", "email", "phone", "website"]\n    .filter((id) => pending.has(id as any))\n    .join(", ");`,
    );
    caseBureau = caseBureau.replace(
      'priority: evidenceSummary.discoveredPeople.length > 0 ? 98 : 80,\n    status: "queued",\n    rationale: "Every candidate route is retained and ranked for the human operator.",',
      'priority: (phoneOrEmailPending || socialPending) ? (evidenceSummary.discoveredPeople.length > 0 ? 99 : 90) : (evidenceSummary.discoveredPeople.length > 0 ? 98 : 80),\n    status: "queued",\n    rationale: pendingSocialList ? `Pending contact vectors still need a real attempt: ${pendingSocialList}. Every candidate route is retained and ranked for the human operator.` : "Every candidate route is retained and ranked for the human operator.",',
    );
    caseBureau = caseBureau.replace(
      'priority: 72,\n    status: "queued",\n    rationale: "Digital traces can reveal routes that formal registries miss.",',
      'priority: footprintPending ? 86 : 72,\n    status: "queued",\n    rationale: footprintPending ? "Username footprint vector is still pending — run Sherlock / Maigret / Holehe before closing the case." : "Digital traces can reveal routes that formal registries miss.",',
    );
    changed = true;
    console.log("Applied: buildActions pending-vector priorities");
  }
} else {
  console.log("Already applied or partial: buildActions priorities");
}

// ── research.tsx ────────────────────────────────────────────────────────────

if (!research.includes("markerLabel?: string")) {
  const old = `  rationale: string;\n  humanReview: "use_judgment";\n};`;
  const neu = `  rationale: string;\n  humanReview: "use_judgment";\n  marker?: "verified_personal" | "personal_review" | "organization" | "context";\n  markerLabel?: string;\n};\n\ntype InvestigationProgress = {\n  vectors: Array<{\n    id: string;\n    label: string;\n    status: string;\n    values: string[];\n    note: string | null;\n  }>;\n  pendingVectors: string[];\n  foundPersonalCount: number;\n  foundAnyCount: number;\n  coverageRatio: number;\n  lastAssessedAt: string;\n};`;
  if (research.includes(old.replace(/\\n/g, "\n"))) {
    research = research.replace(old.replace(/\\n/g, "\n"), neu.replace(/\\n/g, "\n"));
    changed = true;
    console.log("Applied: research.tsx BureauContactRoute + InvestigationProgress types");
  }
} else {
  console.log("Already applied: research.tsx types");
}

if (!research.includes("investigationProgress?: InvestigationProgress")) {
  const old = `  nextBestAction: BureauAction | null;\n  evidenceSummary: {`;
  const neu = `  nextBestAction: BureauAction | null;\n  investigationProgress?: InvestigationProgress;\n  evidenceSummary: {`;
  if (research.includes("nextBestAction: BureauAction | null;\n  evidenceSummary: {") || research.includes("nextBestAction: BureauAction | null;\n  evidenceSummary: {")) {
    research = research.replace(
      "nextBestAction: BureauAction | null;\n  evidenceSummary: {",
      "nextBestAction: BureauAction | null;\n  investigationProgress?: InvestigationProgress;\n  evidenceSummary: {",
    );
    changed = true;
    console.log("Applied: BureauCaseFile.investigationProgress type");
  }
}

if (changed) {
  fs.writeFileSync(caseBureauPath, caseBureau);
  fs.writeFileSync(researchPath, research);
  console.log("DONE: wrote case-bureau.ts and research.tsx");
} else {
  console.log("DONE: no changes needed (already wired)");
}

process.exit(0);
