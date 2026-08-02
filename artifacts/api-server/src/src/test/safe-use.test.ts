import { describe, expect, it } from "vitest";
import { canApproveForManualOutreach, getSafeUseDecision } from "../lib/safe-use";

describe("safe-use controls", () => {
  it("defaults every generated result to manual review", () => {
    const decision = getSafeUseDecision(null);
    expect(decision.status).toBe("manual_review");
    expect(decision.notice).toMatch(/does not send/i);
  });

  it("requires a reviewer note and minimum evidence before manual approval", () => {
    expect(canApproveForManualOutreach({ reviewerNote: "", identityScore: 0.9, accessScore: 0.9 })).toBe(false);
    expect(canApproveForManualOutreach({ reviewerNote: "Checked sources", identityScore: 0.7, accessScore: 0.5 })).toBe(true);
  });

  it("keeps blocked sessions blocked", () => {
    expect(getSafeUseDecision("blocked").notice).toMatch(/blocked/i);
  });
});