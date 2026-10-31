import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterHumanNamesWithLLM,
  validateDiscoveryCandidatesWithLLM,
} from "../lib/llm-name-validator";

function stubNoGroqKeys() {
  for (let index = 0; index <= 10; index += 1) {
    vi.stubEnv(index === 0 ? "GROQ_API_KEY" : `GROQ_API_KEY_${index}`, "");
  }
}

function responseWithIndices(indices: number[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(indices) } }] }),
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("LLM name validation runtime boundary", () => {
  it("sends structurally valid Unicode, short, single-token, long and organization-like names to Groq unchanged", async () => {
    stubNoGroqKeys();
    vi.stubEnv("GROQ_API_KEY", "test-only-key");
    const names = [
      "Li",
      "张伟",
      "김민준",
      "محمد علي",
      "Дмитрий Иванов",
      "A Very Long Family Office Principal Name With Multiple Distinctive Parts Beyond Eighty Characters",
      "Example Holdings LLC",
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(responseWithIndices([1, 2, 3, 4, 5, 6, 7]));

    const accepted = await filterHumanNamesWithLLM(names);

    expect(accepted).toEqual(names);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const prompt = request.messages[0].content as string;
    for (const name of names) expect(prompt).toContain(`"${name}"`);
    expect(prompt).toContain("Non-Western names");
    expect(prompt).not.toContain("Latin-only");
  });

  it("removes malformed and explicit placeholder values structurally, without filtering valid language/script variants", async () => {
    stubNoGroqKeys();
    vi.stubEnv("GROQ_API_KEY", "test-only-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(responseWithIndices([1, 2, 3]));
    const candidates = ["Unknown", "Li", "张伟", "Not disclosed", "محمد علي", "bad\u0000name"];

    const accepted = await filterHumanNamesWithLLM(candidates);

    expect(accepted).toEqual(["Li", "张伟", "محمد علي"]);
    const prompt = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).messages[0].content as string;
    expect(prompt).not.toContain('"Unknown"');
    expect(prompt).not.toContain('"Not disclosed"');
    expect(prompt).not.toContain("bad");
  });

  it("does not call deterministic names 'validated' when Groq credentials are absent", async () => {
    stubNoGroqKeys();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(filterHumanNamesWithLLM(["Alexander Hamilton"])).resolves.toEqual([]);
    await expect(validateDiscoveryCandidatesWithLLM([{
      name: "Alexander Hamilton",
      snippet: "A source excerpt that names the candidate in a relevant context.",
      query: "family office principals",
    }])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not promote names after a transport failure", async () => {
    stubNoGroqKeys();
    vi.stubEnv("GROQ_API_KEY", "test-only-key");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));
    await expect(filterHumanNamesWithLLM(["Alexander Hamilton"])).resolves.toEqual([]);
    await expect(validateDiscoveryCandidatesWithLLM([{
      name: "Alexander Hamilton",
      snippet: "A source excerpt that names the candidate in a relevant context.",
      query: "family office principals",
    }])).resolves.toEqual([]);
  });

  it("keeps source-context admission separate from name-only structural validation", async () => {
    stubNoGroqKeys();
    vi.stubEnv("GROQ_API_KEY", "test-only-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(responseWithIndices([1]));
    await expect(validateDiscoveryCandidatesWithLLM([{
      name: "Li",
      snippet: "The exact name Li is attributed in this record to a private company ownership claim.",
      query: "public company ownership records",
    }])).resolves.toEqual(["Li"]);
    const prompt = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).messages[0].content as string;
    expect(prompt).toContain('NAME: "Li"');
    expect(prompt).toContain("SOURCE CONTEXT");
    expect(prompt).toContain("not merely to a nearby company");
  });
});
