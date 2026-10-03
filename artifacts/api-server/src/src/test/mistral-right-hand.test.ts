import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MISTRAL_RIGHT_HAND_FALLBACK_MODELS,
  MISTRAL_RIGHT_HAND_MODEL,
  getMistralRightHandStatus,
} from "../lib/mistral-right-hand-reasoning";

describe("Mistral Right-hand model policy", () => {
  afterEach(() => {
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_2;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_3;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_4;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_5;
    vi.restoreAllMocks();
  });

  it("uses the canonical Small 4 model with genuine cross-family Ministral fallbacks", () => {
    expect(MISTRAL_RIGHT_HAND_MODEL).toBe("mistral-small-2603");
    expect(MISTRAL_RIGHT_HAND_FALLBACK_MODELS).toEqual([
      "ministral-14b-2512",
      "ministral-8b-2512",
      "ministral-3b-2512",
    ]);
    expect(MISTRAL_RIGHT_HAND_FALLBACK_MODELS).not.toContain("mistral-small-latest");
  });

  it("reports the fallback chain without exposing credentials", () => {
    process.env.MISTRAL_RIGHT_HAND_API_KEY = "test-right-hand-key";
    const status = getMistralRightHandStatus();

    expect(status.configured).toBe(true);
    expect(status.model).toBe("mistral-small-2603");
    expect(status.fallbackModels).toEqual([
      "ministral-14b-2512",
      "ministral-8b-2512",
      "ministral-3b-2512",
    ]);
    expect(JSON.stringify(status)).not.toContain("test-right-hand-key");
  });
});
