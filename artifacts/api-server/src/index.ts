import app from "./app";
import { logger } from "./lib/logger";
import { seedMockData } from "./lib/mock-data";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed mock data on first boot (no-op if data already exists)
  seedMockData()
    .then(() => logger.info("Mock data seeded (or already present)"))
    .catch((e) => logger.warn({ err: e }, "Mock data seed failed (non-fatal)"));
});
