import { describe, expect, it } from "vitest";
import { reconcilePreflightInvestigatorAssignment } from "./canonical-investigator-assignment";
import type { InvestigatorCapability } from "./investigator-capability-registry";

const investigator20b = "groq-investigator-20b" as InvestigatorCapability;
const investigator120b = "groq-investigator-1" as InvestigatorCapability;

describe("canonical discovery preflight Investigator assignment", () => {
  it("persists a healthy Boss replacement when the durable capability was explicitly excluded", () => {
    const result = reconcilePreflightInvestigatorAssignment({
      caseFile: JSON.stringify({
        contextDocument: "preserve this shared case context",
        investigatorLlm: investigator20b,
        investigatorCapabilityHistory: [{ from: "old", to: "older", trigger: "prior" }],
      }),
      selectedInvestigator: investigator120b,
      availableInvestigators: [investigator20b, investigator120b],
      excludedInvestigators: [investigator20b],
    });

    const persisted = JSON.parse(result.caseFile);
    expect(result).toMatchObject({ previousInvestigator: investigator20b, changed: true });
    expect(persisted).toMatchObject({
      contextDocument: "preserve this shared case context",
      investigatorLlm: investigator120b,
      investigatorCapabilityHistory: [
        { from: "old", to: "older", trigger: "prior" },
        { from: investigator20b, to: investigator120b, trigger: "preflight_excluded" },
      ],
    });
  });

  it("records the initial Boss selection when the durable case has no prior assignment", () => {
    const result = reconcilePreflightInvestigatorAssignment({
      caseFile: JSON.stringify({ contextDocument: "keep" }),
      selectedInvestigator: investigator120b,
      availableInvestigators: [investigator120b],
      excludedInvestigators: [],
    });
    expect(JSON.parse(result.caseFile)).toMatchObject({
      contextDocument: "keep",
      investigatorLlm: investigator120b,
    });
    expect(result.previousInvestigator).toBeNull();
    expect(result.changed).toBe(true);
  });

  it("does not append reassignment history when Boss retains the current capability", () => {
    const result = reconcilePreflightInvestigatorAssignment({
      caseFile: JSON.stringify({ investigatorLlm: investigator120b, investigatorCapabilityHistory: [] }),
      selectedInvestigator: investigator120b,
      availableInvestigators: [investigator120b],
      excludedInvestigators: [],
    });
    expect(JSON.parse(result.caseFile).investigatorCapabilityHistory).toEqual([]);
    expect(result.changed).toBe(false);
  });

  it("rejects silent rotation when preflight did not exclude the durable capability", () => {
    expect(() => reconcilePreflightInvestigatorAssignment({
      caseFile: JSON.stringify({ investigatorLlm: investigator20b }),
      selectedInvestigator: investigator120b,
      availableInvestigators: [investigator20b, investigator120b],
      excludedInvestigators: [],
    })).toThrow(/preflight did not exclude/);
  });

  it("rejects a Boss replacement that is unavailable or itself excluded", () => {
    const base = {
      caseFile: JSON.stringify({ investigatorLlm: investigator20b }),
      selectedInvestigator: investigator120b,
      excludedInvestigators: [investigator20b],
    };
    expect(() => reconcilePreflightInvestigatorAssignment({
      ...base,
      availableInvestigators: [investigator20b],
    })).toThrow(/no longer runtime-available/);
    expect(() => reconcilePreflightInvestigatorAssignment({
      ...base,
      availableInvestigators: [investigator20b, investigator120b],
      excludedInvestigators: [investigator20b, investigator120b],
    })).toThrow(/explicitly excluded/);
  });

  it("fails closed on malformed durable case state", () => {
    expect(() => reconcilePreflightInvestigatorAssignment({
      caseFile: "{not-json",
      selectedInvestigator: investigator120b,
      availableInvestigators: [investigator120b],
      excludedInvestigators: [],
    })).toThrow();
  });
});
