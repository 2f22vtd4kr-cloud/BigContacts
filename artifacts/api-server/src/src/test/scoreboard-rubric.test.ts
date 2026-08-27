import { describe, expect, it } from "vitest";
import {
  scoreFixtureCard,
  meanScore,
  passesScoreboardMilestone,
} from "../lib/scoreboard-rubric";

describe("scoreboard-rubric", () => {
  it("scores direct attributable contact as 2", () => {
    expect(scoreFixtureCard({
      contactOutcome: "direct_contact_candidate",
      phone: "+16099213633",
      phoneSource: "EDGAR-Notice-Phone",
      hasSourceUrls: true,
    })).toBe(2);
  });

  it("scores org switchboard as 1 not 2", () => {
    expect(scoreFixtureCard({
      contactOutcome: "organization_contact",
      phone: "+12125551212",
      phoneSource: "EDGAR-Phone",
    })).toBe(1);
  });

  it("penalizes wrong person", () => {
    expect(scoreFixtureCard({
      contactOutcome: "direct_contact_candidate",
      phone: "+12125551212",
      wrongPerson: true,
    })).toBe(-1);
  });

  it("milestone requires 8 scores mean>=1 no -1", () => {
    const good = Array(8).fill(1) as Array<-1 | 0 | 1 | 2>;
    expect(passesScoreboardMilestone(good)).toBe(true);
    expect(passesScoreboardMilestone([...good.slice(0, 7), -1])).toBe(false);
    expect(passesScoreboardMilestone(Array(8).fill(0) as any)).toBe(false);
  });

  it("meanScore averages", () => {
    expect(meanScore([2, 1, 1, 0])).toBe(1);
  });
});
