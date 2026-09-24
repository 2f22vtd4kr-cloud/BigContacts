import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// Personal/development runs should stay quiet. Structured application logging is
// retained for production diagnostics only; it is not a local telemetry sink.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "silent"),
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
});
