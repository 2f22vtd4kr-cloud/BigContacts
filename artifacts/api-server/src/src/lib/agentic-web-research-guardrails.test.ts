import { describe, expect, it } from "vitest";
import {
  buildActionParseFailureObservation,
  buildStepPrompt,
} from "./agentic-web-research-core";

describe("Investigator target and source grounding guardrails", () => {
  it("keeps the complete current objective out of lossy historical memory for ordinary discovery turns", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE:",
      ...Array.from({ length: 15 }, (_, index) =>
        "Constraint " + (index + 1) + ": discover source-backed people and organizations, distinguish leads from fetched evidence, and preserve the stated public/professional approach-route requirements.",
      ),
    ].join("\n");
    expect(objective.length).toBeGreaterThan(1_600);
    expect(objective.length).toBeLessThanOrEqual(3_500);

    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: [],
      trajectoryRecords: [],
      lastObservation: "CASE CONTEXT LOADED. No source observation or named target has been selected yet.",
      findings: [],
      mode: "discovery",
      actionAllowlist: ["web_search", "parallel_web_search", "registry_search", "parallel_registry_search", "visit", "done"],
    });

    expect(prompt).toContain(objective);
    expect(prompt).toContain("TARGET-NAME GROUNDING");
    expect(prompt).toContain("If no target name has been observed, formulate an open discovery hypothesis");
    expect(prompt).not.toContain("The full objective is represented in Boss-generated memory");
  });

  it("requires a same-case observed URL when recovering an invalid visit action", () => {
    const feedback = buildActionParseFailureObservation("invalid_action_arguments action=visit missing=url");

    expect(feedback).toContain("no page fetch ran");
    expect(feedback).toContain("copied verbatim from an actual same-case search, registry, or page observation");
    expect(feedback).toContain("If no source URL has been observed, do not choose visit");
    expect(feedback).toContain("Do not invent a target or URL");
  });
});
