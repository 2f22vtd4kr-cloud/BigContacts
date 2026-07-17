import app from "./app";
import { logger } from "./lib/logger";
import { seedMockData, seedExtendedData } from "./lib/mock-data";
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

  // Seed base mock data on first boot (no-op if data already exists)
  seedMockData()
    .then(() => logger.info("Base mock data seeded (or already present)"))
    .then(() => seedExtendedData())
    .then(() => logger.info("Extended mock data seeded (or already present)"))
    .catch((e) => logger.warn({ err: e }, "Mock data seed failed (non-fatal)"));
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
