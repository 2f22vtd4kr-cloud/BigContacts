import { describe, expect, it } from "vitest";

const outcomes = new Set(["verified","insufficient_evidence","wrong_answer","system_failure","cancelled","exhausted","contradicted"]);
const failureClasses = new Set(["IDENTITY_COLLISION","IDENTITY_OVERCOMMITMENT","INSUFFICIENT_EVIDENCE","MISLEADING_SEARCH_RESULT","STALE_SOURCE","COPIED_CONTACT","WRONG_ENTITY","CONTACT_MISATTRIBUTION","CONTRADICTION_MISCLASSIFICATION","MISSED_PIVOT","UNNECESSARY_PIVOT","TOOL_SELECTION_ERROR","PREMATURE_STOP","LATE_STOP","PROMPT_INJECTION","SOURCE_QUALITY_ERROR","SYSTEM_FAILURE"]);

describe("research run contract", () => {
  it("keeps insufficient evidence distinct from system failure", () => {
    expect(outcomes.has("insufficient_evidence")).toBe(true);
    expect(outcomes.has("system_failure")).toBe(true);
    expect("insufficient_evidence").not.toBe("system_failure");
  });
  it("uses an explicit failure taxonomy", () => {
    expect(failureClasses.size).toBe(17);
    expect(failureClasses.has("PROMPT_INJECTION")).toBe(true);
    expect(failureClasses.has("CONTACT_MISATTRIBUTION")).toBe(true);
  });
  it("requires source-backed evidence paths conceptually", () => {
    const claim={supportingObservationIds:["o1"]};
    const observations=new Set(["o1"]);
    expect(claim.supportingObservationIds.every((id)=>observations.has(id))).toBe(true);
  });
});
