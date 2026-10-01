import type { ThinkingLevel } from "./research-epistemic-vnext";
export type GeminiThinkingRisk = { contradictionPressure?: number; identityAmbiguity?: number; falsificationRequired?: boolean; terminalDecision?: boolean; routine?: boolean };
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function selectGeminiThinkingLevel(model: string, risk: GeminiThinkingRisk = {}): ThinkingLevel {
  const contradiction = clamp(risk.contradictionPressure ?? 0); const ambiguity = clamp(risk.identityAmbiguity ?? 0);
  const normalized = model.replace(/^models\\//, "").toLowerCase(); const lite = /flash-lite/.test(normalized);
  if (contradiction >= 0.7 || ambiguity >= 0.8 || risk.falsificationRequired || risk.terminalDecision) return "high";
  if (contradiction >= 0.35 || ambiguity >= 0.45) return "medium";
  if (risk.routine) return lite ? "minimal" : "low";
  return lite ? "low" : "medium";
}
export function thinkingLevelForRole(role: "boss" | "right_hand", model: string, risk: GeminiThinkingRisk = {}): ThinkingLevel {
  return selectGeminiThinkingLevel(model, { ...risk, routine: risk.routine ?? role === "right_hand" });
}
