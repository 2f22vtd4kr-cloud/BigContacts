import { describe, expect, it } from "vitest";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "./research-cognitive-routing";

describe("research cognitive routing", () => {
  it("routes contradiction work to stronger reasoning models", () => {
    expect(inferResearchCognitiveTask({ nextMovePriority: "falsify" })).toBe("contradiction_resolution");
    const ranked = rankGroqModelsForTask(["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"], "contradiction_resolution");
    expect(ranked[0]).toBe("openai/gpt-oss-120b");
    expect(ranked).toEqual(["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]);
  });
  it("routes discovery/contact work toward efficient models", () => {
    expect(inferResearchCognitiveTask({ nextMovePriority: "contact" })).toBe("contact_extraction");
    const ranked = rankGroqModelsForTask(["openai/gpt-oss-120b", "openai/gpt-oss-20b"], "contact_extraction");
    expect(ranked[0]).toBe("openai/gpt-oss-20b");
    expect(ranked).toEqual(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
    expect(rankGroqModelsForTask(["qwen/qwen3.8-27b", "openai/gpt-oss-120b"], "identity_resolution")[0]).toBe("openai/gpt-oss-120b");
    expect(rankGroqModelsForTask(["qwen/qwen3.8-27b", "openai/gpt-oss-120b"], "discovery")[0]).toBe("qwen/qwen3.8-27b");
  });
});
