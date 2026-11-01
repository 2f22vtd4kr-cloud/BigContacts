import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const caseBureauSource = readFileSync(resolve(process.cwd(), "src/src/lib/case-bureau.ts"), "utf8");
const canonicalAtlasDiscoverySource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
import { buildGroqBossDiscoveryPrompt, parseBossDiscoveryResponse } from "../lib/case-bureau";
import { compactCanonicalDiscoveryContinuationContext } from "../lib/investigation-context-compaction";
import { generateGroqBossText } from "../lib/groq-boss";

describe("Groq Boss discovery prompt grounding", () => {
  it("keeps internal case-memory wording from becoming a false research anchor", () => {
    expect(caseBureauSource).not.toContain("durable tree shaft");
    expect(caseBureauSource).toContain("This opening call has exactly one responsibility: select an available Investigator execution capability.");
    expect(caseBureauSource).toContain("Do not invent or imply that any target has been discovered.");
    expect(caseBureauSource).toContain('required: ["investigatorLlm"]');
    expect(caseBureauSource).not.toContain("report: parsed.report || generated.raw");
  });


  it("selects one immediate target without registry or geography bias", () => {
    const prompt = buildGroqBossDiscoveryPrompt({
      objective: "Discover under-the-radar people with credible wealth potential and realistic public contact routes.",
      motivation: "Identify source-backed ownership, assets, and approach paths.",
    }, ["groq-investigator-1"]);
    expect(prompt).toContain("select an available Investigator execution capability");
    expect(prompt).toContain("Any enabled registry/asset register and public-web search are equal, neutral discovery options");
    expect(prompt).toContain("Do not compare sectors, geographies, or strategies.");
    expect(prompt).toContain("Do not add geographic scope or a source preference.");
    expect(prompt).toContain("Discover under-the-radar people with credible wealth potential and realistic public contact routes.");
    expect(prompt).not.toContain("Choose one concrete, testable company/person/asset lead");
    expect(canonicalAtlasDiscoverySource).toContain("Do not propose geographic expansion or alternative jurisdictions");
    expect(canonicalAtlasDiscoverySource).toContain("Only actual same-run Investigator tool observations may establish candidate names");
  });

  it("uses medium reasoning for the opening discovery assignment", () => {
    expect(caseBureauSource).toContain('maxOutputTokens: 2048,\n      thinkingLevel: "medium"');
    expect(caseBureauSource).not.toContain('maxOutputTokens: 2048,\n      thinkingLevel: "low"');
  });
});

describe("Groq Boss continuation prompt budget", () => {
  it("keeps long durable history below the Boss ceiling while preserving active objective and latest state", () => {
    const durableContext = [
      "CASE CONTEXT BEGIN: original public-web discovery mission and accumulated findings.",
      "HISTORICAL CASE DETAIL: " + "historical source and action detail ".repeat(2_500),
      "LATEST DURABLE EVENT: Washington corporate filing search returned leads; no fetched-page finding is established yet.",
    ].join("\n");
    const compacted = compactCanonicalDiscoveryContinuationContext(durableContext, 7_000);
    const activeObjective = "Find source-backed people connected to the original mission.";
    const initialContext = `ACTIVE DISCOVERY OBJECTIVE:\n${activeObjective}\n\n${compacted}`;

    const compiledBossPrompt = buildGroqBossDiscoveryPrompt({
      objective: `Review this existing discovery case and decide whether a selected Investigator should continue it. Do not start a fixed research sequence.\n\nSHARED INVESTIGATION CONTEXT:\n${initialContext}`,
      motivation: "Continue the existing investigation from its durable evidence.",
      geography: "Public web; geography selected by the research objective",
      exclusions: ["Do not browse as Boss.", "Do not prescribe a fixed tool or search sequence."],
      rightHandAdvice: {
        status: "completed",
        model: "openai/gpt-oss-120b",
        decision: "stop",
        reason: "No evidence-backed candidate was admitted before the recovery boundary.",
        focusLanes: ["Review evidence gaps and viable continuation"],
        confidence: 0.84,
        error: null,
      },
      startingLane: "model-selected continuation from shared case context",
    }, ["groq-investigator-1"]);

    expect(compacted.length).toBeLessThanOrEqual(7_000);
    expect(compiledBossPrompt.length).toBeLessThanOrEqual(20_000);
    expect(compiledBossPrompt).toContain("ACTIVE DISCOVERY OBJECTIVE");
    expect(compiledBossPrompt).toContain("LATEST DURABLE EVENT");
  });
});

