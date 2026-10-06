import { describe, expect, it } from "vitest";
import { compactOversightAct, compactOversightContext } from "../lib/target-act-oversight";

describe("target-act oversight prompt compaction", () => {
  it("keeps completed act observations bounded while retaining action and source anchors", () => {
    const compact = compactOversightAct({
      turn: 7,
      model: "groq-investigator-1",
      action: "visit",
      args: { url: "https://example.com", purpose: "verify identity", extra: "ignored", giant: "A".repeat(5_000) },
      execution: "success",
      observation: "DECISIVE_HEAD " + "X".repeat(5_000) + " DECISIVE_TAIL",
      observedUrls: ["https://example.com/page", "https://example.com/other"],
      findings: Array.from({ length: 30 }, (_, i) => ({ value: "finding-" + i + " " + "V".repeat(1_000), note: "N".repeat(1_000), sourceUrls: ["https://example.com/source/" + i] })),
      providerFallback: [],
      stopReason: undefined,
    });
    expect(JSON.stringify(compact).length).toBeLessThan(6_000);
    expect(compact.action).toBe("visit");
    expect(compact.observedUrls).toContain("https://example.com/page");
    expect(String(compact.observation)).toContain("DECISIVE_HEAD");
    expect(String(compact.observation)).toContain("DECISIVE_TAIL");
    expect(JSON.stringify(compact)).not.toContain("V".repeat(900));
  });

  it("bounds shared case context before it is sent to per-act control models", () => {
    const context = compactOversightContext("CASE HEAD\n" + "X".repeat(20_000) + "\nCASE TAIL");
    expect(context.length).toBeLessThanOrEqual(6_000);
    expect(context).toContain("CASE HEAD");
    expect(context).toContain("CASE TAIL");
    expect(context).toContain("OVERSIGHT CONTEXT BOUND");
  });
});
