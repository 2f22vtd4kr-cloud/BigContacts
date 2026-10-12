import { describe, expect, it } from "vitest";
import { resolveDiscoveryIterationsPerAct } from "../lib/research-depth";

describe("pivot-aware discovery episode budgeting", () => {
  it("splits the standard discovery allowance so two accepted pivots can still receive Investigator turns", () => {
    // Standard depth reserves 8 of 20 actions for target research, leaving 12
    // discovery actions. A six-action episode consumed all of that after only
    // two acts in the audited run; four-action acts let a second pivot execute.
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 12)).toBe(4);
  });

  it("scales the act cap to fast and deep discovery budgets without exceeding configured caps", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 4 }, 7)).toBe(3);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 19)).toBe(7);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 3 }, 10)).toBe(3);
  });

  it("returns no action allocation when the discovery budget is exhausted", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 0)).toBe(0);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, -1)).toBe(0);
  });
});
