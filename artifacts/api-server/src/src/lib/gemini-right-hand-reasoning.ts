/**
 * Compatibility shim.
 * The canonical Apex Atlas Right-hand provider is Mistral.
 * Keep these legacy names only for unchanged Bureau/test imports; no Gemini
 * Right-hand transport remains here.
 */
export {
  getMistralRightHandStatus as getGeminiRightHandStatus,
  runMistralRightHandCaseReasoning as runGeminiRightHandCaseReasoning,
  runMistralRightHandDiscoveryAdvice as runGeminiRightHandDiscoveryAdvice,
  runMistralRightHandFreeJson as runGeminiRightHandFreeJson,
  runMistralRightHandFinalReview as runGeminiRightHandFinalReview,
  runMistralRightHandReadiness as runGeminiRightHandReadiness,
  MISTRAL_RIGHT_HAND_MODEL as GEMINI_RIGHT_HAND_MODEL,
  MISTRAL_RIGHT_HAND_FALLBACK_MODELS as GEMINI_RIGHT_HAND_FALLBACK_MODELS,
} from "./mistral-right-hand-reasoning";
export type {
  MistralRightHandCaseReasoningResult as GeminiRightHandCaseReasoningResult,
  MistralRightHandStatus as GeminiRightHandStatus,
  MistralRightHandDiscoveryAdviceResult as GeminiRightHandDiscoveryAdviceResult,
  MistralRightHandLatencyConfig as GeminiRightHandLatencyConfig,
} from "./mistral-right-hand-reasoning";
export { getMistralRightHandLatencyConfig as getGeminiRightHandLatencyConfig } from "./mistral-right-hand-reasoning";
