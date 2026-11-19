import { describe, expect, it } from "vitest";
import {
  getAvailableDistinctInvestigatorCapabilities,
  getAvailableInvestigatorCapabilities,
  getInvestigatorCredentialAliases,
  getInvestigatorCapabilityRuntimeHealthSnapshot,
  getModelScopedInvestigatorQuotaFallback,
  recordInvestigatorCapabilityRuntimeOutcome,
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
      "groq-investigator-20b",
      "groq-investigator-1",
      "groq-investigator-2",
      "groq-investigator-3",
    ]);
    expect(getAvailableDistinctInvestigatorCapabilities(env)).toEqual([
      "groq-investigator-20b",
      "groq-investigator-1",
      "groq-investigator-3",
    ]);
  });

  it("excludes every alias of an exhausted credential during recovery", () => {
    const excluded: InvestigatorCapability[] = ["groq-investigator-2"];
    expect(getAvailableDistinctInvestigatorCapabilities(env, excluded)).toEqual([
      "groq-investigator-20b",
      "groq-investigator-3",
    ]);
  });

  it("expands an exhausted slot into every configured alias for the Boss", () => {
    expect(getInvestigatorCredentialAliases(env, ["groq-investigator-2"])).toEqual([
      "groq-investigator-1",
      "groq-investigator-2",
    ]);
  });

  it("keeps preflight and quota aliases within the same model lane despite a shared credential", () => {
    expect(getInvestigatorCredentialAliases(env, ["groq-investigator-20b"])).toEqual([
      "groq-investigator-20b",
    ]);
    expect(getAvailableDistinctInvestigatorCapabilities(env, ["groq-investigator-20b"])).toEqual([
      "groq-investigator-1",
      "groq-investigator-3",
    ]);
    expect(getInvestigatorCredentialAliases(env, ["groq-investigator-1"])).toEqual([
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
      "groq-investigator-20b",
      "groq-investigator-1",
      "groq-investigator-3",
    ]);
  });

  it("discovers the base credential plus all seven suffixed Investigator slots", () => {
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
      "groq-investigator-20b",
      "groq-investigator-1", "groq-investigator-2",
      "groq-investigator-3", "groq-investigator-4", "groq-investigator-5",
      "groq-investigator-6", "groq-investigator-7", "groq-investigator-8",
    ]);
  });

  it("degrades a lane after consecutive runtime contract failures, recovers on a valid action, and never auto-rotates", () => {
    const capability: InvestigatorCapability = "groq-investigator-2";
    expect(getInvestigatorCapabilityRuntimeHealthSnapshot(env).find((lane) => lane.capability === capability)?.status).toBe("unobserved");
    expect(recordInvestigatorCapabilityRuntimeOutcome(capability, {
      success: false, failureClass: "action_parse_failure",
    }).status).toBe("healthy");
    const degraded = recordInvestigatorCapabilityRuntimeOutcome(capability, {
      success: false, failureClass: "action_parse_failure",
    });
    expect(degraded.status).toBe("degraded");
    expect(degraded.parseFailures).toBe(2);
    expect(getInvestigatorCapabilityRuntimeHealthSnapshot(env).find((lane) => lane.capability === capability)?.status).toBe("degraded");
    expect(getAvailableInvestigatorCapabilities(env)).toContain(capability);

    const recovered = recordInvestigatorCapabilityRuntimeOutcome(capability, { success: true });
    expect(recovered.status).toBe("healthy");
    expect(recovered.consecutiveFailures).toBe(0);
    expect(getInvestigatorCapabilityRuntimeHealthSnapshot(env).find((lane) => lane.capability === capability)?.status).toBe("healthy");
  });

  it("degrades a lane after repeated nonconsecutive failures without removing or rotating the configured capability", () => {
    const capability: InvestigatorCapability = "groq-investigator-3";
    expect(recordInvestigatorCapabilityRuntimeOutcome(capability, {
      success: false, failureClass: "action_parse_failure",
    }).status).toBe("healthy");
    expect(recordInvestigatorCapabilityRuntimeOutcome(capability, { success: true }).status).toBe("healthy");
    const degraded = recordInvestigatorCapabilityRuntimeOutcome(capability, {
      success: false, failureClass: "action_parse_failure",
    });
    expect(degraded.status).toBe("degraded");
    expect(degraded.failedActions).toBe(2);
    expect(degraded.successfulActions).toBe(1);
    expect(getAvailableInvestigatorCapabilities(env)).toContain(capability);
  });

  it("exposes the 20B endpoint by default and permits explicit disablement", () => {
    expect(getAvailableInvestigatorCapabilities(env)).toContain("groq-investigator-20b");
    expect(getAvailableDistinctInvestigatorCapabilities(env)).toContain("groq-investigator-20b");
    const disabled = { ...env, APEX_ENABLE_GROQ_INVESTIGATOR_20B: "false" } as NodeJS.ProcessEnv;
    expect(getAvailableInvestigatorCapabilities(disabled)).not.toContain("groq-investigator-20b");
    expect(getAvailableDistinctInvestigatorCapabilities(disabled)).not.toContain("groq-investigator-20b");
  });

  it("permits 20B model-scoped quota recovery by default and supports explicit disablement", () => {
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
    const disabled = { ...singleCredential, APEX_ENABLE_GROQ_INVESTIGATOR_20B: "false" } as NodeJS.ProcessEnv;
    expect(getModelScopedInvestigatorQuotaFallback(
      disabled,
      "groq-investigator-1",
      ["groq-investigator-1"],
    )).toBeNull();
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
