import { afterEach, describe, expect, it, vi } from "vitest";
import { runGeminiRightHandCaseReasoning } from "../lib/gemini-right-hand-reasoning";

describe("Gemini Right-hand structured output", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
  });

  it("enforces structured JSON and retries the same model without response_format on HTTP 400", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: Array<{ url: string; body?: Record<string, unknown> }> = [];

    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ url, body });

      if (calls.length === 1) {
        return new Response(JSON.stringify({
          models: [{ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (calls.length === 2) {
        return new Response(JSON.stringify({
          error: { code: "invalid_request", message: "structured output rejected" },
        }), { status: 400, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          actionId: "act-1",
          decision: "Run the queued action",
          reason: "It addresses the open evidence gap.",
          confidence: 0.8,
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const result = await runGeminiRightHandCaseReasoning({
      iteration: 1,
      file: {
        target: { name: "Example", type: "person", nationality: null, knownResidences: [], knownDomains: [] },
        hypotheses: [],
        evidenceSummary: { sourceRegistries: [], discoveredPeople: [], relatedOrganizations: [], evidenceCount: 0, searchGaps: [], negativeFindings: [] },
        specialistRoster: [],
        actionQueue: [{
          id: "act-1",
          title: "Test action",
          purpose: "Test",
          specialistId: "test",
          tools: [],
          priority: 1,
          status: "queued",
          rationale: "Test",
        }],
        contactRoutes: [],
        humanDirectives: [],
        decisionLog: [],
        nextBestAction: null,
        lastUpdatedBy: "test",
      },
    });

    expect(result.status).toBe("completed");
    expect(result.actionId).toBe("act-1");
    expect(calls).toHaveLength(3);
    expect(calls[1].body?.model).toBe("gemini-3.8-flash");
    expect(calls[1].body?.response_format).toBeDefined();
    expect(calls[2].body?.model).toBe("gemini-3.8-flash");
    expect(calls[2].body?.response_format).toBeUndefined();
  });
});
