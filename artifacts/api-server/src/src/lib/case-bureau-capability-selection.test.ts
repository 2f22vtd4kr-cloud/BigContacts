import { describe, expect, it } from "vitest";
import { buildGroqBossDiscoveryPrompt } from "./case-bureau";
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
    }, [investigator20b]);
    expect(prompt).not.toContain("SINGLE-CAPABILITY ASSIGNMENT");
    expect(prompt).not.toContain("quota");
  });
});
