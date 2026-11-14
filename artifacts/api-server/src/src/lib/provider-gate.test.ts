import { afterEach, describe, expect, it } from "vitest";
import { getGroqTokenMaxWaitMs } from "./provider-gate";

const original = process.env.APEX_GROQ_TPM_MAX_WAIT_MS;

afterEach(() => {
  if (original === undefined) delete process.env.APEX_GROQ_TPM_MAX_WAIT_MS;
  else process.env.APEX_GROQ_TPM_MAX_WAIT_MS = original;
});

describe("Groq token-window wait budget", () => {
  it("allows one full token reset window by default", () => {
    delete process.env.APEX_GROQ_TPM_MAX_WAIT_MS;
    expect(getGroqTokenMaxWaitMs()).toBe(60_000);
  });

  it("continues to honor an explicit bounded deployment override", () => {
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "15000";
    expect(getGroqTokenMaxWaitMs()).toBe(15_000);
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "999999";
    expect(getGroqTokenMaxWaitMs()).toBe(120_000);
  });
});
