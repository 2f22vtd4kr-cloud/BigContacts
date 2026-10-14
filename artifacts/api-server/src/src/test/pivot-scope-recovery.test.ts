import { describe, expect, it } from "vitest";
import { buildAtlasScopeRecoveryFeedback } from "../lib/atlas-control-decision";
import {
  discoveryPivotScopeKey,
  repeatedPivotBlockedActionReason,
  type AgenticTrajectoryRecord,
} from "../lib/agentic-web-research-core";

const objective = [
  "Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary contact routes.",
  "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Query state corporation databases (e.g., Indiana Secretary of State, Ohio Business Search, Illinois Secretary of State) for family-owned manufacturing and real-estate companies in the Midwest and extract listed owners/operators; supplement with Midwest manufacturing trade association member directories to locate named individuals with public ownership evidence.",
].join("\n\n");

function blockedRecord(turn: number, query: string, pivotScopeKey: string): AgenticTrajectoryRecord {
  return {
    turn,
    model: "openai/gpt-oss-120b",
    action: "web_search",
    args: { query, provider: "serper" },
    pivotScopeKey,
    execution: "blocked",
    observation: "pivot_alignment_guard blocked this outbound action before execution. No outbound request was made.",
    observedUrls: [],
    findings: [],
  };
}

describe("repeated pivot-scope recovery", () => {
  it("returns control after distinct out-of-scope query variants are repeatedly blocked", () => {
    const pivotScopeKey = discoveryPivotScopeKey(objective);
    if (!pivotScopeKey) throw new Error("Expected the fixture to define an active pivot scope");
    const priorRecords: AgenticTrajectoryRecord[] = [
      blockedRecord(7, "Indiana Chamber of Commerce member directory public access", pivotScopeKey),
      blockedRecord(8, "Indiana Chamber of Commerce member directory for Indiana businesses", pivotScopeKey),
    ];

    const reason = repeatedPivotBlockedActionReason(
      objective,
      "web_search",
      { query: "Indiana Chamber of Commerce member directory for general business contacts", provider: "serper" },
      priorRecords,
    );

    expect(reason).toContain("repeat_pivot_alignment_guard");
    expect(reason).toContain("multiple distinct actions");
    expect(reason).toContain("return control to Boss/Right-hand");
  });

  it("does not suppress a valid in-scope query after prior scope blocks", () => {
    const pivotScopeKey = discoveryPivotScopeKey(objective);
    if (!pivotScopeKey) throw new Error("Expected the fixture to define an active pivot scope");
    const priorRecords: AgenticTrajectoryRecord[] = [
      blockedRecord(7, "Indiana Chamber of Commerce member directory public access", pivotScopeKey),
      blockedRecord(8, "Indiana Chamber of Commerce member directory for Indiana businesses", pivotScopeKey),
    ];

    expect(repeatedPivotBlockedActionReason(
      objective,
      "web_search",
      { query: "Indiana Secretary of State corporation database family-owned manufacturing business owners in Indiana Midwest", provider: "serper" },
      priorRecords,
    )).toBeNull();
  });
});


describe("cross-pivot scope recovery context", () => {
  it("surfaces repeated preflight blocks across pivot variants to Boss/Right-hand as control feedback", () => {
    const records: AgenticTrajectoryRecord[] = [
      blockedRecord(1, "query one", "scope-a"),
      blockedRecord(2, "query two", "scope-a"),
      blockedRecord(3, "query three", "scope-a"),
      blockedRecord(4, "query four", "scope-b"),
      blockedRecord(5, "query five", "scope-b"),
      blockedRecord(6, "query six", "scope-b"),
    ];
    const feedback = buildAtlasScopeRecoveryFeedback(records);
    expect(feedback).toContain("6 Investigator action(s)");
    expect(feedback).toContain("2 accepted pivot-scope variant(s)");
    expect(feedback).toContain("before any outbound request");
    expect(feedback).toContain("control state, not research evidence");
    expect(feedback).toContain("Do not prescribe a fixed target");
  });

  it("clears stale scope-recovery feedback after successful external research", () => {
    const records: AgenticTrajectoryRecord[] = [
      blockedRecord(1, "query one", "scope-a"),
      blockedRecord(2, "query two", "scope-a"),
      blockedRecord(3, "query three", "scope-b"),
      {
        turn: 4, model: "openai/gpt-oss-120b", action: "visit", args: { url: "https://example.test/company" },
        execution: "success", observation: "A page was retrieved.", observedUrls: ["https://example.test/company"], findings: [],
      },
    ];
    expect(buildAtlasScopeRecoveryFeedback(records)).toBeNull();
  });
});