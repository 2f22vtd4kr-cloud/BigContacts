/**
 * Canonical Groq chat models for Apex agentic research.
 *
 * An explicitly configured model is the preferred first choice, not a single
 * point of failure. Provider capacity is volatile: a model can be healthy at
 * preflight and exhaust its quota during a long Bureau run. The investigator
 * therefore retains a provider-local fallback list while the model still owns
 * every research action.
 */
const unique = (values: Array<string | undefined>): readonly string[] =>
  values.filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);

export const GROQ_DEFAULT_MODEL = process.env.GROQ_AGENTIC_MODEL?.trim() || "qwen/qwen3.8-27b";

const configuredAgenticModel = process.env.GROQ_AGENTIC_MODEL?.trim();

/** Ordered try-list for chat / JSON / ReAct workloads. */
export const GROQ_CHAT_MODELS: readonly string[] = unique([
  configuredAgenticModel,
  process.env.GROQ_MODEL,
  process.env.GROQ_CHAT_MODEL,
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
]);

/** Faster / lighter lane when full agentic model is unnecessary. */
export const GROQ_FAST_MODELS: readonly string[] = unique([
  process.env.GROQ_FAST_MODEL,
  configuredAgenticModel,
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
]);
