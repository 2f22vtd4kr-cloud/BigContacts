import app from "./app";
import { logger } from "./lib/logger";
import { connectRedis, connectPermanentRedis, disconnectRedis } from "./lib/redis";
import { coldStartRecovery } from "./lib/startup";
import { getAIKeyStatus } from "./lib/ai-extractor";
import { buildLanesHonestySnapshot } from "./lib/lanes-honesty";
import { installExternalQuotaGuard } from "./lib/provider-gate";

const rawPort = process.env["PORT"] ?? "8080";
const parsedPort = Number(rawPort);
const port = (Number.isNaN(parsedPort) || parsedPort <= 0) ? 8080 : parsedPort;

// All outbound AI/search/scrape/registry traffic shares one bounded gate.
// Local preview/API requests bypass it; provider failures remain explicit.
installExternalQuotaGuard();

// Connect local Redis cache (non-blocking)
connectRedis()
  .then(() => logger.info("Redis connection initiated"))
  .catch((e) => logger.warn({ err: e }, "Redis connect error (non-fatal)"));

// Manual mode deliberately does not connect to Upstash at boot. This keeps an
// idle desk from consuming a free-tier command budget; an explicit Atlas
// launch enables the permanent client before creating its job.
const redisOnBoot =
  process.env["ENABLE_AUTO_PIPELINE"] === "true" ||
  process.env["ENABLE_REDIS_ON_BOOT"] === "true";
if (redisOnBoot) {
  connectPermanentRedis()
    .then(() =>
      coldStartRecovery().catch((e) =>
        logger.warn({ err: e }, "Cold-start recovery error (non-fatal)"),
      ),
    )
    .catch((e) => logger.warn({ err: e }, "Permanent Redis connect error (non-fatal)"));
} else {
  logger.info("Permanent Redis boot connection skipped — manual Launch mode");
  coldStartRecovery().catch((e) =>
    logger.warn({ err: e }, "Cold-start recovery error (non-fatal)"),
  );
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  // Provider slot counts only (never values). Restart API after adding secrets
  // so process.env picks them up — otherwise Atlas falls back to registry-only.
  try {
    const status = getAIKeyStatus();
    const countActive = (slots: Array<{ state: string }>) =>
      slots.filter((s) => s.state === "active").length;
    const lanes = buildLanesHonestySnapshot();
    logger.info(
      {
        groq: countActive(status.groq),
        gemini: countActive(status.gemini),
        perplexity: countActive(status.perplexity),
        tavily: countActive(status.tavily),
        exa: countActive(status.exa),
        serper: lanes.serper,
        mistral: lanes.mistral,
        nvidiaNim: lanes.nvidiaNim,
        agenticLlmSlots: lanes.agenticLlmSlots,
        webSearchActive: lanes.webSearchActive,
        bureauIntegrity: lanes.bureauIntegrity,
      },
      "AI provider keys loaded (active slots)",
    );
    if (lanes.bureauIntegrity === "critical") {
      logger.warn(
        { reasons: lanes.bureauIntegrityReasons },
        "bureauIntegrity=critical — do not compare research quality until search + agentic LLM slots are live (restart API after adding secrets)",
      );
    } else if (lanes.bureauIntegrity === "degraded") {
      logger.warn(
        { reasons: lanes.bureauIntegrityReasons },
        "bureauIntegrity=degraded — some lanes missing",
      );
    }
  } catch (e: any) {
    logger.warn({ err: e?.message }, "Could not report AI key status at boot");
  }
  // NOTE: No synthetic data seeding. Database starts empty.
  // Use POST /ingest/western-hnwi or POST /ingest/faa to load real registry data.
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close();
  await disconnectRedis();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
