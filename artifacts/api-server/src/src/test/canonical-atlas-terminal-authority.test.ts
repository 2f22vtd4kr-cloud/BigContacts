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
});
