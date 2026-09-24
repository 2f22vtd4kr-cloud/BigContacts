import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// Personal/development runs stay silent. Structured application logging is
// retained only for production diagnostics; local development is not a log sink.
export const logger = pino({
  level: isProduction ? (process.env.LOG_LEVEL ?? "info") : "silent",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
});
