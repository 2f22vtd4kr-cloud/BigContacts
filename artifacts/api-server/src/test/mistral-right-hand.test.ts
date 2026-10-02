import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  MISTRAL_RIGHT_HAND_MODEL,
  getMistralRightHandStatus,
  runMistralRightHandCaseReasoning,
  runMistralRightHandFreeJson,
  runMistralRightHandReadiness,
} from "../src/lib/mistral-right-hand-reasoning";

describe("Mistral Right-hand control-plane boundary", () => {
  const originalKey = process.env.MISTRAL_RIGHT_HAND_API_KEY;

  beforeEach(() => {
    process.env.MISTRAL_RIGHT_HAND_API_KEY = "test-mistral-key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_2;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_3;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_4;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_5;
    if (originalKey === undefined) delete process.env.MISTRAL_RIGHT_HAND_API_KEY;
    else process.env.MISTRAL_RIGHT_HAND_API_KEY = originalKey;
  });

  it("does not consume the Investigator MISTRAL_API_KEY credential", () => {
    const rightHandKey = process.env.MISTRAL_RIGHT_HAND_API_KEY;
    const investigatorKey = process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY;
    process.env.MISTRAL_API_KEY = "investigator-only-key";
    expect(getMistralRightHandStatus().configured).toBe(false);
    if (rightHandKey === undefined) delete process.env.MISTRAL_RIGHT_HAND_API_KEY;
    else process.env.MISTRAL_RIGHT_HAND_API_KEY = rightHandKey;
    if (investigatorKey === undefined) delete process.env.MISTRAL_API_KEY;
    else process.env.MISTRAL_API_KEY = investigatorKey;
  });

  it("reports Mistral as the independent Right-hand provider", () => {
    const status = getMistralRightHandStatus();
    expect(status.provider).toBe("mistral");
    expect(status.role).toBe("right_hand_advisor");
    expect(status.model).toBe(MISTRAL_RIGHT_HAND_MODEL);
  });

  it("resolves the live Mistral catalog and uses Chat Completions for JSON control", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ id: MISTRAL_RIGHT_HAND_MODEL }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      }), { status: 200 }));

    const result = await runMistralRightHandFreeJson(
      'Return {"ok":true}.',
      "Return exactly one JSON object.",
      { type: "json_schema", schema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
        additionalProperties: false,
      } },
    );

    expect(result.status).toBe("completed");
    expect(result.model).toBe(MISTRAL_RIGHT_HAND_MODEL);
    expect(JSON.parse(result.raw!)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const chatCall = fetchMock.mock.calls[1]!;
    expect(chatCall[0]).toContain("/v1/chat/completions");
    const init = chatCall[1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-mistral-key");
    expect(String(init.body)).toContain('"type":"json_schema"');
  });

  it("fails closed before provider generation when model-facing context exceeds the bound", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await runMistralRightHandFreeJson("x".repeat(20_001));
    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("upstream case-context compaction is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not turn ordinary status metadata into a provider generation call", () => {
    const status = getMistralRightHandStatus();
    expect(status.endpoint).toContain("/v1/chat/completions");
  });

  it("preserves structured 429 diagnostics instead of coercing the provider body to [object Object]", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: MISTRAL_RIGHT_HAND_MODEL }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: "too_many_requests", message: "daily quota exceeded for free tier" },
      }), { status: 429, headers: { "retry-after": "10" } }));
    const result = await runMistralRightHandFreeJson("Return JSON.");
    expect(result.status).toBe("unavailable");
    expect(result.error).not.toContain("[object Object]");
    expect(result.error).toContain('"httpStatus":429');
    expect(result.error).toContain('"providerCode":"quota_exceeded"');
    expect(result.error).toContain('"retryAfterMs":5000');
    expect(result.error).toContain('"retryAfterHeader":"10"');
    expect(result.error).toContain('"retry429":0');
  });

  it("continues readiness across a failed primary credential when a secondary role-scoped key is usable", async () => {
    process.env.MISTRAL_RIGHT_HAND_API_KEY = "primary-key";
    process.env.MISTRAL_RIGHT_HAND_API_KEY_2 = "secondary-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "too_many_requests" } }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: MISTRAL_RIGHT_HAND_MODEL }] }), { status: 200 }));
    const result = await runMistralRightHandReadiness();
    expect(result.status).toBe("ready");
    expect(result.model).toBe(MISTRAL_RIGHT_HAND_MODEL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses an explicit catalog-only readiness operation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: MISTRAL_RIGHT_HAND_MODEL }] }), { status: 200 }),
    );
    const result = await runMistralRightHandReadiness();
    expect(result.status).toBe("ready");
    expect(result.candidateModels).toContain(MISTRAL_RIGHT_HAND_MODEL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/v1/models");
  });
});
