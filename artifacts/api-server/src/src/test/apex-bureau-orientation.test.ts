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
    expect(digAgent).toContain("do not impose person-first discovery when the objective is company- or asset-led");
  });

  it("keeps famous-wealthy target realism as an AI reasoning rule across roles", () => {
    const mission = APEX_WHAT_IS_ATLAS;
    expect(mission).toContain("not a hard-coded name blacklist");
    for (const role of ["boss", "right_hand", "investigator", "dig_agent"] as const) {
      const prompt = apexOrientationCompact(role);
      expect(prompt).toMatch(/REALISM[\s\S]*famous[\s\S]*wealthy people/i);
      expect(prompt).toMatch(/not a hard-coded name (?:list|blacklist)|use no name blacklist/);
      expect(prompt).not.toContain("Tim Cook");
    }
    expect(apexOrientationCompact("boss")).toContain("or quota fillers");
  });

  it("applies wealth evidence requirements only to wealth objectives and preserves B2B requirements", () => {
    const core = apexInvestigatorSystemCore();
    expect(core).toContain("Wealth objectives require sourced ownership/control/equity/investment");
    expect(core).toContain("B2B needs a fetched decision-maker role/company link");
    expect(core).toContain("Other objectives use their criteria");
    expect(core).toContain("REALISM: Broad B2B discovery must not select incidental celebrity/household-name person leads");
    expect(core).toContain("Keep source-backed company leads when decision-makers are unresolved");
    expect(core).toContain("AI judgment, no blacklist");
  });
});
