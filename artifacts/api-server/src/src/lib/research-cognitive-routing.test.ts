import { describe, expect, it } from "vitest";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "./research-cognitive-routing";

describe("research cognitive routing", () => {
  it("preserves configured model order instead of silently down-routing Investigator reasoning", () => {
    const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    for (const task of ["discovery", "identity_resolution", "contact_extraction", "contradiction_resolution", "final_adjudication"] as const) {
      expect(rankGroqModelsForTask(models, task)).toEqual(models);
    }
  });
});
