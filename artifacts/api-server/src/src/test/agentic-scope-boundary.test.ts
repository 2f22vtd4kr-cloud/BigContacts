import { describe, expect, it } from "vitest";
import { findingsToContactEvidence, findingsToBureauContacts } from "../lib/bureau-agentic-pass";
import { findingsToContacts } from "../lib/target-contact-agent";

const source = "https://example.com/contact";

describe("agentic evidence scope boundary", () => {
  it("keeps explicit candidate findings personal", () => {
    const finding = {
      vectorType: "email",
      value: "jane@example.com",
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      sourceUrls: [source],
      note: "named email on source",
    };

    expect(findingsToBureauContacts([finding], "Jane Example")[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
    expect(findingsToContactEvidence([finding])[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
    expect(findingsToContacts([finding], "Jane Example")[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
  });

  it("turns unknown scope into organization scope instead of inheriting the target", () => {
    const finding = {
      vectorType: "email",
      value: "info@example.com",
      personName: null,
      role: null,
      scope: "unknown",
      sourceUrls: [source],
      note: "generic public mailbox",
    };

    expect(findingsToBureauContacts([finding], "Jane Example")[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
    expect(findingsToContactEvidence([finding])[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
    expect(findingsToContacts([finding], "Jane Example")[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
  });
});
