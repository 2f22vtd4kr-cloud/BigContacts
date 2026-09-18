import { describe, expect, it } from "vitest";

function metric(tp, predicted, expected) {
  return { precision: predicted ? tp / predicted : null, recall: expected ? tp / expected : null };
}

describe("research gauntlet metric contract", () => {
  it("keeps precision and recall separate", () => expect(metric(2, 4, 2)).toEqual({ precision: 0.5, recall: 1 }));
  it("does not reward a forced answer when no expected identity exists", () => expect(metric(0, 1, 0)).toEqual({ precision: 0, recall: null }));
  it("permits insufficient-evidence cases", () => expect({ outcome: "insufficient_evidence", identities: [] }.outcome).toBe("insufficient_evidence"));
  it("requires unique observation identifiers", () => {
    const observations = [{ id: "o1" }, { id: "o2" }];
    expect(new Set(observations.map(o => o.id)).size).toBe(observations.length);
  });
});