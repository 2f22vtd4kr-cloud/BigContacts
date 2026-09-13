import { describe, expect, it } from "vitest";
import { findingsToContactEvidence, findingsToBureauContacts } from "../lib/bureau-agentic-pass";
import { findingsToContacts } from "../lib/target-contact-agent";
import type { AgenticFinding, AgenticTrajectoryRecord } from "../lib/agentic-web-research";

const source = "https://example.com/contact";
const trajectory = [`step1: visit ${source} execution=success observed=${source}`];
function observedRecord(observation: string): AgenticTrajectoryRecord {
  return {
    turn: 1,
    model: "test-investigator",
    action: "visit",
    args: { url: source },
    execution: "success",
    observation,
    observedUrls: [source],
    findings: [],
  };
}

describe("agentic evidence scope boundary", () => {
  it("keeps explicit candidate findings personal", () => {
    const finding: AgenticFinding = {
      vectorType: "email",
      value: "jane@example.com",
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      sourceUrls: [source],
      note: "named email on source",
    };
    const records = [observedRecord("Jane Example — Founder — jane@example.com")];

    expect(findingsToBureauContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
      promote: false,
    });
    expect(findingsToContactEvidence([finding], trajectory, records)[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
    expect(findingsToContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
  });

  it("marks an explicit investigator promotion for card application", () => {
    const finding: AgenticFinding = {
      vectorType: "email",
      value: "jane@example.com",
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      sourceUrls: [source],
      note: "named email on source",
      promotionDecision: "promote",
      promotionReason: "Exact named contact on the visited company page.",
    };
    const records = [observedRecord("Jane Example — Founder — jane@example.com")];

    expect(findingsToBureauContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      promote: true,
    });
  });

  it("turns unknown scope into organization scope instead of inheriting the target", () => {
    const finding: AgenticFinding = {
      vectorType: "email",
      value: "info@example.com",
      personName: null,
      role: null,
      scope: "unknown" as AgenticFinding["scope"],
      sourceUrls: [source],
      note: "generic public mailbox",
    };
    const records = [observedRecord("Contact email: info@example.com")];

    expect(findingsToBureauContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      scope: "organization",
      personName: null,
      promote: false,
    });
    expect(findingsToContactEvidence([finding], trajectory, records)[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
    expect(findingsToContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
  });
});
