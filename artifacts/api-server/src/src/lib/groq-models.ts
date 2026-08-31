/**
 * Canonical Groq chat models for Apex agentic research.
 *
 * If GROQ_AGENTIC_MODEL is explicitly configured, it is the only model used by
 * the agentic lane. This prevents a quota-exhausted primary model from silently
 * falling through to another model with a different quota/behavior profile.
 */
const unique = (values: Array<string | undefined>): readonly string[] =>
  values.filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);

export const GROQ_DEFAULT_MODEL = process.env.GROQ_AGENTIC_MODEL?.trim() || "qwen/qwen3.8-27b";

const configuredAgenticModel = process.env.GROQ_AGENTIC_MODEL?.trim();

/** Ordered try-list for chat / JSON / ReAct workloads. */
export const GROQ_CHAT_MODELS: readonly string[] = configuredAgenticModel
  ? [configuredAgenticModel]
  : unique([
      process.env.GROQ_MODEL,
      process.env.GROQ_CHAT_MODEL,
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "qwen/qwen3.6-27b",
      "openai/gpt-oss-20b",
    ]);

/** Faster / lighter lane when full agentic model is unnecessary. */
export const GROQ_FAST_MODELS: readonly string[] = configuredAgenticModel
  ? [configuredAgenticModel]
  : unique([
      process.env.GROQ_FAST_MODEL,
      "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
    ]);
