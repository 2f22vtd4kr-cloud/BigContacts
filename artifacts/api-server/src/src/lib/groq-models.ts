/**
 * Canonical Groq chat models. Explicit environment configuration wins: the
 * operator's selected agentic model must not be silently shadowed by a newer
 * default that happens to be first in a static fallback list.
 */
const uniqueConfiguredFirst = (values: Array<string | undefined>): readonly string[] =>
  values.filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);

export const GROQ_DEFAULT_MODEL = process.env.GROQ_AGENTIC_MODEL?.trim() || "openai/gpt-oss-20b";

/** Ordered try-list for chat / JSON / ReAct workloads. */
export const GROQ_CHAT_MODELS: readonly string[] = uniqueConfiguredFirst([
  process.env.GROQ_AGENTIC_MODEL,
  process.env.GROQ_MODEL,
  process.env.GROQ_CHAT_MODEL,
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
]);

/** Faster / lighter lane when full 120B is unnecessary. */
export const GROQ_FAST_MODELS: readonly string[] = uniqueConfiguredFirst([
  process.env.GROQ_FAST_MODEL,
  process.env.GROQ_AGENTIC_MODEL,
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
]);
