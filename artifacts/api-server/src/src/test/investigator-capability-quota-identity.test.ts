import { describe, expect, it } from "vitest";
import {
  getAvailableDistinctInvestigatorCapabilities,
  getAvailableInvestigatorCapabilities,
  getInvestigatorCredentialAliases,
  getModelScopedInvestigatorQuotaFallback,
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
      "groq-investigator-20b",
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

  it("expands an exhausted slot into every configured alias for the Boss", () => {
    expect(getInvestigatorCredentialAliases(env, ["groq-investigator-2"])).toEqual([
      "groq-investigator-1",
      "groq-investigator-2",
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

  it("discovers all seven configured Investigator credential slots", () => {
    const expanded = {
      GROQ_INVESTIGATOR_API_KEY: "credential-0",
      GROQ_INVESTIGATOR_API_KEY_1: "credential-1",
      GROQ_INVESTIGATOR_API_KEY_2: "credential-2",
      GROQ_INVESTIGATOR_API_KEY_3: "credential-3",
      GROQ_INVESTIGATOR_API_KEY_4: "credential-4",
      GROQ_INVESTIGATOR_API_KEY_5: "credential-5",
      GROQ_INVESTIGATOR_API_KEY_6: "credential-6",
      GROQ_INVESTIGATOR_API_KEY_7: "credential-7",
    } as NodeJS.ProcessEnv;
    expect(getAvailableInvestigatorCapabilities(expanded)).toEqual([
      "groq-investigator-1", "groq-investigator-2", "groq-investigator-3",
      "groq-investigator-4", "groq-investigator-5", "groq-investigator-6",
      "groq-investigator-7", "groq-investigator-20b",
    ]);
  });

  it("permits the explicit 20B model fallback only for a model-scoped quota recovery", () => {
    const singleCredential = {
      GROQ_INVESTIGATOR_API_KEY: "one-credential",
      GROQ_INVESTIGATOR_API_KEY_1: "",
      GROQ_INVESTIGATOR_API_KEY_2: "",
      GROQ_INVESTIGATOR_API_KEY_3: "",
      GROQ_INVESTIGATOR_API_KEY_4: "",
      GROQ_INVESTIGATOR_API_KEY_5: "",
    } as NodeJS.ProcessEnv;

    expect(getModelScopedInvestigatorQuotaFallback(
      singleCredential,
      "groq-investigator-1",
      ["groq-investigator-1"],
    )).toBe("groq-investigator-20b");
    expect(getModelScopedInvestigatorQuotaFallback(
      singleCredential,
      "groq-investigator-20b",
      ["groq-investigator-20b"],
    )).toBe("groq-investigator-1");
    expect(getModelScopedInvestigatorQuotaFallback(
      singleCredential,
      "groq-investigator-1",
      ["groq-investigator-1", "groq-investigator-20b"],
    )).toBeNull();
  });
});
