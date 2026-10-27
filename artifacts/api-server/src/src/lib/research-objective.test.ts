import { describe, expect, it } from "vitest";
import { formatBossDirectedObjective, resolveApprovedOpeningDirection, resolveBossDirectedDiscoveryObjective, restorePersistedDiscoveryObjective, validateResearchObjective } from "./research-objective";

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


  it("rejects pivots that leave their research scope as an unresolved placeholder", () => {
    const genericPivot = "Shift to a sector-specific, geography-focused discovery approach (e.g., identify private mid-size firms in a chosen region and locate their registered owners via public corporate registries).";
    expect(validateResearchObjective(genericPivot)).toEqual({
      valid: false,
      reason: "Research redirect leaves its subject or geography as an unresolved placeholder.",
    });
    expect(validateResearchObjective("Investigate private manufacturing companies in Austin, Texas through official state business registries.").valid).toBe(true);
  });

  it("formats Boss directions with real prompt line breaks", () => {
    expect(formatBossDirectedObjective("Base objective", "Resolve the filing discrepancy.")).toBe(
      "Base objective\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\nResolve the filing discrepancy.",
    );
  });

  it("preserves the approved opening scope across durable resume and directionless continuation", () => {
    const baseObjective = "Discover credible owners and operators in privately held businesses.";
    const direction = "Investigate privately held renewable-energy firms in the United Kingdom using public company ownership filings.";
    const activeObjective = formatBossDirectedObjective(baseObjective, direction);

    const restored = restorePersistedDiscoveryObjective({
      defaultBaseObjective: baseObjective,
      persistedBaseObjective: baseObjective,
      persistedActiveObjective: activeObjective,
    });

    expect(restored).toEqual({
      baseObjective,
      activeObjective,
      restoredPivot: true,
    });
    expect(resolveBossDirectedDiscoveryObjective({
      action: "continue_discovery",
      baseObjective,
      currentObjective: restored.activeObjective,
      direction: null,
    })).toEqual({
      valid: true,
      objective: activeObjective,
      direction: activeObjective,
      reusedCurrentObjective: true,
    });
  });

  it("requires an explicit Boss direction before reusing a scope after a no-action episode", () => {
    const baseObjective = "Discover credible owners and operators in privately held businesses.";
    const currentObjective = formatBossDirectedObjective(
      baseObjective,
      "Investigate privately held renewable-energy firms in the United Kingdom using public company ownership filings.",
    );
    expect(resolveBossDirectedDiscoveryObjective({
      action: "continue_discovery",
      baseObjective,
      currentObjective,
      direction: null,
      requireExplicitDirection: true,
    })).toEqual({
      valid: false,
      reason: "A directionless continuation cannot reuse the active scope after the preceding Investigator episode executed no external research action; provide a structured direction or stop.",
    });
    expect(resolveBossDirectedDiscoveryObjective({
      action: "continue_discovery",
      baseObjective,
      currentObjective,
      direction: "Refine the United Kingdom renewable-energy ownership question using publicly accessible company filings.",
      requireExplicitDirection: true,
    })).toMatchObject({ valid: true, reusedCurrentObjective: false });
  });

  it("accepts an explicit natural-language proceed decision from Right-hand", () => {
    const direction = "Investigate privately held renewable-energy Mittelstand firms in Bavaria and identify public ownership records.";
    expect(resolveApprovedOpeningDirection({
      rightHandDecision: "Proceed with the Bavarian renewable-energy Mittelstand search, but note limited shareholder visibility.",
      firstDirection: direction,
    })).toEqual({ status: "approved", direction, reason: null });
  });

  it("does not mistake the observed Run 07 narrative review for explicit approval", () => {
    const direction = "Search the Ohio Secretary of State business entity database for family-owned manufacturing companies with disclosed shareholder lists.";
    const observedRun07Review = "Boss's proposed search strategy aligns with the objective, but refine criteria to ensure wealth potential and viable contact routes.";
    expect(resolveApprovedOpeningDirection({ rightHandDecision: observedRun07Review, firstDirection: direction }).status).toBe("not_approved");
    expect(resolveApprovedOpeningDirection({ rightHandDecision: "approve", firstDirection: direction })).toEqual({ status: "approved", direction, reason: null });
    expect(resolveApprovedOpeningDirection({ rightHandDecision: "reject", firstDirection: direction }).status).toBe("not_approved");
  });

  it("fails closed for explicit refusal or noncommittal Right-hand wording", () => {
    const direction = "Investigate privately held renewable-energy Mittelstand firms in Bavaria.";
    for (const decision of [
      "Do not approve this direction.",
      "Reject this direction; the ownership route is unsupported.",
      "I don't recommend proceeding with this scope.",
      "This could be useful, but I have not approved it.",
    ]) {
      expect(resolveApprovedOpeningDirection({ rightHandDecision: decision, firstDirection: direction }).status).toBe("not_approved");
    }
  });

  it("rejects an empty redirect", () => {
    expect(validateResearchObjective("   ")).toEqual({
      valid: false,
      reason: "Research redirect contained no research objective.",
    });
  });
});
