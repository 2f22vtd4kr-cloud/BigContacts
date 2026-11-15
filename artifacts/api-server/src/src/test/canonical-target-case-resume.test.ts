import { describe, expect, it } from "vitest";
import { isBudgetStoppedTargetCase } from "../lib/canonical-single-target-runner";

describe("canonical target budget-stop resumption", () => {
  it("allows only reviewed cases parked for a daily budget or ledger stop to resume", () => {
    expect(isBudgetStoppedTargetCase("review", "daily-token-budget-exhausted")).toBe(true);
    expect(isBudgetStoppedTargetCase("review", "daily-usage-ledger-unavailable")).toBe(true);
    expect(isBudgetStoppedTargetCase("review", "investigator-incomplete-or-time-limited")).toBe(false);
    expect(isBudgetStoppedTargetCase("active", "daily-token-budget-exhausted")).toBe(false);
    expect(isBudgetStoppedTargetCase("complete", "daily-token-budget-exhausted")).toBe(false);
    expect(isBudgetStoppedTargetCase("review", null)).toBe(false);
  });
});
