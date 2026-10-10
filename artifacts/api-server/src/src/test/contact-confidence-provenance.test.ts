import { describe, expect, it } from "vitest";
import {
  computeContactConfidence,
  computeContactOutcome,
  hasMeaningfulDirectContact,
  isHeuristicEmailEvidence,
} from "../lib/contact-confidence";

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
    })).toBe(35);
    expect(hasMeaningfulDirectContact({
      email: "jane@officialcompany.com",
      emailSource: "pattern-generated",
      metadata,
    })).toBe(true);
    expect(computeContactOutcome({
      email: "jane@officialcompany.com",
      emailSource: "pattern-generated",
      metadata,
    })).toBe("direct_contact_candidate");
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
