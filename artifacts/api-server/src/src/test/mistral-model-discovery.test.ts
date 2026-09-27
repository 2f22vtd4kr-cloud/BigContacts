import { afterEach, describe, expect, it } from "vitest";
import { resetProviderGateForTests } from "../lib/provider-gate";
import { resolveMistralChatModels } from "../lib/agentic-web-research-core";

describe("Mistral live model discovery", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    delete process.env.MISTRAL_AGENTIC_MODEL;
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL;
    resetProviderGateForTests();
  });

  function catalog(cards: unknown[], status = 200): Response {
    return new Response(JSON.stringify({ object: "list", data: cards }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("prefers the configured model only when the live catalog says it is chat-capable and active", async () => {
    process.env.MISTRAL_AGENTIC_MODEL = "mistral-small-latest";
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";
    globalThis.fetch = async () => catalog([
      { id: "mistral-small-latest", created: 10, archived: false, capabilities: { completion_chat: true } },
      { id: "mistral-large-3", created: 20, archived: false, capabilities: { completion_chat: true } },
    ]);

    await expect(resolveMistralChatModels("test-key", new AbortController().signal))
      .resolves.toEqual(["mistral-small-latest", "mistral-large-3"]);
  });

  it("rejects configured models that are archived or not chat-capable", async () => {
    process.env.MISTRAL_AGENTIC_MODEL = "mistral-old";
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";
    globalThis.fetch = async () => catalog([
      { id: "mistral-old", created: 30, archived: true, capabilities: { completion_chat: true } },
      { id: "vision-only", created: 40, archived: false, capabilities: { completion_chat: false } },
      { id: "mistral-small-latest", created: 20, archived: false, capabilities: { completion_chat: true } },
      { id: "mistral-medium-3-5", created: 50, archived: false, capabilities: { completion_chat: true } },
    ]);

    await expect(resolveMistralChatModels("test-key", new AbortController().signal))
      .resolves.toEqual(["mistral-medium-3-5", "mistral-small-latest"]);
  });

  it("excludes fine-tuned cards and deduplicates catalog identifiers", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";
    globalThis.fetch = async () => catalog([
      { id: "ft:custom", created: 100, archived: false, TYPE: "fine-tuned", capabilities: { completion_chat: true } },
      { id: "mistral-small-latest", created: 20, archived: false, capabilities: { completion_chat: true } },
      { id: "mistral-small-latest", created: 20, archived: false, capabilities: { completion_chat: true } },
    ]);

    await expect(resolveMistralChatModels("test-key", new AbortController().signal))
      .resolves.toEqual(["mistral-small-latest"]);
  });

  it("fails closed when the live catalog cannot be retrieved", async () => {
    process.env.MISTRAL_AGENTIC_MODEL = "mistral-small-latest";
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";
    globalThis.fetch = async () => new Response("unauthorized", { status: 401 });

    await expect(resolveMistralChatModels("test-key", new AbortController().signal))
      .resolves.toEqual([]);
  });

  it("does not invent a retired fallback when it is absent from the live catalog", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";
    globalThis.fetch = async () => catalog([
      { id: "mistral-small-latest", created: 20, archived: false, capabilities: { completion_chat: true } },
    ]);

    await expect(resolveMistralChatModels("test-key", new AbortController().signal))
      .resolves.toEqual(["mistral-small-latest"]);
  });
});
