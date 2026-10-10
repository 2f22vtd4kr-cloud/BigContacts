import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const caseBureauSource = readFileSync(resolve(process.cwd(), "src/src/lib/case-bureau.ts"), "utf8");
import { generateGroqBossText } from "../lib/groq-boss";

describe("Groq Boss token-window recovery", () => {
  it("keeps internal case-memory wording from becoming a false research anchor", () => {
    expect(caseBureauSource).not.toContain("durable tree shaft");
    expect(caseBureauSource).toContain("The case context is the durable shared record for this Bureau.");
    expect(caseBureauSource).toContain("Internal memory, storage, and workflow terminology are infrastructure concepts only");
    expect(caseBureauSource).toContain("do not turn wording from these instructions into a research premise.");
  });

  beforeEach(() => {
    for (let i = 1; i <= 10; i += 1) delete process.env[`GROQ_BOSS_API_KEY_${i}`];
  });

  afterEach(() => {
    delete process.env.GROQ_BOSS_API_KEY;
    for (let i = 1; i <= 10; i += 1) delete process.env[`GROQ_BOSS_API_KEY_${i}`];
    vi.restoreAllMocks();
  });

  it("recovers a token-window 429 without rotating the Boss model", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-boss-token-window-key";
    let calls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { type: "tokens", code: "rate_limit_exceeded" } }), {
          status: 429,
          headers: {
            "retry-after": "20",
            "x-ratelimit-remaining-tokens": "3108",
            "x-ratelimit-reset-tokens": "0.001s",
            "x-ratelimit-remaining-requests": "998",
          },
        });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"decision":"proceed"}' } }] }), { status: 200 });
    });

    const result = await generateGroqBossText(
      {
        model: "openai/gpt-oss-120b",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 1,
        candidateModels: ["openai/gpt-oss-120b"],
        keyName: "GROQ_BOSS_API_KEY",
      },
      "Return a small JSON decision.",
    );

    expect(result.raw).toBe('{"decision":"proceed"}');
    expect(result.error).toBeNull();
    expect(calls).toBe(2);
    expect(fetchMock.mock.calls[1]?.[1]).toBeTruthy();
  });

  it("fails closed without retrying when the token reset exceeds the bounded recovery window", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-boss-long-reset-key";
    let calls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { type: "tokens", code: "rate_limit_exceeded" } }), {
        status: 429,
        headers: {
          "retry-after": "20",
          "x-ratelimit-remaining-tokens": "3108",
          "x-ratelimit-reset-tokens": "46s",
          "x-ratelimit-remaining-requests": "998",
        },
      });
    });

    const result = await generateGroqBossText(
      {
        model: "openai/gpt-oss-120b",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 1,
        candidateModels: ["openai/gpt-oss-120b"],
        keyName: "GROQ_BOSS_API_KEY",
      },
      "Return a small JSON decision.",
    );

    expect(result.raw).toBeNull();
    expect(result.error).toContain("upstream_token_window_wait_exceeded");
    expect(result.error).not.toContain("HTTP 429");
    expect(result.error).not.toContain("openai/gpt-oss-20b");
    expect(calls).toBe(1);
    expect(fetchMock.mock.calls[0]?.[1]).toBeTruthy();
  });
});
