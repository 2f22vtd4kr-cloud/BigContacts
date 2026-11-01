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
    expect(format.schema?.properties).not.toHaveProperty("report");
    expect(format.schema?.properties).not.toHaveProperty("candidates");
    expect(format.schema?.properties).not.toHaveProperty("nextDirections");
    expect(format.schema?.required).not.toContain("report");
    expect(format.schema?.required).not.toContain("candidates");
    expect(format.schema?.required).not.toContain("nextDirections");
  });

  it("parses only control guidance and never accepts model-generated candidate records", () => {
    const result = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: investigator,
    }), [investigator]);
    expect(result.investigatorLlm).toBe(investigator);
    expect(result.report).toContain("No source observations exist yet");
    expect(result.candidates).toEqual([]);
    expect(result.nextDirections).toEqual([]);

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
    expect(prompt).toContain("Do not name, rank, or privilege a particular registry");
    expect(prompt).toContain("select an available Investigator execution capability");
    expect(prompt).not.toContain("Geographic premise");
    expect(prompt).not.toContain("Global");
    expect(prompt).toContain("all currently enabled registries/asset registers and public-web search are equal, neutral options");
    expect(prompt).not.toContain("Companies House");
    expect(prompt).not.toContain("sourceUrls");
    expect(prompt).not.toContain("contactEvidence");
  });
});
