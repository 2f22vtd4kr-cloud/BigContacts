import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  // Personal/development runs should not flood the Replit workspace log.
  // Production keeps the existing operational logging unless explicitly overridden.
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "silent"),
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
