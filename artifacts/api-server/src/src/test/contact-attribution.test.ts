import { describe, expect, it } from "vitest";
import { scoreAttribution } from "../lib/contact-attribution";

describe("source-backed contact attribution", () => {
  const base = {
    email: "info@example.com",
    phone: null,
    sources: ["ContactPage"],
    entityType: "Corporation",
    resolvedDomain: "example.com",
    isValidEmail: true,
    isValidPhone: false,
  };

  it("allows a generic inbox only when the model labels a personal route and the exact quote binds person to value", () => {
    const result = scoreAttribution({
      ...base,
      exactClaimObserved: true,
      targetPersonEvidence: true,
      contactAttribution: "person_specific",
      exactQuotePersonValueBound: true,
    });

    expect(result.attributed).toBe(true);
    expect(result.dimensions.validation).toBe(0.78);
    expect(result.explanation).toContain("model-attributed person-specific route");
  });

  it("does not let a domain-fit mismatch veto explicit same-source model attribution", () => {
    const result = scoreAttribution({
      ...base,
      email: "info@subsidiary.example.net",
      resolvedDomain: "example.com",
      exactClaimObserved: true,
      targetPersonEvidence: true,
      contactAttribution: "person_specific",
      exactQuotePersonValueBound: true,
    });

    expect(result.attributed).toBe(true);
    expect(result.dimensions.domainFit).toBeLessThan(0.5);
  });

  it("keeps a generic inbox un-attributed when the source does not attribute it to the person", () => {
    const result = scoreAttribution({
      ...base,
      exactClaimObserved: true,
      targetPersonEvidence: false,
    });

    expect(result.attributed).toBe(false);
    expect(result.dimensions.validation).toBe(0.28);
    expect(result.dimensions.directness).toBe(0.28);
  });

  it("never promotes a shared inbox as a person-specific route even when the person appears on the page", () => {
    const result = scoreAttribution({
      ...base,
      exactClaimObserved: true,
      targetPersonEvidence: true,
      contactAttribution: "shared_inbox",
      exactQuotePersonValueBound: false,
    });
    expect(result.attributed).toBe(false);
    expect(result.dimensions.validation).toBe(0.28);
    expect(result.dimensions.directness).toBe(0.28);
  });

  it("does not let model attribution bypass exact-source or syntax requirements", () => {
    const missingQuote = scoreAttribution({
      ...base,
      exactClaimObserved: false,
      targetPersonEvidence: true,
    });
    const invalidEmail = scoreAttribution({
      ...base,
      isValidEmail: false,
      exactClaimObserved: true,
      targetPersonEvidence: true,
      contactAttribution: "person_specific",
      exactQuotePersonValueBound: false,
    });

    expect(missingQuote.attributed).toBe(false);
    expect(invalidEmail.attributed).toBe(false);
  });
});
