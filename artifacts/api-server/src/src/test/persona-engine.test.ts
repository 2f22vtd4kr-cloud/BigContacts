import { describe, expect, it } from "vitest";
import { shouldRequestContactFollowUp } from "../lib/persona-engine";

describe("persona contact follow-up rule", () => {
  it("requires another pass after a zero-yield HNWI review", () => {
    expect(shouldRequestContactFollowUp({
      entityType: "HNWI",
      approvedContactValues: [],
      contactOutcome: "organization_contact",
    })).toBe(true);
  });

  it("does not follow up when a personal route is already present", () => {
    expect(shouldRequestContactFollowUp({
      entityType: "HNWI",
      approvedContactValues: [],
      contactOutcome: "direct_contact_candidate",
    })).toBe(false);
  });

  it("does not apply the direct-target rule to property vehicles", () => {
    expect(shouldRequestContactFollowUp({
      entityType: "Corporation",
      approvedContactValues: [],
      contactOutcome: "organization_contact",
    })).toBe(false);
  });
});