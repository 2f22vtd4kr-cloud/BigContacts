/**
 * Canonical Groq chat models for Apex agentic research.
 */
const unique = (values: Array<string | undefined>): readonly string[] => values.filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);
const configuredAgenticModel = process.env.GROQ_AGENTIC_MODEL?.trim() || process.env.GROQ_MODEL?.trim() || process.env.GROQ_CHAT_MODEL?.trim();
// Investigator cognition is a capability-owned model choice. Default to the
// strongest canonical Investigator model and require an explicit environment
// override to select another model; never silently rotate models after failure.
export const GROQ_DEFAULT_MODEL = configuredAgenticModel || "openai/gpt-oss-120b";
export const GROQ_CHAT_MODELS: readonly string[] = [GROQ_DEFAULT_MODEL];
export const GROQ_FAST_MODELS: readonly string[] = unique([process.env.GROQ_FAST_MODEL, configuredAgenticModel, "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
export const GROQ_MODEL_FAST = GROQ_FAST_MODELS[0] ?? GROQ_DEFAULT_MODEL;
globalThis.GROQ_MODEL_FAST = GROQ_MODEL_FAST;
