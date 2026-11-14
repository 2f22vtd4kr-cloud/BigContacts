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

  it("does not let a generic local-part heuristic override explicit model attribution backed by an exact source claim", () => {
    const result = scoreAttribution({
      ...base,
      exactClaimObserved: true,
      targetPersonEvidence: true,
    });

    expect(result.attributed).toBe(true);
    expect(result.dimensions.validation).toBe(0.78);
    expect(result.explanation).toContain("model-attributed person-specific route");
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
    });

    expect(missingQuote.attributed).toBe(false);
    expect(invalidEmail.attributed).toBe(false);
  });
});
