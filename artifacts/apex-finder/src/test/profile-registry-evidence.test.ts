import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profileSource = readFileSync(new URL("../pages/profile.tsx", import.meta.url), "utf8");

describe("registry profile evidence semantics", () => {
  it("does not promote FAA registrants or HMLR transaction parties into owners or wealthy people", () => {
    expect(profileSource).toContain("FAA registrant record");
    expect(profileSource).toContain("registration is not proof of beneficial ownership");
    expect(profileSource).toContain("does not establish beneficial ownership, an ownership percentage, control, current possession, or personal wealth");
    expect(profileSource).toContain("UK Land Registry sale transaction records");
    expect(profileSource).toContain("does not prove current title, continuing ownership, or personal wealth");
    expect(profileSource).not.toContain("FAA aircraft owner");
    expect(profileSource).not.toContain("FAA ownership is one of our strongest wealth signals");
    expect(profileSource).not.toContain("registered owner of");
  });

  it("renders separate FAA registrant, registration, fractional, beneficial ownership, wealth and HNWI states", () => {
    for (const label of [
      "Registrant type",
      "Registration status",
      "Fractional ownership",
      "Beneficial ownership",
      "Wealth assessment",
      "HNWI qualification",
    ]) {
      expect(profileSource).toContain(label);
    }
    expect(profileSource).toContain('data-testid="faa-registrant-evidence"');
    expect(profileSource).toContain("Review only");
  });

  it("preserves and labels the additional FAA co-registrant names as unverified", () => {
    expect(profileSource).toContain("Additional names on the same registration");
    expect(profileSource).toContain("unverified");
    expect(profileSource).toContain("not independently verified people or beneficial owners");
  });

  it("suppresses estimated net worth when source metadata says personal wealth is not evidenced", () => {
    expect(profileSource).toContain("entityMetadata.personalWealthEvidence === false");
    expect(profileSource).toContain("entityMetadata.wealthStatus === \"not_assessed\"");
    expect(profileSource).toContain("displayableEstimatedNetWorth");
  });
});
