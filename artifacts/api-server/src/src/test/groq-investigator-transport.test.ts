import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transportMocks = vi.hoisted(() => ({
  responses: [] as unknown[],
  safeOutboundFetch: vi.fn(),
  reserveDailyBudget: vi.fn(),
  recordAttempt: vi.fn(),
}));

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: transportMocks.safeOutboundFetch,
}));

vi.mock("../lib/agentic-llm-telemetry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/agentic-llm-telemetry")>();
  return {
    ...actual,
    reserveAgenticLlmDailyBudget: transportMocks.reserveDailyBudget,
    recordAgenticLlmAttempt: transportMocks.recordAttempt,
  };
});

import { callGroqJson } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";

const strictInvestigatorPrompt = [
  "PRE-LAUNCH TRANSPORT TEST.",
  "OUTPUT CONTRACT: JSON object only.",
  "ALL REQUIRED TOP-LEVEL FIELDS: action, query, provider, url, email, username, domain, registry, thought, hypothesis, purpose, expectedInformationGain, locale, market, target, targetType, profile, sources, searches, findings.",
  "Include every key; use null for unused scalar fields and [] for unused arrays.",
  "searches[] required keys: query, provider, registry, locale, market, purpose.",
  "findings[] required keys: vectorType, value, personName, role, scope, sourceUrls, note, contactAttribution, exactQuote, identityAssessment, identityRationale, hypothesisRelation, hypothesisRationale, relationshipType, temporalStatus, interpretationConfidence, ambiguityNotes, promotionDecision, promotionReason; null for unused optional nested values.",
].join("\n\n");

function groqResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-remaining-tokens": "100000",
      "x-ratelimit-reset-tokens": "60s",
    },
  });
}

async function callTransport(strictPreflight = false) {
  return callGroqJson(
    strictInvestigatorPrompt,
    new AbortController().signal,
    "identity_resolution",
    "groq-investigator-1",
    undefined,
    null,
    null,
    ["web_search"],
    "transport-contract-probe",
    0,
    strictInvestigatorPrompt.length,
    "discovery",
    strictPreflight,
  );
}

describe("Groq Investigator HTTP transport recovery", () => {
  beforeEach(() => {
    resetProviderGateForTests();
    vi.stubEnv("GROQ_INVESTIGATOR_API_KEY", "transport-test-key");
    vi.stubEnv("APEX_ENABLE_GROQ_INVESTIGATOR_20B", "false");
    vi.stubEnv("GROQ_AGENTIC_MODEL", "openai/gpt-oss-120b");
    vi.stubEnv("APEX_PROVIDER_MIN_INTERVAL_MS_GROQ", "0");
    transportMocks.responses = [];
    transportMocks.safeOutboundFetch.mockReset();
    transportMocks.reserveDailyBudget.mockReset();
    transportMocks.recordAttempt.mockReset();
    transportMocks.reserveDailyBudget.mockResolvedValue({
      usageDate: "2026-11-19",
      reservedTokens: 2_000,
      dailyBudgetTokens: 1_000_000,
    });
    transportMocks.safeOutboundFetch.mockImplementation(async (_url: string, _init: RequestInit, onRequest?: () => void) => {
      onRequest?.();
      const next = transportMocks.responses.shift();
      if (!(next instanceof Response)) throw new Error("transport test response queue exhausted");
      return next;
    });
  });

  afterEach(() => {
    resetProviderGateForTests();
    vi.unstubAllEnvs();
  });

  it("reaches the bounded JSON-object recovery after a json_validate_failed HTTP 400", async () => {
    transportMocks.responses.push(
      groqResponse(400, {
        error: {
          message: "Generated output failed JSON validation.",
          type: "invalid_request_error",
          code: "json_validate_failed",
        },
      }),
      groqResponse(200, {
        choices: [{
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              action: "web_search",
              query: "Apex Investigator transport recovery probe",
              provider: null,
              thought: "Verify the provider recovery path.",
              hypothesis: "The output-validation failure can recover without changing the selected model.",
              purpose: "Exercise the real Groq transport's JSON-object retry.",
              expectedInformationGain: 0.2,
            }),
          },
        }],
      }),
    );

    const result = await callTransport();

    expect(result?.model).toBe("openai/gpt-oss-120b");
    expect(result?.raw).toContain("Apex Investigator transport recovery probe");
    expect(transportMocks.safeOutboundFetch).toHaveBeenCalledTimes(2);
    const firstRequest = JSON.parse(transportMocks.safeOutboundFetch.mock.calls[0]?.[1]?.body as string);
    const retryRequest = JSON.parse(transportMocks.safeOutboundFetch.mock.calls[1]?.[1]?.body as string);
    expect(firstRequest.response_format.type).toBe("json_schema");
    expect(retryRequest.response_format.type).toBe("json_object");
  });

  it("blocks a strict-schema launch preflight on its first HTTP 400 without compatibility fallback", async () => {
    transportMocks.responses.push(groqResponse(400, {
      error: {
        message: "Generated output failed JSON validation.",
        type: "invalid_request_error",
        code: "json_validate_failed",
      },
    }));

    const result = await callTransport(true);

    expect(result?.error).toBe("provider_contract_error");
    expect(transportMocks.safeOutboundFetch).toHaveBeenCalledTimes(1);
    const request = JSON.parse(transportMocks.safeOutboundFetch.mock.calls[0]?.[1]?.body as string);
    expect(request.response_format.type).toBe("json_schema");
  });

  it("fails fast on an invalid_request_error response_format HTTP 400 without a retry", async () => {
    transportMocks.responses.push(groqResponse(400, {
      error: {
        message: "Invalid response format.",
        type: "invalid_request_error",
        code: "invalid_request_error",
        param: "response_format",
      },
    }));

    const result = await callTransport();

    expect(result?.error).toBe("provider_contract_error");
    expect(transportMocks.safeOutboundFetch).toHaveBeenCalledTimes(1);
  });

  it("fails fast on a missing-required-keys schema rejection even when Groq labels it json_validate_failed", async () => {
    transportMocks.responses.push(groqResponse(400, {
      error: {
        message: "14 required keys are missing from the response object.",
        type: "invalid_request_error",
        code: "json_validate_failed",
      },
    }));

    const result = await callTransport();

    expect(result?.error).toBe("provider_contract_error");
    expect(transportMocks.safeOutboundFetch).toHaveBeenCalledTimes(1);
  });
});
