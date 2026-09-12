import { GROQ_DEFAULT_MODEL, GROQ_FAST_MODELS } from "./groq-models";
export { GROQ_FAST_MODELS, GROQ_DEFAULT_MODEL };
export const GROQ_MODEL_FAST = process.env.GROQ_FAST_MODEL?.trim() || process.env.GROQ_AGENTIC_MODEL?.trim() || GROQ_DEFAULT_MODEL;
