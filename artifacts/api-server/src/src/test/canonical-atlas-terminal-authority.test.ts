import { describe, expect, it } from "vitest";

import { deriveLatestEvidenceBackedTerminal } from "../lib/canonical-terminal-authority";

describe("canonical Atlas terminal authority", () => {
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

});