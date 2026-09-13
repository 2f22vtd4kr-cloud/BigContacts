import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

export default defineConfig(({ command }) => {
  // Runtime serving needs explicit deployment configuration; a production
  // build must remain reproducible without a live server environment.
  const isBuild = command === "build";
  const rawPort = process.env.PORT ?? (isBuild ? "5000" : undefined);
  if (!rawPort) {
    throw new Error("PORT environment variable is required when serving the sandbox.");
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH ?? (isBuild ? "/" : undefined);
  if (!basePath) {
    throw new Error("BASE_PATH environment variable is required when serving the sandbox.");
  }

  return {
    base: basePath,
    plugins: [
      mockupPreviewPlugin(),
      react(),
      tailwindcss(),
      // The runtime overlay publishes Vite 5/6-oriented types while this
      // sandbox runs Vite 7. The plugin API is compatible at runtime.
      runtimeErrorOverlay() as any,
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
