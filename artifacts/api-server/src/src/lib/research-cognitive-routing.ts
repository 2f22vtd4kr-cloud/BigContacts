/**
 * Cognitive-task routing hints for Investigator model selection.
 *
 * Routing never changes the Investigator role or introduces another provider.
 * It routes routine turns to the cheapest capable same-role model and reserves
 * the largest model for genuinely difficult contradiction/adjudication work. This
 * changes model selection within Groq; it never changes the Investigator provider.
 */
export type ResearchCognitiveTask = "discovery" | "identity_resolution" | "contact_extraction" | "contradiction_resolution" | "final_adjudication";

export function inferResearchCognitiveTask(input: {
  nextMovePriority?: "explore" | "verify" | "falsify" | "contact";
  action?: string;
  terminal?: boolean;
}): ResearchCognitiveTask {
  if (input.terminal) return "final_adjudication";
  if (input.nextMovePriority === "falsify") return "contradiction_resolution";
  if (input.nextMovePriority === "contact") return "contact_extraction";
  if (input.nextMovePriority === "verify") return "identity_resolution";
  if (input.action === "web_search" || input.action === "registry_search") return "discovery";
  return "identity_resolution";
}

export function rankGroqModelsForTask(models: readonly string[], task: ResearchCognitiveTask): string[] {
  const score = (model: string): number => {
    const name = model.toLowerCase();
    const qwen = name === "qwen/qwen3.8-27b";
    const large = /120b|70b|large/.test(name);
    const small = /(^|[-_/])20b($|[-_/])/.test(name) || /(^|[-_/])8b($|[-_/])/.test(name) || /small|lite/.test(name);
    if (task === "contradiction_resolution" || task === "final_adjudication") {
      if (large) return 4;
      if (qwen) return 3;
      if (small) return 1;
      return 2;
    }
    if (task === "identity_resolution") {
      // Identity work is frequent and usually benefits more from fresh evidence than
      // from maximum reasoning depth. Keep GPT-OSS 20B first so repeated target turns
      // do not consume the 120B budget.
      if (small) return 4;
      if (qwen) return 3;
      if (large) return 2;
      return 1;
    }
    if (task === "contact_extraction" || task === "discovery") {
      // These turns are high-frequency tool-selection decisions. GPT-OSS 20B is
      // faster, cheaper, and supports prompt caching; Qwen remains the next choice.
      if (small) return 4;
      if (qwen) return 3;
      if (large) return 2;
      return 1;
    }
    return 1;
  };
  return [...models].sort((a, b) => score(b) - score(a) || a.localeCompare(b));
}
