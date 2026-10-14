import { describe, expect, it } from "vitest";
import { formatBossDirectedObjective, validateResearchObjective } from "./research-objective";

describe("research objective validation", () => {
  it("accepts an epistemic research question without prescribing a tool or provider", () => {
    expect(validateResearchObjective("Resolve whether the observed executive is the same person as the founder named in the latest filing.")).toEqual({
      valid: true,
      direction: "Resolve whether the observed executive is the same person as the founder named in the latest filing.",
    });
  });

  it("allows provider/tool names as research subjects rather than treating every mention as a directive", () => {
    expect(validateResearchObjective("Investigate Groq's corporate structure, ownership, and leadership history.").valid).toBe(true);
    expect(validateResearchObjective("Assess the public history of the Maigret project and its maintainers.").valid).toBe(true);
  });

  it("rejects provider/tool directives and concrete URLs", () => {
    expect(validateResearchObjective("Use Groq to search Serper for the person.").valid).toBe(false);
    expect(validateResearchObjective("Search using Serper to find the person's email.").valid).toBe(false);
    expect(validateResearchObjective("Switch to an alternative OSINT provider (e.g., SerpAPI or a self-hosted scraper) and redesign discovery queries for private mid-market sectors and regions.")).toEqual({
      valid: false,
      reason: "Research redirect attempted to prescribe an Investigator provider or tool.",
    });
    expect(validateResearchObjective("Investigate public reports comparing alternative OSINT providers.").valid).toBe(true);
    expect(validateResearchObjective("Visit https://example.com/profile and verify the role.").valid).toBe(false);
    expect(validateResearchObjective("Open www.example.com and inspect it.").valid).toBe(false);
  });

  it("rejects literal search-engine query operators in a research direction", () => {
    expect(validateResearchObjective('Find UK boutique technology private equity partners. Example query: "site:*.co.uk technology private equity partner UK"')).toEqual({
      valid: false,
      reason: "Research redirect attempted to prescribe a search-engine query operator.",
    });
  });


  it("formats Boss directions with real prompt line breaks", () => {
    expect(formatBossDirectedObjective("Base objective", "Resolve the filing discrepancy.")).toBe(
      "Base objective\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\nResolve the filing discrepancy.",
    );
  });

  it("rejects an empty redirect", () => {
    expect(validateResearchObjective("   ")).toEqual({
      valid: false,
      reason: "Research redirect contained no research objective.",
    });
  });
});
