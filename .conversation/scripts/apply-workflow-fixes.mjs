#!/usr/bin/env node
/**
 * Workflow weak-point fixes (idempotent):
 * 1) Boss plan uses Apex primary-source prompt (not the weak Gemini-only template)
 * 2) attachInvestigationProgress before right-hand + Boss decisions
 * 3) Target-case advance triggers contact-research for contact/footprint actions
 * 4) Action lifecycle: complete prior actives when activating next
 * 5) refreshCaseEvidenceFromEntity on advance so enrichment results enter case file
 * 6) Expanded execute trigger for structure/domain/web specialists
 *
 * Run: node scripts/apply-workflow-fixes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bureauPath = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const casesPath = path.join(root, "artifacts/api-server/src/src/routes/research/cases.ts");

function must(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

// ── case-bureau.ts ──────────────────────────────────────────────
let bureau = fs.readFileSync(bureauPath, "utf8");
let bureauChanged = false;

if (!bureau.includes('from "./case-bureau-prompt"')) {
  bureau = bureau.replace(
    'import type { Entity } from "@workspace/db";\nimport { logger } from "./logger";\n',
    'import type { Entity } from "@workspace/db";\nimport { logger } from "./logger";\nimport { buildApexAtlasBossPlanPrompt } from "./case-bureau-prompt";\nimport { computeInvestigationProgress, type InvestigationProgress } from "./investigation-progress";\nimport { resolveResearchDepth, type ResearchDepth } from "./research-depth";\n',
  );
  bureauChanged = true;
}

if (!bureau.includes("investigationProgress?: InvestigationProgress")) {
  bureau = bureau.replace(
    "  nextBestAction: BureauAction | null;\n  lastUpdatedBy: string;\n};",
    "  nextBestAction: BureauAction | null;\n  investigationProgress?: InvestigationProgress;\n  researchDepth?: ResearchDepth;\n  lastUpdatedBy: string;\n};",
  );
  bureauChanged = true;
}

if (!bureau.includes("Delegate to the Apex Atlas Boss plan prompt")) {
  const start = bureau.indexOf("function buildGeminiBossPlanPrompt(input: {");
  must(start >= 0, "buildGeminiBossPlanPrompt not found");
  const end = bureau.indexOf("export async function runGeminiBossPlan", start);
  must(end >= 0, "runGeminiBossPlan not found");
  const replacement = `function buildGeminiBossPlanPrompt(input: {
  file: ResearchCaseFile;
  rightHandAdvice: ResearchCaseFile["rightHandAdvice"];
  iteration: number;
}): string {
  // Delegate to the Apex Atlas Boss plan prompt (primary-source OSINT + case-context discipline).
  return buildApexAtlasBossPlanPrompt({
    iteration: input.iteration,
    rightHandAdvice: input.rightHandAdvice,
    file: input.file,
  });
}

`;
  bureau = bureau.slice(0, start) + replacement + bureau.slice(end);
  bureauChanged = true;
}

if (!bureau.includes("export function attachInvestigationProgress")) {
  const helper = `
/** Refresh sentient contact-vector progress on the case file before Boss / right-hand decisions. */
export function attachInvestigationProgress(file: ResearchCaseFile, now = new Date().toISOString()): ResearchCaseFile {
  const completedActionIds = file.actionQueue
    .filter((action) => action.status === "complete" || action.status === "active")
    .map((action) => action.id);
  const depth = resolveResearchDepth({ explicit: file.researchDepth ?? null });
  return {
    ...file,
    researchDepth: depth.depth,
    investigationProgress: computeInvestigationProgress({
      routes: file.contactRoutes,
      sourceRegistries: file.evidenceSummary.sourceRegistries,
      searchGaps: file.evidenceSummary.searchGaps,
      negativeFindings: file.evidenceSummary.negativeFindings,
      completedActionIds,
      now,
    }),
  };
}

`;
  const anchor = "export function buildInitialCaseFile(entity: Entity): ResearchCaseFile {";
  must(bureau.includes(anchor), "buildInitialCaseFile not found");
  bureau = bureau.replace(anchor, helper + anchor);
  bureauChanged = true;
}

if (!bureau.includes("return attachInvestigationProgress(seeded)")) {
  const oldRet = `  return {
    ...base,
    actionQueue,
    nextBestAction: actionQueue[0] ?? null,
  };
}

export function parseCaseFile`;
  const newRet = `  const seeded: ResearchCaseFile = {
    ...base,
    actionQueue,
    nextBestAction: actionQueue[0] ?? null,
    researchDepth: resolveResearchDepth().depth,
  };
  return attachInvestigationProgress(seeded);
}

