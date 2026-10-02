import { describe, expect, it } from "vitest";
import { MISTRAL_RIGHT_HAND_MODEL, getMistralRightHandStatus } from "../lib/mistral-right-hand-reasoning";

describe("Mistral Right-hand control transport", () => {
  it("uses the canonical Mistral model and role", () => {
    const status = getMistralRightHandStatus();
    expect(status.provider).toBe("mistral");
    expect(status.role).toBe("right_hand_advisor");
    expect(status.model).toBe(MISTRAL_RIGHT_HAND_MODEL);
  });
});
