/**
 * Canonical Groq chat models for Apex agentic research.
 * Keep in sync with artifacts/api-server/src/src/lib/groq-models.ts.
 */
const unique = (values: Array<string | undefined>): readonly string[] =>
  values.filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);

export const GROQ_DEFAULT_MODEL = process.env.GROQ_AGENTIC_MODEL?.trim() || "qwen/qwen3.8-27b";
const configuredAgenticModel = process.env.GROQ_AGENTIC_MODEL?.trim();

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

export const GROQ_FAST_MODELS: readonly string[] = configuredAgenticModel
  ? [configuredAgenticModel]
  : unique([
      process.env.GROQ_FAST_MODEL,
      "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
    ]);
