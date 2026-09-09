import { describe, expect, it } from "vitest";
import { assessIdentityCollision } from "../lib/identity-collision";

describe("identity collision safety", () => {
  it("flags school and district mailboxes even when a surname overlaps", () => {
    const result = assessIdentityCollision({
      targetName: "S Joseph Moore",
      companyName: "Nelson Thomas Inc",
      personName: "S Joseph Moore",
      value: "joseph.peake@nelson.kyschools.us",
      sourceUrls: ["https://www.facebook.com/ThomasNelsonHighSchool"],
      note: "public contact on school Facebook page",
    });

    expect(result.risk).toBe(true);
    expect(result.reason).toContain("school/district");
  });

  it("keeps a directly named person on a non-institutional source eligible for high-confidence binding", () => {
    const result = assessIdentityCollision({
      targetName: "Jane Example",
      companyName: "Example Holdings",
      personName: "Jane Example",
      value: "jane@exampleholdings.com",
      sourceUrls: ["https://exampleholdings.com/team/jane-example"],
      note: "Jane Example email listed on her company profile",
    });

    expect(result.risk).toBe(false);
    expect(result.identityMatch).toBeGreaterThanOrEqual(0.65);
  });
});
