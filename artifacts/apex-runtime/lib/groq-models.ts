/**
 * Canonical Groq chat models after Llama 3.3 70B Versatile decommission (2026-08-16).
 * Keep in sync with artifacts/api-server/src/src/lib/groq-models.ts.
 * Never hard-code decommissioned ids in call sites.
 */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

/** Ordered try-list for chat / JSON / ReAct workloads. */
export const GROQ_CHAT_MODELS: readonly string[] = [
  process.env.GROQ_MODEL,
  process.env.GROQ_CHAT_MODEL,
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
].filter((m): m is string => Boolean(m && m.trim()));

/** Faster / lighter lane when full 120B is unnecessary. */
export const GROQ_FAST_MODELS: readonly string[] = [
  process.env.GROQ_FAST_MODEL,
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
].filter((m): m is string => Boolean(m && m.trim()));
