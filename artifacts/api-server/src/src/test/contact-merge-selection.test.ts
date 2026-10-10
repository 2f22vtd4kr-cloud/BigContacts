import { describe, expect, it } from "vitest";
import { computeContactOutcome, hasMeaningfulDirectContact, isHeuristicEmailEvidence } from "../lib/contact-confidence";
import { selectMergedContactEvidence } from "../lib/contact-merge-selection";

describe("safe entity merge contact-source binding", () => {
  it("does not let an unselected target row's heuristic email source taint the primary email", () => {
    const selected = selectMergedContactEvidence(
      { email: "jane@officialcompany.com", metadata: JSON.stringify({ profileVerified: true }) },
      { email: "jane@targetcompany.com", metadata: JSON.stringify({ enrichmentSources: ["pattern-generated"] }) },
    );

    expect(selected.email).toBe("jane@officialcompany.com");
    expect(selected.emailMetadata).toBe(JSON.stringify({ profileVerified: true }));
    expect(isHeuristicEmailEvidence({ email: selected.email, metadata: selected.emailMetadata })).toBe(false);
  });

  it("retains heuristic provenance when the selected email comes from the target row", () => {
    const selected = selectMergedContactEvidence(
      { email: null, metadata: JSON.stringify({ unrelated: true }) },
      { email: "jane@targetcompany.com", metadata: JSON.stringify({ enrichmentSources: ["pattern-generated"] }) },
    );

    expect(selected.email).toBe("jane@targetcompany.com");
    expect(isHeuristicEmailEvidence({ email: selected.email, metadata: selected.emailMetadata })).toBe(true);
  });

  it("uses the phone source belonging to the row whose phone was selected", () => {
    const selected = selectMergedContactEvidence(
      { phone: null, phoneSource: "EDGAR-Issuer-Phone" },
      { phone: "+14155550123", phoneSource: "official-person-profile" },
    );

    expect(selected.phone).toBe("+14155550123");
    expect(selected.phoneSource).toBe("official-person-profile");
    expect(computeContactOutcome({ type: "HNWI", phone: selected.phone, phoneSource: selected.phoneSource })).toBe("direct_contact_candidate");
    expect(hasMeaningfulDirectContact({ type: "HNWI", phone: selected.phone, phoneSource: selected.phoneSource })).toBe(true);
  });
});
