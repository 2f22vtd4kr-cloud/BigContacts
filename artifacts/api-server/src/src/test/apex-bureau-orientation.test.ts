import { describe, expect, it } from "vitest";
import { APEX_BUREAU_PLAYBOOK } from "../lib/apex-bureau-playbook";
import {
  APEX_WHAT_IS_ATLAS,
  apexInvestigatorSystemCore,
  apexOrientationCompact,
  apexOrientationFor,
} from "../lib/apex-bureau-orientation";

describe("objective-led institutional orientation", () => {
  it("loads the full playbook for control roles without inflating the Investigator prompt", () => {
    expect(APEX_BUREAU_PLAYBOOK).toContain("PHASE 1 — DISCOVERY");
    expect(APEX_BUREAU_PLAYBOOK).toContain("SPECIALIST TOOL SELECTION — CAPABILITY, NOT CHECKLIST");
    expect(APEX_BUREAU_PLAYBOOK).toContain("ITERATIVE FOLLOW-UP");
    expect(APEX_BUREAU_PLAYBOOK).toContain("COMMUNITY OBSERVATION SOURCES");
    expect(APEX_BUREAU_PLAYBOOK).toContain("Virtual Globetrotting and similar community pages are a community-observation source class");
    expect(APEX_BUREAU_PLAYBOOK).toContain("original observation date and retrieval timestamp");
    expect(APEX_BUREAU_PLAYBOOK).toContain("This is guidance, not a workflow engine.");

    const boss = apexOrientationCompact("boss");
    const rightHand = apexOrientationCompact("right_hand");
    const investigator = apexOrientationCompact("investigator");
    expect(boss).toContain("MASTER REFERENCE — APEX ATLAS BUREAU PLAYBOOK");
    expect(boss).toContain("SpiderFoot");
    expect(rightHand).toContain("MASTER REFERENCE — APEX ATLAS BUREAU PLAYBOOK");
    expect(rightHand).toContain("Holehe");
    expect(investigator).not.toContain("MASTER REFERENCE — APEX ATLAS BUREAU PLAYBOOK");
  });

  it("treats HNWI as an optional classification rather than the universal mission", () => {
    expect(APEX_WHAT_IS_ATLAS).toContain("people, operating companies, and assets");
    expect(APEX_WHAT_IS_ATLAS).toContain("HNWI is an optional classification");
    expect(APEX_WHAT_IS_ATLAS).toContain("do not impose wealth, ownership, or investor qualification unless the objective requires it");
    expect(APEX_WHAT_IS_ATLAS).toContain("Let the human objective determine which people, operating companies, assets, relationships or events matter");
    expect(APEX_WHAT_IS_ATLAS).not.toContain("GOAL: Find real, publicly documented contact routes to high-net-worth individuals");
  });

  it("keeps the shared Boss and Right-hand orientation objective-led", () => {
    for (const role of ["boss", "right_hand", "investigator", "dig_agent"] as const) {
      const prompt = apexOrientationCompact(role);
      expect(prompt).toContain("The exact human objective and explicit constraints govern");
      expect(prompt).toMatch(/(?:HNWI is optional; do not impose wealth, ownership or qualification criteria unless requested by the human objective|do not impose wealth, ownership or investor qualification criteria unless the human objective requires them)/i);
      expect(prompt).toMatch(/do not impose extra (?:wealth\/ownership or )?qualification criteria unless requested|do not impose wealth|no wealth\/ownership criteria may be imposed unless requested/i);
    }
  });

  it("does not impose person-first discovery on company- or asset-led objectives", () => {
    const investigator = apexOrientationFor("investigator");
    const digAgent = apexOrientationFor("dig_agent");
    expect(investigator).toContain("For B2B assignments, verify current decision-maker role and company connection");
    expect(investigator).not.toContain("role presence is required for review-card admission");
    expect(digAgent).toContain("the human objective determines the target class");
    expect(digAgent).toMatch(/Do not impose person-first discovery when the objective is company- or asset-led/i);
  });

  it("does not apply deterministic fame, ranking, publisher or route eligibility priors", () => {
    expect(APEX_WHAT_IS_ATLAS).toContain("Fame, wealth, title, prestige, company size, visibility, and listing status are contextual signals, never automatic qualifications or exclusions");
    expect(APEX_WHAT_IS_ATLAS).toContain("no fixed score, domain fit, name proximity or route category may veto an explicit exact-quote-backed model attribution");
    expect(APEX_WHAT_IS_ATLAS).not.toContain("globally famous/household-name public figures");
    expect(APEX_WHAT_IS_ATLAS).not.toContain("Inc. 5000/fast-growth/unicorn rankings alone");
    for (const role of ["boss", "right_hand", "dig_agent"] as const) {
      const prompt = apexOrientationCompact(role);
      expect(prompt).toMatch(/(?:Fame, wealth, seniority, title, prestige, company size, visibility, listing status, ranking, sector, geography, language and source class are contextual signals, not eligibility gates|Fame, wealth, title, prestige, company size, visibility, and listing status are contextual signals, not eligibility gates; seniority, ranking badges, sector, geography, language and route categories are context, not gates)/i);
      expect(prompt).not.toContain("globally famous/household-name");
      expect(prompt).not.toContain("Ranking-only mentions are leads, not qualified targets");
      expect(prompt).not.toContain("Generic corporate, press or investor-relations channels do not qualify as individual access");
      expect(prompt).not.toContain("Tim Cook");
    }
    expect(apexInvestigatorSystemCore()).toContain("Fame, wealth, title, size, ranking, sector, geography, language and source class are context, not gates.");
    expect(apexInvestigatorSystemCore()).not.toContain("PERSON REALISM");
    expect(apexOrientationCompact("boss")).not.toContain("quota fillers");
  });

  it("preserves explicit geography while allowing evidence-led jurisdiction and sector hypotheses", () => {
    const core = apexInvestigatorSystemCore();
    expect(APEX_WHAT_IS_ATLAS).toContain("when geography is open, propose evidence-led sector/geography hypotheses to Boss rather than inventing a preferred region.");
    expect(core).not.toContain("Never infer or introduce a geography from examples or model memory");
    expect(core).toContain("No unrequested criteria or keyword/name heuristics; generic nouns are not queries.");
    expect(APEX_BUREAU_PLAYBOOK).toContain("the Investigator may form a jurisdiction hypothesis from actual source observations and propose a strategic pivot to Boss");
    expect(APEX_BUREAU_PLAYBOOK).not.toContain("Never infer or introduce a jurisdiction from examples or model memory");
    expect(APEX_BUREAU_PLAYBOOK).toContain("there is no fixed search-count cap or per-case search quota");
    expect(APEX_BUREAU_PLAYBOOK).toContain("Search count is telemetry, not progress or an admission rule.");
    expect(APEX_BUREAU_PLAYBOOK).toContain("do not force a mixed-source batch or registry-first order");
    expect(APEX_BUREAU_PLAYBOOK).toContain("one or more objective-fit leads can be handed to Boss when useful");
    expect(APEX_BUREAU_PLAYBOOK).not.toContain("inspect one useful in-scope lead before another search");
    expect(core.split("\n").length).toBeGreaterThan(8);
    expect(core).not.toContain("\\n");
    expect(apexOrientationCompact("investigator")).toContain("The exact human objective and explicit constraints govern");
  });

  it("keeps qualification and wealth interpretation mission-specific", () => {
    const core = apexInvestigatorSystemCore();
    expect(core).toContain("No unrequested criteria or keyword/name heuristics; generic nouns are not queries.");
    expect(core).toContain("HNWI/wealth/success labels are not evidence");
    expect(core).toContain("HNWI/wealth/success labels are not evidence");
    expect(core).toContain("No fixed source/provider/registry order or mix.");
    expect(core).toContain("AUTONOMY: No fixed source/provider/registry order or mix.");
    expect(core).toContain("do not turn generic objective nouns into repeated broad queries");
    expect(core).toContain("do not follow a fixed rotation");
    expect(core).toContain("Treat public-web search and enabled registries as neutral complementary routes");
  });
});
