import { Router, type IRouter } from "express";
import { pingRedis, getRedisClient } from "../lib/redis";
import { getAIKeyStatus } from "../lib/ai-extractor";

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
    providers = {
      groq: active(status.groq),
      gemini: active(status.gemini),
      perplexity: active(status.perplexity),
      tavily: active(status.tavily),
      exa: active(status.exa),
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
  });
});

export default router;
