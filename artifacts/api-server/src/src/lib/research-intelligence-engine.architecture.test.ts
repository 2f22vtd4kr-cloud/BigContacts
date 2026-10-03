import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "./research-intelligence-engine";

describe("Research intelligence attribution architecture", () => {
  it("preserves person-scoped attribution and frontier state", () => {
    const engine = new ResearchIntelligenceEngine({
      executionId: "test-contact-scope",
      target: "Target Person",
      objective: "Find attributable public contact routes",
    });

    engine.recordAction({
      turn: 1,
      action: "visit",
      execution: "success",
      observation: "Alice Person email alice@example.org",
      urls: ["https://example.org/alice"],
      findings: [{
        vectorType: "email",
        value: "shared@example.org",
        personName: "Alice Person",
        role: "Director",
        sourceUrls: ["https://example.org/alice"],
        note: "Published on Alice's profile",
      }],
    });
    engine.recordAction({
      turn: 2,
      action: "visit",
      execution: "success",
      observation: "Bob Person email shared@example.org",
      urls: ["https://other.example/bob"],
      findings: [{
        vectorType: "email",
        value: "shared@example.org",
        personName: "Bob Person",
        role: "Director",
        sourceUrls: ["https://other.example/bob"],
        note: "Published on Bob's profile",
      }],
    });

    const context = engine.buildContext();
    const routes = context.contacts.filter((contact) => contact.value === "shared@example.org");
    expect(routes).toHaveLength(2);
    expect(new Set(routes.map((contact) => contact.personName))).toEqual(new Set(["Alice Person", "Bob Person"]));
    expect(context.facts.some((fact) => fact.claim.startsWith("Alice Person email shared@example.org"))).toBe(true);
    expect(context.facts.some((fact) => fact.claim.startsWith("Bob Person email shared@example.org"))).toBe(true);
    expect(typeof context.sourceIndependence).toBe("number");
    expect(["explore", "verify", "falsify", "contact"]).toContain(context.frontier.nextMovePriority);
  });
});
