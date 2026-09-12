/**
 * Canonical Groq chat models for Apex agentic research.
 */
const unique = (values: Array<string | undefined>): readonly string[] => values.filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);
export const GROQ_DEFAULT_MODEL = process.env.GROQ_AGENTIC_MODEL?.trim() || "qwen/qwen3.8-27b";
const configuredAgenticModel = process.env.GROQ_AGENTIC_MODEL?.trim();
export const GROQ_CHAT_MODELS: readonly string[] = unique([configuredAgenticModel, process.env.GROQ_MODEL, process.env.GROQ_CHAT_MODEL, "qwen/qwen3.8-27b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b", "openai/gpt-oss-20b"]);
export const GROQ_FAST_MODELS: readonly string[] = unique([process.env.GROQ_FAST_MODEL, configuredAgenticModel, "qwen/qwen3.8-27b", "qwen/qwen3.6-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
export const GROQ_MODEL_FAST = GROQ_FAST_MODELS[0] ?? GROQ_DEFAULT_MODEL;
globalThis.GROQ_MODEL_FAST = GROQ_MODEL_FAST;
