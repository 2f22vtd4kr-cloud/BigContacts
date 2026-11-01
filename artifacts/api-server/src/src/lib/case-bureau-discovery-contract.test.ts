import { describe, expect, it } from "vitest";
import {
  buildBossDiscoveryResponseFormat,
  buildGroqBossDiscoveryPrompt,
  parseBossDiscoveryResponse,
} from "./case-bureau";
import type { InvestigatorCapability } from "./investigator-capability-registry";

const investigator = "groq-investigator-1" as InvestigatorCapability;

describe("source-grounded Boss opening contract", () => {
  it("does not expose candidate URLs or contact evidence in the Boss output schema", () => {
    const format = buildBossDiscoveryResponseFormat([investigator]) as {
      schema?: { properties?: Record<string, unknown>; required?: string[] };
    };
    expect(format.schema?.properties).not.toHaveProperty("candidates");
    expect(format.schema?.required).not.toContain("candidates");
  });

  it("parses only control guidance and never accepts model-generated candidate records", () => {
    const result = parseBossDiscoveryResponse(JSON.stringify({
      report: "No source observations yet; authorize one discovery action.",
      investigatorLlm: investigator,
      nextDirections: ["Begin one target-first search using any enabled registry or public-web capability."],
      uncertainties: ["A concrete target must come from an observed result."],
    }), [investigator]);
    expect(result.investigatorLlm).toBe(investigator);
    expect(result.candidates).toEqual([]);

    const fabricated = parseBossDiscoveryResponse(JSON.stringify({
      report: "James Watt is a lead.",
      investigatorLlm: investigator,
      candidates: [{
        name: "James Watt",
        type: "person",
        relevance: "Founder",
        reachability: "Company contact form",
        sourceUrls: ["https://example.test/profile"],
        contactEvidence: [],
      }],
      nextDirections: ["Check the named registry."],
      uncertainties: [],
    }), [investigator]);
    expect(fabricated.investigatorLlm).toBeNull();
    expect(fabricated.candidates).toEqual([]);
  });

  it("instructs Boss to authorize discovery without inventing a target, source, or jurisdiction", () => {
    const prompt = buildGroqBossDiscoveryPrompt({
      objective: "Find source-backed business owners and practical professional routes.",
      motivation: "Identify useful private-company leads.",
    }, [investigator]);
    expect(prompt).toContain("Do not claim to have discovered, checked, fetched, or verified");
    expect(prompt).toContain("one immediate target-first discovery action");
    expect(prompt).toContain("all currently enabled registries/asset registers and public-web search are equal, neutral options");
    expect(prompt).not.toContain("Companies House");
    expect(prompt).not.toContain("sourceUrls");
    expect(prompt).not.toContain("contactEvidence");
  });
});
