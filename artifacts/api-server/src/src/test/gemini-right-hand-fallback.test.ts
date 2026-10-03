import { describe, expect, it } from "vitest";
import { GROQ_RIGHT_HAND_MODEL, getGroqRightHandStatus } from "../lib/groq-right-hand-reasoning";

describe("Groq Right-hand control transport", () => {
  it("uses the canonical Mistral model and role", () => {
    const status = getGroqRightHandStatus();
    expect(status.provider).toBe("groq");
    expect(status.role).toBe("right_hand_advisor");
    expect(status.model).toBe(GROQ_RIGHT_HAND_MODEL);
  });
});
