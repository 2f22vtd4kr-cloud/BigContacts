import app from "./app";
import { logger } from "./lib/logger";
import { connectRedis, connectPermanentRedis, disconnectRedis } from "./lib/redis";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Connect local Redis cache (non-blocking)
connectRedis()
  .then(() => logger.info("Redis connection initiated"))
  .catch((e) => logger.warn({ err: e }, "Redis connect error (non-fatal)"));

// Connect permanent Upstash Redis clients (REDIS_URL_1, REDIS_URL_2, …)
connectPermanentRedis()
  .catch((e) => logger.warn({ err: e }, "Permanent Redis connect error (non-fatal)"));

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
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
