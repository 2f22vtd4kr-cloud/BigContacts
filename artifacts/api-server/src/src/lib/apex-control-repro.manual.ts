/* Manual runtime diagnostic. Run explicitly only with a local API server available; excluded from the default Vitest suite. */
import { it } from "vitest";
import {
  buildAtlasPinnedControlState,
  buildAtlasRightHandControlPrompt,
  buildAtlasScopeRecoveryFeedback,
  compactAtlasInvestigatorReport,
} from "./atlas-control-decision";
import {
  buildDiscoveryLeadUtilizationState,
  discoveryPivotScopeKey,
} from "./agentic-web-research-core";
import { compactInvestigationContext } from "./investigation-context-compaction";
import { buildMissionActionBudget } from "./research-depth";

it("replays local control prompt assembly for the failed discovery case", async () => {
  const response = await fetch("http://localhost:80/api/research/bureau/cases/1");
  if (!response.ok) throw new Error(`Case endpoint returned HTTP ${response.status}`);
  const row = await response.json() as Record<string, unknown>;
  const caseFile = typeof row.caseFile === "string"
    ? JSON.parse(row.caseFile) as Record<string, unknown>
    : row.caseFile as Record<string, unknown>;
  const records = (caseFile.investigatorTrajectoryRecords as Array<Record<string, unknown>> ?? [])
    .map(({ thought: _withheld, ...record }) => record);
  const leadInventory = buildDiscoveryLeadUtilizationState(records as never[]);
  const activeScope = discoveryPivotScopeKey(String(row.objective ?? ""));
  const pinnedControlState = buildAtlasPinnedControlState({
    activeScope,
    leadInventory,
    admittedCandidates: [],
    findings: [],
  });
  const reportData = {
    provider: caseFile.investigatorLlm,
    controlValidationFeedback: null,
    scopeRecoveryFeedback: buildAtlasScopeRecoveryFeedback(records as never[]),
    status: "completed",
    stopReason: "ITERATION_BUDGET",
    missionActionBudget: buildMissionActionBudget({
      actionsUsed: 3,
      maximumActions: 64,
      maximumActionsPerEpisode: 3,
      episodeStopReason: "ITERATION_BUDGET",
    }),
    errorSummary: null,
    searches: caseFile.searches ?? 1,
    visits: caseFile.visits ?? 1,
    findings: [],
    modelFindings: [],
    ...leadInventory,
    targetInvestigation: null,
    openQuestions: records.map((record) => ({
      turn: record.turn,
      action: record.action,
      execution: record.execution,
      observation: record.observation,
      observedUrls: record.observedUrls,
      searchResultLeadUrls: record.execution === "success"
        && ["web_search", "parallel_web_search", "registry_search", "parallel_registry_search"].includes(String(record.action))
        ? (record.leadUrls as string[] ?? []).slice(0, 4)
        : [],
      stopReason: record.stopReason,
      failureDomain: record.failureDomain,
      failureKind: record.failureKind,
    })),
  };
  const investigatorReport = compactAtlasInvestigatorReport(JSON.stringify(reportData, null, 2));
  const compactState = compactInvestigationContext({
    maxChars: 6_500,
    raw: [
      "# Apex Atlas — Investigation Context",
      "## Bureau operating law",
      "Groq Boss owns Atlas control decisions. Groq Right-hand provides independent oversight. The Investigator owns research actions; deterministic code is the safety/integrity harness.",
      "## Objective",
      String(row.objective ?? ""),
      "## Discovery status",
      "completed",
      "## Admitted candidates",
      "[]",
      "## Complete finding state",
      "[]",
      "## Groq Boss previous control",
      JSON.stringify({ action: null, candidateName: null, candidateType: null }),
    ].join("\n\n"),
    trajectory: (caseFile.investigatorTrajectory as string[] | undefined) ?? [],
    trajectoryRecords: records as never[],
    evidenceGraphSummaries: [],
  });
  const prompt = buildAtlasRightHandControlPrompt({
    investigatorReport,
    compactState,
    pinnedControlState,
  });
  console.log(JSON.stringify({
    recordCount: records.length,
    leadCounts: {
      searchResultLeadUrlCount: leadInventory.searchResultLeadUrlCount,
      successfullyFetchedLeadUrlCount: leadInventory.successfullyFetchedLeadUrlCount,
      unfetchedLeadUrlCount: leadInventory.unfetchedLeadUrlCount,
      failedLeadUrlCount: leadInventory.failedLeadUrlCount,
    },
    pinnedChars: pinnedControlState.length,
    reportChars: investigatorReport.length,
    compactStateChars: compactState.length,
    rightHandPromptChars: prompt.length,
  }));
});
