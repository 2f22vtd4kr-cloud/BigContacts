import { describe, expect, it } from "vitest";
import { computeContactConfidence, computeContactOutcome, hasMeaningfulDirectContact } from "../lib/contact-confidence";

describe("organization contact confidence boundary", () => {
  it("does not score an agentic organization phone as personal", () => {
    const entity = { type: "HNWI", phone: "+14155550123", phoneSource: "agentic-web-org" };
    expect(computeContactConfidence(entity)).toBe(0);
    expect(computeContactOutcome(entity)).toBe("organization_contact");
    expect(hasMeaningfulDirectContact(entity)).toBe(false);
  });

  it("does not verify an issuer phone as personal even when a validator flag is present", () => {
    const entity = { type: "HNWI", phone: "+14155550123", phoneSource: "EDGAR-Issuer-Phone", validatedDirectContact: true };
    expect(computeContactOutcome(entity)).toBe("organization_contact");
    expect(hasMeaningfulDirectContact(entity)).toBe(false);
  });
});
