import { describe, expect, it } from "vitest";
import { buildActEvidenceGraphs, buildTargetActRightHandPrompt, compactOversightAct, compactOversightContext, TARGET_ACT_RIGHT_HAND_PROMPT_MAX_CHARS, validateTargetActRightHandAdvice, validateTargetActBossOversight } from "../lib/target-act-oversight";

describe("target-act oversight prompt compaction", () => {
  it("keeps completed act observations bounded while retaining action and source anchors", () => {
    const compact = compactOversightAct({
      turn: 7,
      model: "groq-investigator-1",
      action: "visit",
      args: { url: "https://example.com", purpose: "verify identity", extra: "ignored" },
      execution: "success",
      observation: "OBSERVATION ".repeat(5_000),
      observedUrls: ["https://example.com/page", "https://example.com/other"],
      findings: Array.from({ length: 30 }, (_, i) => ({ value: "finding-" + i })),
      providerFallback: [],
      stopReason: undefined,
    });
    expect(JSON.stringify(compact).length).toBeLessThan(4_000);
    expect(compact.action).toBe("visit");
    expect(compact.observedUrls).toContain("https://example.com/page");
  });

  it("bounds the exact Right-hand request after composing shared state, act and recent history", () => {
    const prompt = buildTargetActRightHandPrompt({
      targetName: "T".repeat(2_000),
      targetType: "X".repeat(500),
      objective: "OBJECTIVE ".repeat(1_000),
      sharedContext: "CASE HEAD\n" + "X".repeat(30_000) + "\nCASE TAIL",
      currentAct: { turn: 7, action: "visit", observation: "F".repeat(30_000), findings: [{ value: "F".repeat(20_000) }] },
      recentActs: [{ turn: 1, action: "visit", observation: "R".repeat(30_000), findings: [{ value: "R".repeat(20_000) }] }],
    });

    expect(prompt.length).toBeLessThanOrEqual(TARGET_ACT_RIGHT_HAND_PROMPT_MAX_CHARS);
    expect(prompt).toContain("CASE HEAD");
    expect(prompt).toContain("CASE TAIL");
    expect(prompt).toContain("MIDDLE PROMPT DETAIL OMITTED");
    expect(prompt).toContain("Return ONE JSON object");
    expect(prompt).not.toContain("X".repeat(10_000));
  });

  it("bounds shared case context before it is sent to per-act control models", () => {
    const context = compactOversightContext("CASE HEAD\n" + "X".repeat(20_000) + "\nCASE TAIL");
    expect(context.length).toBeLessThanOrEqual(6_000);
    expect(context).toContain("CASE HEAD");
    expect(context).toContain("CASE TAIL");
    expect(context).toContain("OVERSIGHT CONTEXT BOUND");
  });
  it("uses the shared bounded Right-hand review contract and rejects malformed confidence", () => {
    const valid = { decision: "continue", reason: "A public source remains unchecked.", focusLanes: ["official register"], confidence: 0.7 };
    expect(validateTargetActRightHandAdvice(valid)).toBe(true);
    expect(validateTargetActRightHandAdvice({ ...valid, confidence: 1.7 })).toBe(false);
    expect(validateTargetActRightHandAdvice({ ...valid, confidence: -0.1 })).toBe(false);
    expect(validateTargetActRightHandAdvice({ ...valid, decision: "d".repeat(301) })).toBe(false);
    expect(validateTargetActRightHandAdvice({ ...valid, reason: "r".repeat(1_201) })).toBe(false);
    expect(validateTargetActRightHandAdvice({ ...valid, focusLanes: Array.from({ length: 9 }, () => "lane") })).toBe(false);
    expect(validateTargetActRightHandAdvice({ ...valid, unexpected: true })).toBe(false);
  });

  it("rejects out-of-range per-act Boss confidence and unbounded oversight strings", () => {
    const valid = { action: "continue", direction: null, reason: "Current question is still useful.", confidence: 0.65 };
    expect(validateTargetActBossOversight(valid)).toBe(true);
    expect(validateTargetActBossOversight({ ...valid, confidence: 1.7 })).toBe(false);
    expect(validateTargetActBossOversight({ ...valid, confidence: -0.1 })).toBe(false);
    expect(validateTargetActBossOversight({ ...valid, reason: "r".repeat(1_201) })).toBe(false);
    expect(validateTargetActBossOversight({ ...valid, action: "redirect", direction: "d".repeat(1_201) })).toBe(false);
  });

  it("anchors candidate contact evidence to its own persisted successful visit event", () => {
    const act = { turn: 2, model: "groq-investigator-1", action: "react_episode", args: {}, execution: "success", observation: "aggregate episode", observedUrls: ["https://example.com/team"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", scope: "candidate", sourceUrls: ["https://example.com/team"], note: "official team page" }],
      sourceRecords: [{ turn: 1, action: "visit", execution: "success", observation: "Team contact: Jane Example — jane@example.com", observedUrls: ["https://example.com/team"], findings: [] }],
    };
    const graphs = buildActEvidenceGraphs(7, act, 123, "run-evidence-anchor", new Map([[1, 456]]));
    expect(graphs).toHaveLength(1);
    expect(graphs[0]!.observations).toHaveLength(1);
    expect(graphs[0]!.observations[0]!.eventId).toBe(456);
    expect(graphs[0]!.observations[0]!.eventId).not.toBe(123);
    expect(graphs[0]!.observations[0]!.excerpt).toContain("jane@example.com");
  });

  it("refuses aggregate-episode anchors when the granular source event is absent", () => {
    const act = { turn: 2, model: "groq-investigator-1", action: "react_episode", args: {}, execution: "success", observation: "Jane Example — jane@example.com", observedUrls: ["https://example.com/team"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", scope: "candidate", sourceUrls: ["https://example.com/team"] }],
      sourceRecords: [{ turn: 1, action: "visit", execution: "success", observation: "Team contact: Jane Example — jane@example.com", observedUrls: ["https://example.com/team"], findings: [] }],
    };
    expect(buildActEvidenceGraphs(7, act, 123, "run-missing-anchor")).toEqual([]);
  });
});
