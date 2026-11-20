import { describe, expect, it } from "vitest";
import { buildGroqBossDiscoveryPrompt, resolveBossEligibleInvestigatorCapabilities } from "./case-bureau";
import type { InvestigatorCapability } from "./investigator-capability-registry";

const investigator20b = "groq-investigator-20b" as InvestigatorCapability;
const investigator120b = "groq-investigator-1" as InvestigatorCapability;

describe("Boss Investigator capability exclusion prompt", () => {
  it("offers only the healthy 120B lane when preflight excludes the 20B lane", () => {
    const prompt = buildGroqBossDiscoveryPrompt({
      objective: "Identify a publicly documented example organization.",
      motivation: "Verify the research lane before beginning.",
      excludedInvestigatorLlm: [investigator20b],
    }, [investigator120b]);

    const availableLine = prompt.split("\n").find((line) => line.startsWith("Available Investigator capabilities:")) ?? "";
    expect(availableLine).toBe('Available Investigator capabilities: ["groq-investigator-1"]');
    expect(prompt).toContain('Excluded capabilities (never select): ["groq-investigator-20b"]');
    expect(prompt).toContain("SINGLE-CAPABILITY ASSIGNMENT: groq-investigator-1 is the only currently permitted Investigator capability.");
    expect(prompt).not.toContain("exhausted model token capacity");
    expect(prompt).not.toContain("QUOTA-RECOVERY");
  });

  it("does not invent a quota-exhaustion reason when no lane is excluded", () => {
    const prompt = buildGroqBossDiscoveryPrompt({
      objective: "Identify a publicly documented example organization.",
      motivation: "Choose a suitable execution lane.",
    }, [investigator120b]);
    expect(prompt).not.toContain("SINGLE-CAPABILITY ASSIGNMENT");
    expect(prompt).not.toContain("quota");
    expect(prompt).toContain("GPT-OSS 120B is the default and preferred execution lane");
  });
  it("computes eligibility before Boss selection and excludes lanes below two valid samples out of three", () => {
    const samples = (passed: boolean[]) => passed.map((ok, index) => ({ sample: index + 1, passed: ok, classification: ok ? "passed" : "response_parse_failure", rawOutputClass: ok ? "valid_action_object" : "invalid_raw_output", latencyMs: 100, diagnostic: ok ? "valid_action" : "invalid_contract" }));
    const eligibility = resolveBossEligibleInvestigatorCapabilities({
      configuredCapabilities: [investigator20b, investigator120b],
      laneHealth: [
        { model: "gpt-oss-20b", capabilities: [investigator20b], passedSamples: 1, failedSamples: 2, samples: samples([true, false, false]) },
        { model: "gpt-oss-120b", capabilities: [investigator120b], passedSamples: 2, failedSamples: 1, samples: samples([true, true, false]) },
      ],
    });
    expect(eligibility.available).toEqual([investigator120b]);
    expect(eligibility.excluded).toEqual([investigator20b]);
  });
  it("does not treat a single successful preflight sample as two-of-three eligibility", () => {
    const eligibility = resolveBossEligibleInvestigatorCapabilities({
      configuredCapabilities: [investigator120b],
      laneHealth: [{ model: "gpt-oss-120b", capabilities: [investigator120b], passedSamples: 1, failedSamples: 0, samples: [{ sample: 1, passed: true, classification: "passed", rawOutputClass: "valid_action_object", latencyMs: 100, diagnostic: "valid_action" }] }],
    });
    expect(eligibility.available).toEqual([]);
    expect(eligibility.excluded).toEqual([investigator120b]);
  });

});
