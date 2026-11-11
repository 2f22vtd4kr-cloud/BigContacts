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
    expect(APEX_WHAT_IS_ATLAS).toContain("Let the human objective determine whether discovery targets are people, operating companies, assets, or relationships");
    expect(APEX_WHAT_IS_ATLAS).not.toContain("GOAL: Find real, publicly documented contact routes to high-net-worth individuals");
  });

  it("keeps the shared Boss and Right-hand orientation objective-led", () => {
    for (const role of ["boss", "right_hand", "investigator", "dig_agent"] as const) {
      const prompt = apexOrientationCompact(role);
      expect(prompt).toContain("the exact human objective");
      expect(prompt).toContain("HNWI is an optional classification");
      expect(prompt).toContain("do not impose wealth or ownership criteria unless requested");
    }
  });

  it("does not impose person-first discovery on company- or asset-led objectives", () => {
    const investigator = apexOrientationFor("investigator");
    const digAgent = apexOrientationFor("dig_agent");
    expect(investigator).toContain("For B2B assignments, verify current decision-maker role and company connection");
    expect(digAgent).toContain("the human objective determines target class");
    expect(digAgent).toMatch(/do not impose person-first discovery when the objective is company- or asset-led/i);
  });

  it("filters unrealistic household-name prospects unless explicitly requested or individually reachable", () => {
    const mission = APEX_WHAT_IS_ATLAS;
    expect(mission).toContain("globally famous/household-name public figures");
    expect(mission).toContain("do not select or surface them as prospect cards");
    expect(mission).toContain("the human explicitly names them or explicitly requests them as prominent public figures");
    expect(mission).toContain("an actionable person-specific professional route");
    expect(mission).toContain("A general company switchboard, corporate inbox, investor-relations/press contact");
    expect(mission).toContain("not a name list or permanent exclusion");
    expect(mission).toContain("Inc. 5000/fast-growth/unicorn rankings");
    expect(mission).toContain("For potential-investor firms, require independent evidence of capital capacity or actual investment activity");
    expect(mission).toContain("do not prefer private or mid-market status unless the human objective asks for it");
    for (const role of ["boss", "right_hand", "investigator", "dig_agent"] as const) {
      const prompt = apexOrientationCompact(role);
      expect(prompt).toContain("globally famous/household-name");
      expect(prompt).toContain("person-specific professional route");
      expect(prompt).toContain("general company/press/IR channels do not qualify");
      expect(prompt).toContain("explicitly requests them");
      expect(prompt).toContain("COMPANY REALISM");
      expect(prompt).toContain("Ranking-only mentions are leads, not qualified targets");
      expect(prompt).toContain("capital capacity or actual investment activity");
      expect(prompt).not.toContain("neither qualify nor disqualify");
      expect(prompt).not.toContain("Apply less-public");
      expect(prompt).not.toContain("Tim Cook");
    }
    expect(apexInvestigatorSystemCore()).toContain("Generic prospect discovery must not select globally famous/household-name people");
    expect(apexOrientationCompact("boss")).not.toContain("quota fillers");
  });

  it("preserves sector and jurisdiction together and bounds the discovery search economy", () => {
    const core = apexInvestigatorSystemCore();
    expect(core).not.toContain("casinos in Slovenia");
    expect(core).toContain("Never infer or introduce a geography from examples or model memory");
    expect(core).toContain("sector and jurisdiction");
    expect(APEX_BUREAU_PLAYBOOK).toContain("JURISDICTION + SECTOR");
    expect(APEX_BUREAU_PLAYBOOK).not.toContain("casinos in Slovenia");
    expect(APEX_BUREAU_PLAYBOOK).toContain("Never infer or introduce a jurisdiction from examples or model memory");
    expect(APEX_BUREAU_PLAYBOOK).toContain("genuinely global register");
    expect(APEX_BUREAU_PLAYBOOK).toContain("at most two outbound search actions");
    expect(APEX_BUREAU_PLAYBOOK).toContain("one bounded mixed-source batch");
    expect(APEX_BUREAU_PLAYBOOK).toContain("single strongest objective-fit lead, not a shortlist");
    expect(APEX_BUREAU_PLAYBOOK).not.toContain("inspect one useful in-scope lead before another search");
    expect(core.split("\n").length).toBeGreaterThan(8);
    expect(core).not.toContain("\\n");
    expect(apexOrientationCompact("investigator")).toContain("the exact human objective");
  });

  it("applies qualification criteria only when required by the human objective", () => {
    const core = apexInvestigatorSystemCore();
    expect(core).toContain("Apply only requested criteria");
    expect(core).toContain("B2B needs fetched role/company evidence");
    expect(core).toContain("wealth objectives need sourced ownership/equity/investment");
    expect(core).toContain("Never infer wealth from seniority");
    expect(core).toContain("a bounded mixed-source first pass is available when useful");
    expect(core).toContain("single strongest objective-fit lead, not a shortlist");
    expect(core).toContain("AUTONOMY: Investigator owns targets, queries, sources, tools, pivots and stopping; no fixed recovery sequence.");
    expect(core).toContain("Investigator owns targets, queries, sources, tools, pivots and stopping");
  });
});
