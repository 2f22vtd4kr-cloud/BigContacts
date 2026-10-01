import { describe, expect, it } from "vitest";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "./research-cognitive-routing";

describe("research cognitive routing", () => {
  it("routes contradiction work to stronger reasoning models", () => {
    expect(inferResearchCognitiveTask({ nextMovePriority: "falsify" })).toBe("contradiction_resolution");
    const ranked = rankGroqModelsForTask(["openai/gpt-oss-20b", "openai/gpt-oss-120b"], "contradiction_resolution");
    expect(ranked[0]).toBe("openai/gpt-oss-120b");
  });
  it("routes discovery/contact work toward efficient models", () => {
    expect(inferResearchCognitiveTask({ nextMovePriority: "contact" })).toBe("contact_extraction");
    const ranked = rankGroqModelsForTask(["openai/gpt-oss-120b", "openai/gpt-oss-20b"], "contact_extraction");
    expect(ranked[0]).toBe("openai/gpt-oss-20b");
  });
});
