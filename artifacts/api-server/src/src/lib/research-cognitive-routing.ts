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

export function rankGroqModelsForTask(models: readonly string[], _task: ResearchCognitiveTask): string[] {
  // Preserve the canonical configured model order. Cognitive-task routing may
  // describe the work, but it must not silently down-route discovery/identity
  // turns to a smaller model and thereby reduce Investigator reasoning capacity.
  return [...models];
}
