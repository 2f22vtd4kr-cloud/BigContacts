import { describe, expect, it } from "vitest";
import { reconcileContactCandidates } from "../lib/contact-candidate";

describe("contact candidate reconciliation", () => {
  it("keeps an organization contact out of the personal promotion state", () => {
    const funnel = reconcileContactCandidates([
      {
        vectorType: "email",
        value: "info@example.org",
        source: "Perplexity",
        sourceUrl: "https://example.org/contact",
        details: { scope: "organization" },
      },
      {
        vectorType: "email",
        value: "info@example.org",
        source: "Gemini",
        sourceUrl: "https://news.example.net/example",
        details: { scope: "organization" },
      },
    ]);
    expect(funnel.organizationOnly).toBe(1);
    expect(funnel.candidates[0]?.state).toBe("source_linked");
    expect(funnel.candidates[0]?.state).not.toBe("verified_direct_route");
  });

  it("requires independent canonical domains, not provider agreement", () => {
    const samePublisher = reconcileContactCandidates([
      {
        vectorType: "email",
        value: "jane@example.org",
        source: "Perplexity",
        sourceUrl: "https://www.example.org/profile?utm_source=x",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
      {
        vectorType: "email",
        value: "JANE@example.org",
        source: "Gemini",
        sourceUrl: "https://example.org/profile#bio",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
    ]);
    expect(samePublisher.independentSourceDomains).toBe(1);
    expect(samePublisher.candidates[0]?.state).toBe("attribution_review");

    const independent = reconcileContactCandidates([
      {
        vectorType: "email",
        value: "jane@example.org",
        source: "Perplexity",
        sourceUrl: "https://example.org/profile",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
      {
        vectorType: "email",
        value: "jane@example.org",
        source: "Gemini",
        sourceUrl: "https://conference.example.net/speaker",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
    ]);
    expect(independent.candidates[0]?.state).toBe("verified_direct_route");
    expect(independent.candidates[0]?.sourceDomains).toHaveLength(2);
  });

  it("does not call independent publishers a same-publisher conflict", () => {
    const funnel = reconcileContactCandidates([
      {
        vectorType: "phone",
        value: "+1 212 555 0101",
        source: "official",
        sourceUrl: "https://example.org/team",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
      {
        vectorType: "phone",
        value: "+1 212 555 0199",
        source: "press",
        sourceUrl: "https://press.example.net/interview",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
    ]);
    expect(funnel.candidates).toHaveLength(2);
    expect(funnel.conflicted).toBe(0);
    expect(funnel.candidates.every((candidate) => candidate.conflictCount === 0)).toBe(true);
  });

  it("preserves same-publisher contradictory values as conflicts", () => {
    const funnel = reconcileContactCandidates([
      {
        vectorType: "phone",
        value: "+1 212 555 0101",
        source: "official",
        sourceUrl: "https://example.org/team",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
      {
        vectorType: "phone",
        value: "+1 212 555 0199",
        source: "official",
        sourceUrl: "https://example.org/contact",
        details: { scope: "target_person", personName: "Jane Doe" },
      },
    ]);
    expect(funnel.conflicted).toBe(2);
    expect(funnel.candidates.every((candidate) => candidate.conflictCount === 1)).toBe(true);
  });
});