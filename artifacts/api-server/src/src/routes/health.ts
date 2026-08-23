import { Router, type IRouter } from "express";
import { pingRedis, getPermanentClient } from "../lib/redis";
import { getAIKeyStatus } from "../lib/ai-extractor";
import { getMistralWebSearchStatus } from "../lib/mistral-web-search";
import { getNvidiaNimCaseReasoningStatus } from "../lib/nvidia-nim-case-reasoning";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const redisLatencyMs = await pingRedis();
  // Permanent bureau Redis (REDIS_URL_1) — not the optional local cache client.
  const redisStatus = getPermanentClient()
    ? redisLatencyMs !== null
      ? "ok"
      : "error"
    : "not_connected";

  let providers: Record<string, number> | undefined;
  let lanesHonesty: ReturnType<typeof buildLanesHonestySnapshot> | undefined;
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
      companiesHouse: process.env.COMPANIES_HOUSE_API_KEY ? 1 : 0,
      serper: [process.env.SERPER_API_KEY, process.env.SERPER_API_KEY_2, process.env.SERPER_API_KEY_3, process.env.SERPER_KEY].some((k) => Boolean(k?.trim())) ? 1 : 0,
      scrapfly: process.env.SCRAPFLY_API_KEY ? 1 : 0,
      zenrows: process.env.ZENROWS_API_KEY ? 1 : 0,
      whoxy: [process.env.WHOXY_API_KEY, process.env.WHOXY_KEY, process.env.Whoxy_Key, process.env.WHOXY].some((k) => Boolean(k?.trim())) ? 1 : 0,
      whoisjson: process.env.WHOISJSON_API_KEY ? 1 : 0,
    };
    lanesHonesty = buildLanesHonestySnapshot();
  } catch {
    providers = undefined;
    lanesHonesty = undefined;
  }

  const registryShallowRisk = lanesHonesty?.registryShallowRisk ?? (providers
    ? (providers.perplexity + providers.tavily + providers.exa + providers.serper) === 0
    : true);

  res.json({
    status: "ok",
    redis: {
      status: redisStatus,
      latencyMs: redisLatencyMs,
    },
    // Active key slot counts only — never secret values. 0 means restart API
    // after adding Replit secrets or OSINT will stay registry-shallow.
    providers,
    lanesHonesty,
    registryShallowRisk,
    bureauIntegrity: lanesHonesty?.bureauIntegrity ?? "critical",
    bureauIntegrityReasons: lanesHonesty?.bureauIntegrityReasons ?? [],
    note: registryShallowRisk
      ? "registryShallowRisk=true: no Serper/Tavily/Exa/Perplexity slots — discovery may be registry-only. Restart API after secret changes."
      : "Restart the API process after any secret change so provider slot counts refresh. ENABLE_AUTO_PIPELINE=false is the safe operator floor. Check bureauIntegrity before research.",
    autoPipeline: process.env.ENABLE_AUTO_PIPELINE === "true",
  });
});

export default router;
