import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { apiAuth } from "./lib/api-auth";
import { logger } from "./lib/logger";

function requireProductionSecret(name: string, minimum: number): void {
  if (process.env.NODE_ENV === "production" && (process.env[name]?.trim().length ?? 0) < minimum) {
    throw new Error(`${name} must be configured with at least ${minimum} characters before the production API can start`);
  }
}
requireProductionSecret("APEX_API_AUTH_TOKEN", 32);
requireProductionSecret("APEX_OPERATOR_PASSWORD", 16);
requireProductionSecret("APEX_SESSION_SECRET", 32);

const app: Express = express();
app.disable("x-powered-by");
app.set("trust proxy", false);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(pinoHttp({ logger, serializers: { req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; }, res(res) { return { statusCode: res.statusCode }; } } }));
const allowedOrigins = new Set((process.env.APEX_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.has(origin)) { callback(null, true); return; } callback(null, false); }, credentials: true }));
app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: true, limit: "128kb" }));
app.use("/api", apiAuth, router);

const __appDir = path.dirname(fileURLToPath(import.meta.url));
function resolveFrontendDist(): string | null {
  const candidates = [path.resolve(__appDir, "../../../apex-finder/dist/public"), path.resolve(__appDir, "../../../../artifacts/apex-finder/dist/public"), path.resolve(process.cwd(), "artifacts/apex-finder/dist/public"), path.resolve(process.cwd(), "../apex-finder/dist/public"), path.resolve(process.cwd(), "apex-finder/dist/public"), path.resolve(__appDir, "../../../apex-finder/dist"), path.resolve(process.cwd(), "artifacts/apex-finder/dist"), path.resolve(process.cwd(), "dist/public")];
  for (const dir of candidates) if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  return null;
}
const frontendDist = resolveFrontendDist();
if (frontendDist) {
  logger.info({ frontendDist }, "Serving Apex Finder static desk from dist");
  app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => { if (req.method !== "GET" && req.method !== "HEAD") return next(); res.sendFile(path.join(frontendDist, "index.html"), (err) => { if (err) next(err); }); });
} else {
  app.get("/", (_req, res) => res.status(200).type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Apex Atlas — desk not built</title><style>body{font-family:system-ui,sans-serif;background:#0c1220;color:#e7e5e4;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}code{background:#1e293b;padding:2px 6px;border-radius:4px}</style></head><body><div><h1>Apex Atlas desk bundle missing</h1><p>Build the desk, then restart API only:</p><p><code>pnpm --dir artifacts/apex-finder run build</code></p><p>Health: <a href="/api/healthz" style="color:#9CFF1A">/api/healthz</a></p></div></body></html>`));
}
export default app;
