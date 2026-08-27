import { describe, expect, it } from "vitest";
import { suggestLcode } from "../lib/lcode-suggest";

describe("suggestLcode", () => {
  it("L-NO-DIG when no spans", () => {
    expect(suggestLcode({ cardPhone: null })).toBe("L-NO-DIG");
  });

  it("L-EMPTY when dig + evidence but no card", () => {
    expect(
      suggestLcode({
        hadSearchSpan: true,
        hadVisitSpan: true,
        evidenceContactCount: 2,
        cardPhone: null,
      }),
    ).toBe("L-EMPTY");
  });

  it("L-ISSUER when issuer source and better route known", () => {
    expect(
      suggestLcode({
        hadVisitSpan: true,
        cardPhone: "+15139773000",
        phoneSource: "EDGAR-Phone",
        betterPublicRouteKnown: true,
      }),
    ).toBe("L-ISSUER");
  });

  it("L-ORG-AS-DIRECT when org source labeled direct", () => {
    expect(
      suggestLcode({
        hadVisitSpan: true,
        cardPhone: "+12125550100",
        phoneSource: "agentic-web-org",
        contactOutcome: "direct_contact_candidate",
      }),
    ).toBe("L-ORG-AS-DIRECT");
  });

  it("L-SCRIPT when force detected", () => {
    expect(suggestLcode({ forceScriptDetected: true, hadSearchSpan: true })).toBe("L-SCRIPT");
  });

  it("none on healthy dig card", () => {
    expect(
      suggestLcode({
        hadSearchSpan: true,
        hadVisitSpan: true,
        cardPhone: "+16099213633",
        phoneSource: "EDGAR-Notice-Phone",
        contactOutcome: "direct_contact_candidate",
      }),
    ).toBe("none");
  });
});
