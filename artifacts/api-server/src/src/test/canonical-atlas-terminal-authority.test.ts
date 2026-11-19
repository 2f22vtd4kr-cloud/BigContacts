import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { deriveLatestEvidenceBackedTerminal, isCanonicalTargetEpisodeComplete } from "../lib/canonical-terminal-authority";

const canonicalAtlasDiscoverySource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const canonicalAtlasLaunchSource = readFileSync(resolve(process.cwd(), "src/src/routes/research/canonical-atlas-launch.ts"), "utf8");
const bureauAgenticPassSource = readFileSync(resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");

describe("canonical Atlas terminal authority", () => {
  it("persists an authoritative terminal snapshot for successful and failed jobs", () => {
    expect(canonicalAtlasDiscoverySource).toContain("phaseSummary.terminal = JSON.stringify(terminalSnapshot)");
    expect(canonicalAtlasDiscoverySource).toContain("const terminalJobResult = {");
    expect(canonicalAtlasDiscoverySource).toContain("terminal: terminalSnapshot");
    expect(canonicalAtlasDiscoverySource).toContain("result: JSON.stringify(terminalJobResult)");
    expect(canonicalAtlasDiscoverySource).toContain("phaseSummary.terminal = JSON.stringify(failureTerminalSnapshot)");
    expect(canonicalAtlasDiscoverySource).toContain("result: JSON.stringify({ terminal: failureTerminalSnapshot, phaseSummary })");
    expect(canonicalAtlasDiscoverySource).toContain("materializedCardCount: materialized");
    expect(canonicalAtlasDiscoverySource).toContain("investigatorActionsRemaining:");
    expect(canonicalAtlasDiscoverySource).not.toContain("targetResearchReserveIterations");
  });
  it("surfaces runtime parse/provider failures as advisory lane health without automatic reassignment", () => {
    expect(canonicalAtlasDiscoverySource).toContain("getInvestigatorCapabilityRuntimeHealthSnapshot()");
    expect(canonicalAtlasDiscoverySource).toContain("investigatorLaneHealth,");
    expect(canonicalAtlasDiscoverySource).toContain("INVESTIGATOR LANE HEALTH (runtime parse/provider diagnostics; advisory only; Boss retains capability selection)");
  });

  it("gives Boss and Right-hand the durable prior trajectory without embedding full page artifacts", () => {
    expect(bureauAgenticPassSource).toContain("trajectoryRecords:[...priorTrajectoryRecords,...agentic.trajectoryRecords]");
    expect(bureauAgenticPassSource).toContain("const{pageArtifact:_pageArtifact,...promptRecord}=record");
  });

  it("makes discovery stagnation telemetry visible to Boss and independent Right-hand review", () => {
    expect(canonicalAtlasDiscoverySource).toContain("discoverySearchLivenessAdvisory(discovery.trajectoryRecords ?? [])");
    expect(canonicalAtlasDiscoverySource).toContain("researchLivenessAdvisory,");
    expect(canonicalAtlasDiscoverySource).toContain("RESEARCH LIVENESS (advisory only");
  });

  it("verifies exact named quotations across continuation sections of the same fetched source URL", () => {
    expect(canonicalAtlasLaunchSource).toContain("(verifiedSourceObservations.get(normalizeEvidenceUrl(url)) ?? []).join");
    expect(canonicalAtlasLaunchSource).toContain("normalizedObservation.includes(normalizedQuote) && normalizedObservation.includes(normalizedName)");
    expect(canonicalAtlasLaunchSource).not.toContain(".some((observation) => {");
  });

  it("records reconciliation results, database read-back counts, durable trace count, and lock-release verification", () => {
    expect(canonicalAtlasLaunchSource).toContain("organizationReconciliation");
    expect(canonicalAtlasLaunchSource).toContain("personReconciliation");
    expect(canonicalAtlasLaunchSource).toContain("persistedCardCountReadBack");
    expect(canonicalAtlasLaunchSource).toContain("persistedEvidenceCountReadBack");
    expect(canonicalAtlasLaunchSource).toContain("durableTraceEventCountReadBack");
    expect(canonicalAtlasLaunchSource).toContain("modelAuditAttachment: resolveModelAuditAttachmentForJob(atlasJobId)");
    expect(canonicalAtlasLaunchSource).toContain("lockReleasedReadBack");
    expect(canonicalAtlasLaunchSource).toContain("terminal-reconciliation");
  });

  it("allows a completed target episode to become the current terminal", () => {
    expect(deriveLatestEvidenceBackedTerminal("target", "complete")).toBe("target");
  });

  it("clears an earlier target terminal when a new discovery episode starts or fails", () => {
    expect(deriveLatestEvidenceBackedTerminal("discovery", "review", "ITERATION_BUDGET")).toBeNull();
    expect(deriveLatestEvidenceBackedTerminal("discovery", "error", "PARSE_FAILURE")).toBeNull();
  });

  it("only restores discovery as terminal when that latest episode actually completed", () => {
    expect(deriveLatestEvidenceBackedTerminal("discovery", "completed", "MODEL_DECIDED_DONE")).toBe("discovery");
    expect(deriveLatestEvidenceBackedTerminal("discovery", "completed", "MODEL_DECIDED_DONE", true)).toBeNull();
  });

  it("does not let a failed target episode inherit a prior completed target terminal", () => {
    const prior = deriveLatestEvidenceBackedTerminal("target", "complete");
    expect(prior).toBe("target");
    const current = deriveLatestEvidenceBackedTerminal("target", "review");
    expect(current).toBeNull();
  });
  it("does not treat discovery admission as completion of a full Atlas run", async () => {
    const { isCanonicalAtlasRunEvidenceComplete } = await import("../lib/canonical-terminal-authority");
    expect(isCanonicalAtlasRunEvidenceComplete("discovery", 0)).toBe(false);
    expect(isCanonicalAtlasRunEvidenceComplete("discovery", 1)).toBe(false);
    expect(isCanonicalAtlasRunEvidenceComplete(null, 1)).toBe(false);
  });

  it("requires at least one completed target episode for full-run completion", async () => {
    const { isCanonicalAtlasRunEvidenceComplete } = await import("../lib/canonical-terminal-authority");
    expect(isCanonicalAtlasRunEvidenceComplete("target", 0)).toBe(false);
    expect(isCanonicalAtlasRunEvidenceComplete("target", 1)).toBe(true);
  });


  it("requires completed Right-hand/Boss oversight and evidence for target terminal", () => {
    const complete = {
      investigatorStatus: "completed",
      stopReason: "MODEL_DECIDED_DONE",
      evidenceGraphCount: 1,
      oversightStatus: "completed",
      oversightAction: "stop",
      cancelled: false,
      resourceLimited: false,
      deadlineExceeded: false,
    };
    expect(isCanonicalTargetEpisodeComplete(complete)).toBe(true);
    expect(isCanonicalTargetEpisodeComplete({ ...complete, oversightStatus: "unavailable" })).toBe(false);
    expect(isCanonicalTargetEpisodeComplete({ ...complete, oversightAction: "continue" })).toBe(false);
    expect(isCanonicalTargetEpisodeComplete({ ...complete, evidenceGraphCount: 0 })).toBe(false);
    expect(isCanonicalTargetEpisodeComplete({ ...complete, deadlineExceeded: true })).toBe(false);
    expect(isCanonicalTargetEpisodeComplete({ ...complete, resourceLimited: true })).toBe(false);
    expect(isCanonicalTargetEpisodeComplete({ ...complete, cancelled: true })).toBe(false);
  });

});
