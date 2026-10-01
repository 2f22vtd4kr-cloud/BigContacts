import { describe, expect, it } from "vitest";
import { summarizeActionYield, updateActionYield } from "./research-action-learning";

describe("research action learning", () => {
  it("keeps a prior for sparse observations", () => {
    const stat = updateActionYield(undefined, { useful: true, execution: "success", informationGain: 0.8, turn: 1 });
    const summary = summarizeActionYield("web_search", stat);
    expect(summary.attempts).toBe(1);
    expect(summary.posteriorSuccess).toBeGreaterThan(0.5);
    expect(summary.meanInformationGain).toBe(0.8);
  });
  it("records failures without treating them as useful evidence", () => {
    const stat = updateActionYield(undefined, { useful: false, execution: "error", informationGain: 0.05, turn: 2 });
    const summary = summarizeActionYield("visit", stat);
    expect(summary.failureRate).toBe(1);
    expect(summary.usefulRate).toBe(0);
  });
});
