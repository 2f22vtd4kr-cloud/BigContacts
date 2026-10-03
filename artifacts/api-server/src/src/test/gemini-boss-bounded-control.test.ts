import { describe, expect, it } from "vitest";
import { GROQ_BOSS_MODEL, getGroqBossStatus } from "../lib/groq-boss";

describe("Groq Boss bounded control suite", () => {
  it("uses the canonical Groq Boss provider contract", () => {
    const status = getGroqBossStatus();
    expect(status.role).toBe("head_investigator");
    expect(status.model).toBe(GROQ_BOSS_MODEL);
    expect(status.provider).toBe("groq");
  });
});
