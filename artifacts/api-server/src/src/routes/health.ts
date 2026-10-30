import { Router, type IRouter } from "express";
import { pingRedis, getPermanentClient, getRedisHealthSnapshot } from "../lib/redis";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";
import { hasResearchProviderKey } from "../lib/research-key-readiness";

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
  // Public probes reveal only liveness, distributed-store health, and a coarse
  // research-key readiness bit. Provider names, counts, models, and secret state
  // remain behind the authenticated diagnostic endpoint below.
  // Provider readiness and durable Redis health are independent signals.
  // This coarse public bit only says some research/provider credential exists;
  // it does not certify that all canonical launch roles are configured.
  const researchKeysConfigured = hasResearchProviderKey(process.env);
  res.json({
    status: "ok",
    redis: { status: snap.status, latencyMs: snap.latencyMs, cached: snap.cached },
    researchKeysConfigured,
  });
});

router.get("/healthz/details", async (_req, res) => {
  const snap = await redisSnapshot();
  let providers: Record<string, number> | undefined;
  let lanesHonesty: ReturnType<typeof buildLanesHonestySnapshot> | undefined;
  try {
    lanesHonesty = buildLanesHonestySnapshot();
    providers = {
      groqBoss: lanesHonesty.groqBoss,
      groqRightHand: lanesHonesty.groqRightHand,
      groqInvestigator: lanesHonesty.groqInvestigator,
      serper: lanesHonesty.serper,
      serpapi: lanesHonesty.serpapi,
      tavily: lanesHonesty.tavily,
      exa: lanesHonesty.exa,
      companiesHouse: lanesHonesty.companiesHouse,
      scrapfly: process.env.SCRAPFLY_API_KEY?.trim() ? 1 : 0,
      zenrows: process.env.ZENROWS_API_KEY?.trim() ? 1 : 0,
    };
  } catch {
    providers = undefined;
    lanesHonesty = undefined;
  }
  const registryShallowRisk = lanesHonesty?.registryShallowRisk ?? true;
  res.json({
    status: "ok",
    redis: { status: snap.status, latencyMs: snap.latencyMs, cached: snap.cached },
    providers, lanesHonesty, registryShallowRisk,
    bureauIntegrity: lanesHonesty?.bureauIntegrity ?? "critical",
    bureauIntegrityReasons: lanesHonesty?.bureauIntegrityReasons ?? [],
    note: registryShallowRisk
      ? "No active Serper/SerpAPI/Tavily/Exa search capability is configured; registry-only discovery is not a substitute for broad web search."
      : "Canonical Groq roles and search-provider configuration are summarized above. Restart the API after secret changes; ENABLE_AUTO_PIPELINE=false is the safe operator floor.",
    autoPipeline: process.env.ENABLE_AUTO_PIPELINE === "true",
  });
});

export default router;
