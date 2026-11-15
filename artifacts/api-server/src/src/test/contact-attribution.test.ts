import { describe, expect, it } from "vitest";
import { scoreAttribution } from "../lib/contact-attribution";

describe("model-owned contact attribution", () => {
  const base = {
    email: "info@example.com",
    phone: null,
    sources: ["ContactPage"],
    entityType: "Corporation",
    resolvedDomain: "example.com",
    isValidEmail: true,
    isValidPhone: false,
  };

  it("attributes only when the model explicitly binds the person and value in fetched evidence", () => {
    const result = scoreAttribution({
      ...base,
      exactClaimObserved: true,
      targetPersonEvidence: true,
      contactAttribution: "person_specific",
      exactQuotePersonValueBound: true,
      modelConfidence: 0.83,
    });

    expect(result.attributed).toBe(true);
    expect(result.score).toBe(0.83);
    expect(result.dimensions.validation).toBe(1);
    expect(result.dimensions.directness).toBe(1);
    expect(result.explanation).toContain("model-attributed person-specific route");
  });

  it("does not let a domain mismatch veto explicit same-source model attribution", () => {
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

  it("does not infer person attribution from a generic inbox, source proximity or publisher identity", () => {
    const first = scoreAttribution({ ...base, sources: ["EDGAR"] });
    const second = scoreAttribution({ ...base, sources: ["ContactPage"] });

    expect(first.attributed).toBe(false);
    expect(second.attributed).toBe(false);
    expect(first.score).toBeNull();
    expect(second.score).toBeNull();
    expect(first.dimensions.sourceEvidence).toBe(1);
    expect(second.dimensions.sourceEvidence).toBe(1);
  });

  it("keeps shared inboxes, departments and intermediaries separate from person-specific routes", () => {
    for (const contactAttribution of ["department", "assistant_intermediary", "generic_contact_form", "shared_inbox"] as const) {
      const result = scoreAttribution({
        ...base,
        exactClaimObserved: true,
        targetPersonEvidence: true,
        contactAttribution,
        exactQuotePersonValueBound: false,
      });
      expect(result.attributed).toBe(false);
      expect(result.dimensions.directness).toBe(0);
    }
  });

  it("does not let model attribution bypass exact-source or syntax verification", () => {
    const missingQuote = scoreAttribution({
      ...base,
      exactClaimObserved: false,
      targetPersonEvidence: true,
      contactAttribution: "person_specific",
      exactQuotePersonValueBound: true,
    });
    const invalidEmail = scoreAttribution({
      ...base,
      isValidEmail: false,
      exactClaimObserved: true,
      targetPersonEvidence: true,
      contactAttribution: "person_specific",
      exactQuotePersonValueBound: true,
    });

    expect(missingQuote.attributed).toBe(false);
    expect(invalidEmail.attributed).toBe(false);
    expect(invalidEmail.dimensions.validation).toBe(0);
  });

  it("does not emit a numeric score or threshold when no model confidence exists", () => {
    const result = scoreAttribution({ ...base });
    expect(result.score).toBeNull();
    expect(result).not.toHaveProperty("threshold");
    expect(result.explanation).toContain("numeric score unassessed");
  });
});