export function parseCaseFile`;
  must(bureau.includes(oldRet), "buildInitialCaseFile return not found");
  bureau = bureau.replace(oldRet, newRet);
  bureauChanged = true;
}

// Action lifecycle: complete prior actives when activating a new action
if (!bureau.includes("Complete any prior active actions so the progress map")) {
  const oldAdvance = `export function advanceCaseFile(file: ResearchCaseFile, iteration: number, now = new Date().toISOString()): ResearchCaseFile {
  const next = file.actionQueue.find((action) => action.status === "queued") ?? null;
  const updatedQueue = file.actionQueue.map((action) =>
    action.id === next?.id ? { ...action, status: "active" as const } : action,
  );`;
  const newAdvance = `export function advanceCaseFile(file: ResearchCaseFile, iteration: number, now = new Date().toISOString()): ResearchCaseFile {
  const next = file.actionQueue.find((action) => action.status === "queued") ?? null;
  // Complete any prior active actions so the progress map and queue stay coherent.
  const updatedQueue = file.actionQueue.map((action) => {
    if (action.id === next?.id) return { ...action, status: "active" as const };
    if (action.status === "active") return { ...action, status: "complete" as const };
    return action;
  });`;
  if (bureau.includes(oldAdvance)) {
    bureau = bureau.replace(oldAdvance, newAdvance);
    bureauChanged = true;
  }
  const oldApply = `  const updatedQueue = file.actionQueue.map((action) =>
    action.id === next.id ? { ...action, status: "active" as const } : action,
  );
  return {
    ...file,
    actionQueue: updatedQueue,
    nextBestAction: { ...next, status: "active" },
    decisionLog: [
      ...file.decisionLog,
      {
        iteration: input.iteration,
        decision: input.decision,
        reason: input.reason,
        createdAt: now,
      },
    ].slice(-50),
    lastUpdatedBy: "gemini-boss",
  };
}`;
  const newApply = `  // Complete any prior active actions so the progress map and queue stay coherent.
  const updatedQueue = file.actionQueue.map((action) => {
    if (action.id === next.id) return { ...action, status: "active" as const };
    if (action.status === "active") return { ...action, status: "complete" as const };
    return action;
  });
  return {
    ...file,
    actionQueue: updatedQueue,
    nextBestAction: { ...next, status: "active" },
    decisionLog: [
      ...file.decisionLog,
      {
        iteration: input.iteration,
        decision: input.decision,
        reason: input.reason,
        createdAt: now,
      },
    ].slice(-50),
    lastUpdatedBy: "gemini-boss",
  };
}`;
  if (bureau.includes(oldApply)) {
    bureau = bureau.replace(oldApply, newApply);
    bureauChanged = true;
  }
}

// refreshCaseEvidenceFromEntity helper
if (!bureau.includes("export function refreshCaseEvidenceFromEntity")) {
  const anchor = "export function buildInitialCaseFile(entity: Entity): ResearchCaseFile {";
  if (bureau.includes(anchor) && !bureau.includes("export function refreshCaseEvidenceFromEntity")) {
    const helper = `
/**
 * Re-sync living case context from the entity's current public metadata.
 * Contact-research and other enrichers write to the entity; the case file must
 * absorb those structured results on every advance so Boss / right-hand see them.
 * Does not wipe action queue, decisions, or human directives.
 */
