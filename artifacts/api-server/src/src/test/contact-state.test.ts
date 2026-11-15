import { describe, expect, it } from "vitest";
import { computeContactState } from "../lib/contact-confidence";

function personRouteMetadata(field: "email" | "phone", value: string, personName: string) {
  return {
    agenticContactProvenance: {
      [field]: {
        value, personName, contactAttribution: "professional_person_specific",
        exactQuote: `${personName} published professional contact: ${value}`,
        identityAssessment: "same_person",
        identityRationale: "The same fetched public profile explicitly binds this person to the route.",
        sourceUrls: ["https://example.org/public-profile"],
        jobId: "contact-state-test-job",
      },
    },
  };
}

describe("contact-state reconciliation", () => {
  it("keeps an organization route out of personal access", () => {
    const state = computeContactState({
      type: "Corporation",
      email: "founder@company.example",
      phone: "+14155552671",
      phoneSource: "CompaniesHouse-Phone",
    });
    expect(state.contactConfidence).toBe(0);
    expect(state.contactOutcome).toBe("evidence_only");
    expect(state.isHot).toBe(false);
  });

  it("keeps unknown-source corporate vectors out of personal access", () => {
    const state = computeContactState({
      type: "Corporation",
      email: "owner@company.example",
      phone: "+14155552671",
      validatedDirectContact: true,
    });
    expect(state.contactConfidence).toBe(0);
    expect(state.contactOutcome).toBe("evidence_only");
    expect(state.isHot).toBe(false);
  });

  it("retains published professional contact routes for Gatekeeper people as candidates", () => {
    const state = computeContactState({
      type: "Gatekeeper",
      email: "sigurd@oslofamilyoffice.com",
      phone: "+47 91 33 22 11",
      phoneSource: "Oslo Family Office — published professional route",
      metadata: personRouteMetadata("phone", "+47 91 33 22 11", "Sigurd Example"),
    });
    expect(state.contactOutcome).toBe("direct_contact_candidate");
    expect(state.contactConfidence).toBeGreaterThan(0);
    expect(state.isHot).toBe(false);
  });

  it("does not mark a review-only candidate hot", () => {
    const state = computeContactState({
      type: "HNWI",
      email: "person@real-domain.co.uk",
      metadata: personRouteMetadata("email", "person@real-domain.co.uk", "Jane Example"),
    });
    expect(state.contactOutcome).toBe("direct_contact_candidate");
    expect(state.isHot).toBe(false);
  });

  it("requires explicit validation before a direct route becomes hot", () => {
    const state = computeContactState({
      type: "HNWI",
      email: "person@real-domain.co.uk",
      metadata: personRouteMetadata("email", "person@real-domain.co.uk", "Jane Example"),
      validatedDirectContact: true,
    });
    expect(state.contactOutcome).toBe("direct_contact_verified");
    expect(state.isHot).toBe(true);
  });
});