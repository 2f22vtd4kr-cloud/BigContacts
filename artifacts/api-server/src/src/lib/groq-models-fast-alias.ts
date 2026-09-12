export { GROQ_FAST_MODELS, GROQ_DEFAULT_MODEL } from "./groq-models";
export const GROQ_MODEL_FAST = process.env.GROQ_FAST_MODEL?.trim() || process.env.GROQ_AGENTIC_MODEL?.trim() || GROQ_DEFAULT_MODEL;