export function refreshCaseEvidenceFromEntity(file: ResearchCaseFile, entity: Entity): ResearchCaseFile {
  const metadata = parseJson<Record<string, unknown>>(entity.metadata, {});
  const investigatorPlan = metadata.investigatorResearchPlan && typeof metadata.investigatorResearchPlan === "object"
    ? metadata.investigatorResearchPlan as Record<string, unknown>
    : {};
  const adaptive = metadata.adaptiveResearchTrace && typeof metadata.adaptiveResearchTrace === "object"
    ? metadata.adaptiveResearchTrace as Record<string, unknown>
    : {};
  const sourceRegistries = parseJson<unknown[]>(entity.sourceRegistries, []);
  const knownResidences = parseJson<unknown[]>(entity.knownResidences, []);
  const discoveredPeople = uniqueStrings([
    ...file.evidenceSummary.discoveredPeople,
    ...(Array.isArray(adaptive.discoveredPeople) ? adaptive.discoveredPeople : []),
    ...(Array.isArray(investigatorPlan.namedPeople) ? investigatorPlan.namedPeople : []),
  ]);
  const relatedOrganizations = uniqueStrings([
    ...file.evidenceSummary.relatedOrganizations,
    ...(Array.isArray(adaptive.relatedOrganizations) ? adaptive.relatedOrganizations : []),
    ...(Array.isArray(investigatorPlan.relatedOrganizations) ? investigatorPlan.relatedOrganizations : []),
  ]);
  const knownDomains = uniqueStrings([
    ...file.target.knownDomains,
    entity.personalWebsite,
    ...(Array.isArray(adaptive.candidateDomains) ? adaptive.candidateDomains : []),
    ...domainsFromUrls(Array.isArray(adaptive.citations) ? adaptive.citations : []),
  ]);
  const searchGaps = uniqueStrings([
    ...file.evidenceSummary.searchGaps,
    ...(Array.isArray(adaptive.searchGaps) ? adaptive.searchGaps : []),
  ]);
  const negativeFindings = uniqueStrings([
    ...file.evidenceSummary.negativeFindings,
    ...(Array.isArray(adaptive.negativeFindings) ? adaptive.negativeFindings : []),
  ]);
  const refreshedRoutes = normalizeRoutes(metadata);
  const routeKey = (r: BureauContactRoute) => \`\${r.vectorType}|\${r.value}\`.toLowerCase();
  const mergedByKey = new Map<string, BureauContactRoute>();
  for (const r of file.contactRoutes) mergedByKey.set(routeKey(r), r);
  for (const r of refreshedRoutes) {
    const key = routeKey(r);
    const existing = mergedByKey.get(key);
    if (!existing || r.score > existing.score || r.sourceUrls.length > existing.sourceUrls.length) {
      mergedByKey.set(key, r);
    }
  }
  const contactRoutes = [...mergedByKey.values()]
    .sort((a, b) => b.score - a.score)
    .map((route, index) => ({ ...route, rank: index + 1 }))
    .slice(0, 40);
  const evidenceCount = Math.max(
    file.evidenceSummary.evidenceCount,
    typeof adaptive.evidenceCount === "number" ? adaptive.evidenceCount : 0,
    contactRoutes.length,
  );
  return {
    ...file,
    target: {
      ...file.target,
      name: entity.name || file.target.name,
      type: entity.type || file.target.type,
      nationality: entity.nationality ?? file.target.nationality,
      knownResidences: uniqueStrings([...file.target.knownResidences, ...knownResidences]),
      knownDomains,
    },
    evidenceSummary: {
      sourceRegistries: uniqueStrings([...file.evidenceSummary.sourceRegistries, ...sourceRegistries]),
      discoveredPeople,
      relatedOrganizations,
      evidenceCount,
      searchGaps,
      negativeFindings,
    },
    contactRoutes,
    lastUpdatedBy: "entity-refresh",
  };
}

`;
    bureau = bureau.replace(anchor, helper + anchor);
    bureauChanged = true;
  }
}

if (bureauChanged) {
  fs.writeFileSync(bureauPath, bureau);
  console.log("apply-workflow-fixes: patched case-bureau.ts");
} else {
  console.log("apply-workflow-fixes: case-bureau.ts already applied");
}

// ── cases.ts ────────────────────────────────────────────────────
let cases = fs.readFileSync(casesPath, "utf8");
let casesChanged = false;

if (!cases.includes("attachInvestigationProgress")) {
  cases = cases.replace(
    "  advanceCaseFile,\n",
    "  advanceCaseFile,\n  attachInvestigationProgress,\n",
  );
  casesChanged = true;
}

if (!cases.includes("refreshCaseEvidenceFromEntity")) {
  cases = cases.replace(
    "  recordGeminiBossPlan,\n",
    "  recordGeminiBossPlan,\n  refreshCaseEvidenceFromEntity,\n",
  );
  casesChanged = true;
}

if (!cases.includes("startContactResearch")) {
  const needle = 'from "../../lib/job-queue";\n';
  must(cases.includes(needle), "job-queue import not found");
  cases = cases.replace(
    needle,
    needle + 'import { startContactResearch } from "../../lib/contact-research-orchestrator";\n',
  );
  casesChanged = true;
}

if (!cases.includes("Re-sync living case context from entity metadata") && !cases.includes("Sentient progress map must be fresh")) {
  const oldAdv = `  const file = parseCaseFile(current.caseFile);
  if (!file) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  const nextIteration = current.iteration + 1;
  const reasoning = await runNvidiaNimCaseReasoning({
    file,
    iteration: nextIteration,
  });`;
  const newAdv = `  const parsedFile = parseCaseFile(current.caseFile);
  if (!parsedFile) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  // Re-sync living case context from entity metadata (contact-research writes there).
  const [fullEntity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId)).limit(1);
  const syncedFile = fullEntity
    ? refreshCaseEvidenceFromEntity(parsedFile, fullEntity)
    : parsedFile;
  // Sentient progress map must be fresh before right-hand + Boss decide the next action.
  const file = attachInvestigationProgress(syncedFile);
  const nextIteration = current.iteration + 1;
  const reasoning = await runNvidiaNimCaseReasoning({
    file,
    iteration: nextIteration,
  });`;
  must(cases.includes(oldAdv), "advance progress block not found");
  cases = cases.replace(oldAdv, newAdv);
  casesChanged = true;
} else if (!cases.includes("Re-sync living case context from entity metadata") && cases.includes("Sentient progress map must be fresh")) {
  const oldBlock = `  const parsedFile = parseCaseFile(current.caseFile);
  if (!parsedFile) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  // Sentient progress map must be fresh before right-hand + Boss decide the next action.
  const file = attachInvestigationProgress(parsedFile);`;
  const newBlock = `  const parsedFile = parseCaseFile(current.caseFile);
  if (!parsedFile) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  // Re-sync living case context from entity metadata (contact-research writes there).
  const [fullEntity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId)).limit(1);
  const syncedFile = fullEntity
    ? refreshCaseEvidenceFromEntity(parsedFile, fullEntity)
    : parsedFile;
  // Sentient progress map must be fresh before right-hand + Boss decide the next action.
  const file = attachInvestigationProgress(syncedFile);`;
  if (cases.includes(oldBlock)) {
    cases = cases.replace(oldBlock, newBlock);
    casesChanged = true;
  }
}

