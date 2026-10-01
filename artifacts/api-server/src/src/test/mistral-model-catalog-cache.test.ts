import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: (input: string | URL, init?: RequestInit) => globalThis.fetch(input, init),
}));

import { resolveMistralChatModels } from "../lib/agentic-web-research-core";

describe("Mistral model catalog request budget", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("caches the model catalog instead of charging one catalog request per ReAct turn", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("api.mistral.ai/v1/models")) {
        throw new Error("unexpected outbound URL: " + url);
      }
      return new Response(JSON.stringify({
        data: [
          {
            id: "mistral-large-latest",
            capabilities: { completion_chat: true },
            created: 1770000000,
          },
          {
            id: "mistral-small-latest",
            capabilities: { completion_chat: true },
            created: 1760000000,
          },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const key = "test-mistral-cache-key-" + Date.now();
    const first = await resolveMistralChatModels(key, new AbortController().signal);
    const second = await resolveMistralChatModels(key, new AbortController().signal);

    expect(first).toEqual(["mistral-large-latest", "mistral-small-latest"]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
