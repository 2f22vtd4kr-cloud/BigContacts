import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

/**
 * Single-port / Replit public root: serve built Apex Finder at `/`,
 * keep `/api/*` for the API. Tries several monorepo-relative paths.
 */
const __appDir = path.dirname(fileURLToPath(import.meta.url));

function resolveFrontendDist(): string | null {
  const candidates = [
    // Vite build.outDir is dist/public (see apex-finder/vite.config.ts)
    path.resolve(__appDir, "../../../apex-finder/dist/public"),
    path.resolve(__appDir, "../../../../artifacts/apex-finder/dist/public"),
    path.resolve(process.cwd(), "artifacts/apex-finder/dist/public"),
    path.resolve(process.cwd(), "../apex-finder/dist/public"),
    path.resolve(process.cwd(), "apex-finder/dist/public"),
    path.resolve(__appDir, "../../../apex-finder/dist"),
    path.resolve(process.cwd(), "artifacts/apex-finder/dist"),
    path.resolve(process.cwd(), "dist/public"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

const frontendDist = resolveFrontendDist();
if (frontendDist) {
  logger.info({ frontendDist }, "Serving Apex Finder static desk from dist");
  app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "apex-atlas-api",
      desk: "frontend dist not found — build artifacts/apex-finder or use the Vite preview port",
      health: "/api/healthz",
    });
  });
}

export default app;
