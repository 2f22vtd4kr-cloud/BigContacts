import { describe, expect, it } from "vitest";
import { assessTargetRealism } from "../lib/target-realism";

const base = {
  name: "Example Target",
  type: "HNWI",
  estimatedNetWorth: null,
  email: null,
  phone: null,
  contactConfidence: 0,
  contactOutcome: null,
  linkedinUrl: null,
  twitterHandle: null,
  instagramHandle: null,
  telegramHandle: null,
  metadata: null,
  networkDegree: 0,
};

describe("target realism policy", () => {
  it("classifies a validated direct contact as direct", () => {
    expect(assessTargetRealism({
      ...base,
      email: "person@example.com",
      contactConfidence: 80,
      contactOutcome: "direct_contact_verified",
    }).classification).toBe("direct");
  });

  it("classifies a corroborated gatekeeper route as intermediary", () => {
    expect(assessTargetRealism({
      ...base,
      hasCorroboratedIntermediary: true,
    }).classification).toBe("intermediary");
  });

  it("classifies an ordinary unresolved target as bounded", () => {
    expect(assessTargetRealism(base).classification).toBe("bounded");
  });

  it("classifies a wealthy isolated social-only target as research_only", () => {
    expect(assessTargetRealism({
      ...base,
      estimatedNetWorth: 1200000000,
      instagramHandle: "@public_profile",
    }).classification).toBe("research_only");
  });

  it("does not treat a generic low-confidence inbox as direct access", () => {
    expect(assessTargetRealism({
      ...base,
      email: "info@example.com",
      contactConfidence: 10,
      contactOutcome: "organization_contact",
    }).classification).toBe("bounded");
  });
});