import { Router, type IRouter } from "express";
import { pingRedis, getPermanentClient, getRedisHealthSnapshot } from "../lib/redis";
import { getAIKeyStatus } from "../lib/ai-extractor";
import { getMistralWebSearchStatus } from "../lib/mistral-web-search";
import { getDeepSeekCaseReasoningStatus } from "../lib/deepseek-case-reasoning";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";

const router: IRouter = Router();

async function redisSnapshot() {
  let snap = getRedisHealthSnapshot();
  if (!snap.cached && getPermanentClient()) {
    const latencyMs = await Promise.race([pingRedis(), new Promise<null>((r) => setTimeout(() => r(null), 800))]);
    snap = { status: getPermanentClient() ? (latencyMs !== null ? "ok" : "error") : "not_connected", latencyMs, cached: false };
  } else if (snap.cached) {
    void pingRedis();
  }
  return snap;
}

router.get("/healthz", async (_req, res) => {
  const snap = await redisSnapshot();
  // Public probes intentionally reveal only liveness and the distributed-store
  // health needed by the load balancer. Provider inventory and research posture
  // belong to the authenticated diagnostic endpoint below.
  res.json({ status: "ok", redis: { status: snap.status, latencyMs: snap.latencyMs, cached: snap.cached } });
});

router.get("/healthz/details", async (_req, res) => {
  const snap = await redisSnapshot();
  let providers: Record<string, number> | undefined;
  let lanesHonesty: ReturnType<typeof buildLanesHonestySnapshot> | undefined;
  try {
    const status = getAIKeyStatus();
    const active = (slots: Array<{ state: string }>) => slots.filter((s) => s.state === "active").length;
    const mistral = getMistralWebSearchStatus();
    const nvidia = getDeepSeekCaseReasoningStatus();
    providers = {
      groq: active(status.groq), gemini: active(status.gemini), perplexity: active(status.perplexity), tavily: active(status.tavily), exa: active(status.exa),
      mistral: mistral.configured ? 1 : 0, nvidiaNim: nvidia.configured ? 1 : 0,
      companiesHouse: process.env.COMPANIES_HOUSE_API_KEY ? 1 : 0,
      serper: [process.env.SERPER_API_KEY, process.env.SERPER_API_KEY_2, process.env.SERPER_API_KEY_3, process.env.SERPER_KEY].some((k) => Boolean(k?.trim())) ? 1 : 0,
      scrapfly: process.env.SCRAPFLY_API_KEY ? 1 : 0, zenrows: process.env.ZENROWS_API_KEY ? 1 : 0,
      whoxy: [process.env.WHOXY_API_KEY, process.env.WHOXY_KEY, process.env.Whoxy_Key, process.env.WHOXY].some((k) => Boolean(k?.trim())) ? 1 : 0,
      whoisjson: process.env.WHOISJSON_API_KEY ? 1 : 0,
    };
    lanesHonesty = buildLanesHonestySnapshot();
  } catch { providers = undefined; lanesHonesty = undefined; }
  const registryShallowRisk = lanesHonesty?.registryShallowRisk ?? (providers ? (providers.perplexity + providers.tavily + providers.exa + providers.serper) === 0 : true);
  res.json({
    status: "ok",
    redis: { status: snap.status, latencyMs: snap.latencyMs, cached: snap.cached },
    providers, lanesHonesty, registryShallowRisk,
    bureauIntegrity: lanesHonesty?.bureauIntegrity ?? "critical",
    bureauIntegrityReasons: lanesHonesty?.bureauIntegrityReasons ?? [],
    note: registryShallowRisk
      ? "registryShallowRisk=true: no Serper/Tavily/Exa/Perplexity slots — discovery may be registry-only."
      : "Provider slots are configured. Restart the API after secret changes. ENABLE_AUTO_PIPELINE=false is the safe operator floor.",
    autoPipeline: process.env.ENABLE_AUTO_PIPELINE === "true",
  });
});

export default router;
