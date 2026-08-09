import { describe, it, expect } from "vitest";
import {
  classifyJobLogLine,
  tryParseBureauLogLine,
  createBureauEvent,
  formatBureauEventLine,
} from "../lib/bureau-live-log";

describe("bureau-live-log classification", () => {
  it("drops short and heartbeat noise", () => {
    expect(classifyJobLogLine("ok").publish).toBe(false);
    expect(classifyJobLogLine("heartbeat ping").publish).toBe(false);
    expect(classifyJobLogLine("12% done").publish).toBe(false);
  });

  it("classifies actors from free-text job logs", () => {
    expect(classifyJobLogLine("Gemini Boss decision: continue registry").actor).toBe("boss");
    expect(classifyJobLogLine("NVIDIA right-hand advisor note").actor).toBe("right_hand");
    expect(classifyJobLogLine("Tavily web search completed").actor).toBe("web");
    expect(classifyJobLogLine("Maigret footprint scan started").actor).toBe("tool");
    expect(classifyJobLogLine("Companies House registry pull").actor).toBe("registry");
    expect(classifyJobLogLine("Broad discovery intake sample").actor).toBe("discovery");
  });

  it("publishes interesting system lines", () => {
    const r = classifyJobLogLine("Phase 3 started for target");
    expect(r.publish).toBe(true);
    expect(r.actor).toBe("system");
  });

  it("parses structured BUREAU| lines", () => {
    const evt = createBureauEvent({
      actor: "boss",
      title: "Plan ready",
      provider: "gemini-2.0-flash",
      ask: "next lane?",
      responseSummary: "registry then web",
    });
    const line = `ts BUREAU|${JSON.stringify(evt)}`;
    const parsed = tryParseBureauLogLine(line);
    expect(parsed?.title).toBe("Plan ready");
    expect(parsed?.actor).toBe("boss");
    expect(parsed?.provider).toBe("gemini-2.0-flash");
  });

  it("formats event lines for humans", () => {
    const evt = createBureauEvent({
      actor: "web",
      title: "Search done",
      provider: "tavily",
      ask: "find emails",
      responseSummary: "2 hits",
    });
    const line = formatBureauEventLine(evt);
    expect(line).toContain("WEB");
    expect(line).toContain("Search done");
    expect(line).toContain("ASK:");
    expect(line).toContain("RESPONSE:");
  });
});
