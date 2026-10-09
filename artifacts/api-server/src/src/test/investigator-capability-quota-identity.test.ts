import { describe, expect, it } from "vitest";
import {
  getAvailableDistinctInvestigatorCapabilities,
  getAvailableInvestigatorCapabilities,
  type InvestigatorCapability,
} from "../lib/investigator-capability-registry";

describe("Investigator credential quota identity", () => {
  const env = {
    GROQ_INVESTIGATOR_API_KEY: "shared-test-credential",
    GROQ_INVESTIGATOR_API_KEY_1: "shared-test-credential",
    GROQ_INVESTIGATOR_API_KEY_2: "independent-test-credential",
    GROQ_INVESTIGATOR_API_KEY_3: "",
  } as NodeJS.ProcessEnv;

  it("keeps configured slots visible while counting duplicate credentials as one quota pool", () => {
    expect(getAvailableInvestigatorCapabilities(env)).toEqual([
      "groq-investigator-1",
      "groq-investigator-2",
      "groq-investigator-3",
    ]);
    expect(getAvailableDistinctInvestigatorCapabilities(env)).toEqual([
      "groq-investigator-1",
      "groq-investigator-3",
    ]);
  });

  it("excludes every alias of an exhausted credential during recovery", () => {
    const excluded: InvestigatorCapability[] = ["groq-investigator-2"];
    expect(getAvailableDistinctInvestigatorCapabilities(env, excluded)).toEqual([
      "groq-investigator-3",
    ]);
  });

  it("treats whitespace-normalized equal credentials as the same quota pool", () => {
    const whitespaceEnv = {
      ...env,
      GROQ_INVESTIGATOR_API_KEY_1: "  shared-test-credential  ",
    } as NodeJS.ProcessEnv;
    expect(getAvailableDistinctInvestigatorCapabilities(whitespaceEnv)).toEqual([
      "groq-investigator-1",
      "groq-investigator-3",
    ]);
  });
});
