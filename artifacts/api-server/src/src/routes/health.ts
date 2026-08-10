import { Router, type IRouter } from "express";
import { pingRedis, getRedisClient } from "../lib/redis";
import { getAIKeyStatus } from "../lib/ai-extractor";
import { getMistralWebSearchStatus } from "../lib/mistral-web-search";
import { getNvidiaNimCaseReasoningStatus } from "../lib/nvidia-nim-case-reasoning";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const redisLatencyMs = await pingRedis();
  const redisStatus = getRedisClient()
    ? redisLatencyMs !== null
      ? "ok"
      : "error"
    : "not_connected";

  let providers: Record<string, number> | undefined;
  try {
    const status = getAIKeyStatus();
    const active = (slots: Array<{ state: string }>) =>
      slots.filter((s) => s.state === "active").length;
    const mistral = getMistralWebSearchStatus();
    const nvidia = getNvidiaNimCaseReasoningStatus();
    providers = {
      groq: active(status.groq),
      gemini: active(status.gemini),
      perplexity: active(status.perplexity),
      tavily: active(status.tavily),
      exa: active(status.exa),
      // Bureau lanes: 1 = configured, 0 = missing (never secret values).
      mistral: mistral.configured ? 1 : 0,
      nvidiaNim: nvidia.configured ? 1 : 0,
    };
  } catch {
    providers = undefined;
  }

  res.json({
    status: "ok",
    redis: {
      status: redisStatus,
      latencyMs: redisLatencyMs,
    },
    // Active key slot counts only — never secret values. 0 means restart API
    // after adding Replit secrets or OSINT will stay registry-shallow.
    providers,
    note: "Restart the API process after any secret change so provider slot counts refresh. ENABLE_AUTO_PIPELINE=false is the safe operator floor — do not auto-start research jobs.",
    autoPipeline: process.env.ENABLE_AUTO_PIPELINE === "true",
  });
});

export default router;