describe("Groq Boss token-window recovery", () => {

  beforeEach(() => {
    for (let i = 1; i <= 10; i += 1) delete process.env[`GROQ_BOSS_API_KEY_${i}`];
  });

  afterEach(() => {
    delete process.env.GROQ_BOSS_API_KEY;
    for (let i = 1; i <= 10; i += 1) delete process.env[`GROQ_BOSS_API_KEY_${i}`];
    vi.useRealTimers();
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

  it("skips short-window retries for explicit TPD exhaustion and falls back to the next Boss model", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-boss-tpd-quota-key";
    const chatModels: string[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      chatModels.push(body.model);
      if (body.model === "openai/gpt-oss-120b") {
        return new Response(JSON.stringify({
          error: {
            type: "tokens",
            code: "rate_limit_exceeded",
            message: "Rate limit reached for model openai/gpt-oss-120b on tokens per day (TPD): Limit 200000, Used 197486, Requested 2921.",
          },
        }), {
          status: 429,
          headers: {
            "retry-after": "1",
            "x-ratelimit-remaining-tokens": "8000",
            // This short reset must not override the explicit daily-cap signal.
            "x-ratelimit-reset-tokens": "0.001s",
            "x-ratelimit-remaining-requests": "998",
          },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const result = await generateGroqBossText(
      {
        model: "openai/gpt-oss-120b",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 2,
        candidateModels: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
        keyName: "GROQ_BOSS_API_KEY",
      },
      "Return a small JSON decision.",
    );

    expect(result.raw).toBe('{"decision":"proceed"}');
    expect(result.error).toBeNull();
    expect(chatModels).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits through a bounded 46-second token reset and retries the same Boss model", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-boss-token-window-retry-key";
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { type: "tokens", code: "rate_limit_exceeded" } }), {
          status: 429,
          headers: {
            "retry-after": "20",
            "x-ratelimit-remaining-tokens": "3108",
            "x-ratelimit-reset-tokens": "46s",
            "x-ratelimit-remaining-requests": "998",
          },
        });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"decision":"proceed"}' } }] }), { status: 200 });
    });

    const pending = generateGroqBossText(
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
    await Promise.resolve();
    await vi.runAllTimersAsync();
    const result = await pending;

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
          "x-ratelimit-reset-tokens": "121s",
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
    expect(result.error).not.toContain("hard quota");
    // A token-window wait beyond the remaining decision budget should move to the
    // next bounded model of the same Boss capability, not terminate before fallback.
    expect(result.error).toContain("openai/gpt-oss-20b");
    expect(calls).toBe(2);
    expect(fetchMock.mock.calls[0]?.[1]).toBeTruthy();
    expect(fetchMock.mock.calls[1]?.[1]).toBeTruthy();
  });
});


describe("Groq Boss assignment-only opening response", () => {
  it("accepts only an available Investigator capability and never parses model-supplied candidates", () => {
    const parsed = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: "groq-investigator-1",
    }), ["groq-investigator-1"]);

    expect(parsed.investigatorLlm).toBe("groq-investigator-1");
    expect(parsed.report).toContain("No source observations exist yet");
    expect(parsed.candidates).toEqual([]);
    expect(parsed.nextDirections).toEqual([]);
    expect(parsed.uncertainties).toEqual([]);

    const fabricated = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: "groq-investigator-1",
      report: "Two source-attributed review leads were selected.",
      candidates: [
        { name: "Li", type: "person", sourceUrls: ["https://example.org/person/li"], contactEvidence: [] },
        { name: "3M", type: "company", sourceUrls: ["https://example.org/company/3m"], contactEvidence: [] },
      ],
      nextDirections: ["Verify the people and companies."],
      uncertainties: [],
    }), ["groq-investigator-1"]);

    expect(fabricated.investigatorLlm).toBeNull();
    expect(fabricated.candidates).toEqual([]);
    expect(fabricated.nextDirections).toEqual([]);
  });

  it("rejects malformed assignment responses and never preserves raw model text", () => {
    const parsed = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: "groq-investigator-1",
      candidates: [{ name: "   ", type: "person", sourceUrls: ["https://example.org/person"], contactEvidence: [] }],
    }), ["groq-investigator-1"]);

    expect(parsed.investigatorLlm).toBeNull();
    expect(parsed.report).toBe("");
    expect(parsed.candidates).toEqual([]);
  });
});
