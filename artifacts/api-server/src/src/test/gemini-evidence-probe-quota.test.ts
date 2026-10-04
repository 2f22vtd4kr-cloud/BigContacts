import { afterEach, describe, expect, it, vi } from "vitest";
import { safeOutboundFetch } from "../lib/ssrf-safe-fetch";
import { runGeminiEvidenceProbe } from "../lib/gemini-evidence-probe";

vi.mock("../lib/ssrf-safe-fetch", () => ({ safeOutboundFetch: vi.fn() }));

describe("Gemini evidence probe quota boundaries", () => {
  afterEach(() => {
    for (const name of ["GEMINI_API_KEY", "GEMINI_KEY", ...Array.from({ length: 13 }, (_, i) => `GEMINI_API_KEY_${i + 1}`)] as const) delete process.env[name];
    vi.restoreAllMocks();
  });

  it("does not rotate across Gemini keys after a provider 429", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gemini-primary");
    vi.stubEnv("GEMINI_API_KEY_1", "gemini-secondary");

    const fetchMock = vi.mocked(safeOutboundFetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === "https://generativelanguage.googleapis.com/v1beta/models") {
        return new Response(JSON.stringify({
          models: [{ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        error: { code: "rate_limit_exceeded", message: "short burst limit" },
      }), { status: 429, headers: { "retry-after": "999" } });
    });

    const result = await runGeminiEvidenceProbe({ claim: "A named subject holds a public role." });

    expect(result.status).toBe("unavailable");
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes(":generateContent"))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === "https://generativelanguage.googleapis.com/v1beta/models")).toHaveLength(1);
  });
});
