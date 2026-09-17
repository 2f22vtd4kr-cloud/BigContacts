/**
 * Compatibility surface for the historical Right-hand import path.
 * The implementation is Gemini-only; no DeepSeek/NVIDIA key, endpoint, model,
 * or fallback is used. New code should import gemini-right-hand-reasoning.ts.
 */
export {
  getGeminiRightHandStatus as getDeepSeekCaseReasoningStatus,
  runGeminiRightHandCaseReasoning as runDeepSeekCaseReasoning,
  runGeminiRightHandDiscoveryAdvice as runDeepSeekDiscoveryAdvice,
  runGeminiRightHandFreeJson as runDeepSeekFreeJson,
  runGeminiRightHandFinalReview as runDeepSeekFinalReview,
  GEMINI_RIGHT_HAND_MODEL as DEEPSEEK_CASE_REASONING_MODEL,
} from "./gemini-right-hand-reasoning";
export type {
  GeminiRightHandCaseReasoningResult as DeepSeekCaseReasoningResult,
  GeminiRightHandStatus as DeepSeekCaseReasoningStatus,
  GeminiRightHandDiscoveryAdviceResult as DeepSeekDiscoveryAdviceResult,
} from "./gemini-right-hand-reasoning";
