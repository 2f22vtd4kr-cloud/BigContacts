import { describe, expect, it } from "vitest";
import { buildTargetActRightHandPrompt, compactOversightAct, compactOversightContext, TARGET_ACT_RIGHT_HAND_PROMPT_MAX_CHARS } from "../lib/target-act-oversight";

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
});