if (!cases.includes("Triggered contact-research job")) {
  const oldEnd = `  const [entity] = await db.select({ name: entitiesTable.name, type: entitiesTable.type }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId));
  res.json(serializeCase(updated!, entity ?? null));
});

router.post("/research/cases/:entityId/directive"`;
  const newEnd = `  const entity = typeof fullEntity !== "undefined" && fullEntity
    ? { name: fullEntity.name, type: fullEntity.type }
    : (await db.select({ name: entitiesTable.name, type: entitiesTable.type }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId)))[0] ?? null;

  // Execute path: when Boss assigns work that can produce public contact / footprint /
  // people / structure leads, kick durable enrichment. Planning-only advance was a
  // weak point — the investigator prompt is stored; tools must also run.
  const executeIds = new Set([
    "expand-contact-routes",
    "run-digital-footprint",
    "discover-people",
    "resolve-official-domains",
    "map-ownership-structure",
  ]);
  const executeSpecialists = new Set(["contact", "footprint", "web", "structure"]);
  const shouldExecute = action
    && (executeIds.has(action.id) || executeSpecialists.has(action.specialistId));
  if (shouldExecute) {
    try {
      const launched = await startContactResearch({ entityIds: [params.data.entityId], limit: 1 });
      await db.insert(researchCaseEventsTable).values({
        caseId: current.id,
        iteration: nextIteration,
        actorRole: "specialist",
        eventType: "observation",
        summary: \`Triggered contact-research job \${launched.jobId} for action \${action.id}.\`,
        payload: JSON.stringify({
          jobId: launched.jobId,
          actionId: action.id,
          tools: updatedFile.bossPlan?.tools ?? action.tools,
          investigatorPromptPreview: (updatedFile.bossPlan?.investigatorPrompt ?? "").slice(0, 500),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.insert(researchCaseEventsTable).values({
        caseId: current.id,
        iteration: nextIteration,
        actorRole: "specialist",
        eventType: "observation",
        summary: \`Contact-research launch skipped: \${message}\`,
        payload: JSON.stringify({ actionId: action.id, error: message }),
      });
    }
  }

  res.json(serializeCase(updated!, entity));
});

router.post("/research/cases/:entityId/directive"`;
  must(cases.includes(oldEnd), "advance end block not found");
  cases = cases.replace(oldEnd, newEnd);
  casesChanged = true;
} else if (!cases.includes("executeSpecialists")) {
  const oldExec = `  // Execute path: when Boss assigns contact / footprint work, kick durable enrichment for this entity.
  // Planning-only advance was a weak point — the investigator prompt is stored; tools must also run.
  const executeIds = new Set(["expand-contact-routes", "run-digital-footprint", "discover-people"]);
  if (action && executeIds.has(action.id)) {`;
  const newExec = `  // Execute path: when Boss assigns work that can produce public contact / footprint /
  // people / structure leads, kick durable enrichment. Planning-only advance was a
  // weak point — the investigator prompt is stored; tools must also run.
  const executeIds = new Set([
    "expand-contact-routes",
    "run-digital-footprint",
    "discover-people",
    "resolve-official-domains",
    "map-ownership-structure",
  ]);
  const executeSpecialists = new Set(["contact", "footprint", "web", "structure"]);
  const shouldExecute = action
    && (executeIds.has(action.id) || executeSpecialists.has(action.specialistId));
  if (shouldExecute) {`;
  if (cases.includes(oldExec)) {
    cases = cases.replace(oldExec, newExec);
    casesChanged = true;
  }
}

if (casesChanged) {
  fs.writeFileSync(casesPath, cases);
  console.log("apply-workflow-fixes: patched cases.ts");
} else {
  console.log("apply-workflow-fixes: cases.ts already applied");
}

console.log("apply-workflow-fixes: done");
