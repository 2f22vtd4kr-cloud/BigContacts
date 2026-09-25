import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { classifyApexError } from "./lib/apex-user-errors";

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

// Final API safety net: never expose raw server errors as the only UX contract.
app.use((err: any, req: any, res: any, _next: any) => {
  const status = Number(err?.statusCode ?? err?.status ?? 500);
  const userError = classifyApexError(err?.message ?? "Internal server error", status);
  req.log?.error?.({ err: err?.message, code: userError.code }, "Unhandled API error");
  if (res.headersSent) return;
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: userError.message, userError });
});

export default app;
