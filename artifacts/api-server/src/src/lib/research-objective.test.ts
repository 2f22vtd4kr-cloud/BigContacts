import { describe, expect, it } from "vitest";
import { validateResearchObjective } from "./research-objective";

describe("research objective validation", () => {
  it("accepts an epistemic research question without prescribing a tool or provider", () => {
    expect(validateResearchObjective("Resolve whether the observed executive is the same person as the founder named in the latest filing.")).toEqual({
      valid: true,
      direction: "Resolve whether the observed executive is the same person as the founder named in the latest filing.",
    });
  });

  it("rejects provider/tool directives and concrete URLs", () => {
    expect(validateResearchObjective("Use Groq to search Serper for the person.").valid).toBe(false);
    expect(validateResearchObjective("Visit https://example.com/profile and verify the role.").valid).toBe(false);
    expect(validateResearchObjective("Open www.example.com and inspect it.").valid).toBe(false);
  });

  it("rejects an empty redirect", () => {
    expect(validateResearchObjective("   ")).toEqual({
      valid: false,
      reason: "Research redirect contained no research objective.",
    });
  });
});
