import { describe, expect, it } from "vitest";
import {
  computeContactConfidence,
  computeContactOutcome,
  hasMeaningfulDirectContact,
  isHeuristicEmailEvidence,
  isPersonalContactOutcome,
} from "../lib/contact-confidence";

describe("durable Investigator contact attribution", () => {
  it("counts only an explicitly verified model-attributed route as personal", () => {
    expect(isPersonalContactOutcome("direct_contact_candidate")).toBe(false);
    expect(isPersonalContactOutcome("direct_contact_verified")).toBe(true);
    expect(isPersonalContactOutcome("organization_contact")).toBe(false);
  });

  it("recognizes an exactly value-bound person-specific promotion even for an unusual mailbox local part", () => {
    const entity = {
      type: "HNWI",
      email: "info@official-example.org",
      validatedDirectContact: true,
      metadata: {
        agenticContactProvenance: {
          email: {
            value: "info@official-example.org",
            personName: "Jane Example",
            contactAttribution: "person_specific",
            exactQuote: "Jane Example — personal contact: info@official-example.org",
            identityAssessment: "same_person",
            identityRationale: "The fetched team page explicitly labels this as Jane Example’s contact.",
            sourceUrls: ["https://official-example.org/team"],
            jobId: "atlas-job-1",
          },
        },
      },
    };
    expect(computeContactOutcome(entity)).toBe("direct_contact_verified");
    expect(computeContactConfidence(entity)).toBe(100);
    expect(hasMeaningfulDirectContact(entity)).toBe(true);
  });

  it("keeps an explicitly model-attributed shared inbox organizational", () => {
    const entity = {
      type: "HNWI",
      email: "info@official-example.org",
      metadata: {
        agenticContactProvenance: {
          email: {
            value: "info@official-example.org",
            personName: null,
            contactAttribution: "shared_inbox",
            exactQuote: "Contact: info@official-example.org",
            identityAssessment: "unresolved",
            sourceUrls: ["https://official-example.org/contact"],
            jobId: "atlas-job-2",
          },
        },
      },
    };
    expect(computeContactOutcome(entity)).toBe("organization_contact");
    expect(hasMeaningfulDirectContact(entity)).toBe(false);
  });

  it("does not apply model attribution to a different current value", () => {
    const entity = {
      type: "HNWI",
      email: "jane@official-example.org",
      metadata: {
        agenticContactProvenance: {
          email: {
            value: "info@official-example.org",
            contactAttribution: "person_specific",
            exactQuote: "Jane Example — info@official-example.org",
            identityAssessment: "same_person",
            sourceUrls: ["https://official-example.org/team"],
            jobId: "atlas-job-3",
          },
        },
      },
    };
    expect(computeContactOutcome(entity)).toBe("evidence_only");
  });
});

describe("value-bound selected email provenance", () => {
  it("does not let an unselected row's aggregate heuristic metadata taint the selected primary email", () => {
    const metadata = {
      enrichmentSources: ["pattern-generated"],
      selectedContactProvenance: {
        email: { value: "Jane@OfficialCompany.com", heuristic: false },
      },
    };

    expect(isHeuristicEmailEvidence({
      email: "jane@officialcompany.com",
      // This unselected source label is stale; the value-bound selected provenance wins.
      emailSource: "pattern-generated",
      metadata,
    })).toBe(false);
    expect(computeContactConfidence({
      email: "jane@officialcompany.com",
      emailSource: "pattern-generated",
      metadata,
    })).toBe(0);
    expect(hasMeaningfulDirectContact({
      email: "jane@officialcompany.com",
      emailSource: "pattern-generated",
      metadata,
    })).toBe(false);
    expect(computeContactOutcome({
      email: "jane@officialcompany.com",
      emailSource: "pattern-generated",
      metadata,
    })).toBe("evidence_only");
  });

  it("keeps a selected heuristic email review-only when its value matches the provenance record", () => {
    const metadata = {
      enrichmentSources: ["profile-import"],
      selectedContactProvenance: {
        email: { value: "jane@targetcompany.com", heuristic: true },
      },
    };

    expect(isHeuristicEmailEvidence({
      email: "JANE@targetcompany.com",
      metadata,
    })).toBe(true);
    expect(computeContactConfidence({
      email: "jane@targetcompany.com",
      metadata,
    })).toBe(0);
    expect(hasMeaningfulDirectContact({
      email: "jane@targetcompany.com",
      metadata,
    })).toBe(false);
    expect(computeContactOutcome({
      email: "jane@targetcompany.com",
      metadata,
    })).toBe("evidence_only");
  });

  it("uses legacy aggregate source flags when the explicit value binding does not match", () => {
    expect(isHeuristicEmailEvidence({
      email: "jane@officialcompany.com",
      metadata: {
        enrichmentSources: ["pattern-generated"],
        selectedContactProvenance: {
          email: { value: "someone-else@officialcompany.com", heuristic: false },
        },
      },
    })).toBe(true);
  });
});
