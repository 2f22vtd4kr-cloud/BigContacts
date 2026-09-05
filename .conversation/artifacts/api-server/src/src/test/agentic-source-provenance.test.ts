import { describe, expect, it } from "vitest";
import { findingsToBureauContacts, sourceBackedAgenticFindings } from "../lib/bureau-agentic-pass";
import { findingsToContacts, sourceBackedFindings } from "../lib/target-contact-agent";
import type { AgenticFinding } from "../lib/agentic-web-research";

const finding = (overrides: Partial<AgenticFinding> = {}): AgenticFinding => ({
  vectorType: "email",
  value: "jane@example.com",
  personName: "Jane Example",
  role: "Founder",
  scope: "candidate",
  sourceUrls: ["https://example.com/team/jane"],
  note: "named on the team page",
  ...overrides,
});

describe("agentic source provenance", () => {
  it("drops contact findings without an exact HTTP(S) source", () => {
    const raw = [
      finding({ sourceUrls: [] }),
      finding({ sourceUrls: ["google-search://jane@example.com"] }),
      finding(),
    ];
    expect(sourceBackedFindings(raw)).toHaveLength(1);
    expect(sourceBackedAgenticFindings(raw)).toHaveLength(1);
  });

  it("does not turn a missing source into a synthetic search URL", () => {
    const contacts = findingsToContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        personName: "Jane Example",
        role: "Founder",
        sourceUrls: [],
        note: "model claim without source",
      },
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        personName: "Jane Example",
        role: "Founder",
        sourceUrls: ["https://example.com/team/jane"],
        note: "source-backed claim",
      },
    ], "Jane Example");

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.sourceUrls).toEqual(["https://example.com/team/jane"]);
  });

  it("keeps organization scope organization-scoped", () => {
    const contacts = findingsToBureauContacts([
      finding({
        value: "info@example.com",
        personName: "Jane Example",
        scope: "organization",
        sourceUrls: ["https://example.com/contact"],
      }),
    ], "Jane Example");

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.scope).toBe("organization");
    expect(contacts[0]?.personName).toBeNull();
  });
});
