/**
 * Cognitive-task routing hints for Investigator model selection.
 *
 * Routing never changes the Investigator role or introduces another provider.
 * It only expresses which cognitive mode deserves more reasoning budget when the
 * selected provider exposes more than one compatible model.
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
    if (qwen) return task === "contact_extraction" || task === "discovery" ? 3 : 4;
    if (task === "identity_resolution" || task === "contradiction_resolution" || task === "final_adjudication") return large ? 2 : small ? 0 : 1;
    if (task === "contact_extraction" || task === "discovery") return small ? 2 : large ? 1 : 0;
    return 1;
  };
  return [...models].sort((a, b) => score(b) - score(a) || a.localeCompare(b));
}
