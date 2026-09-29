import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/src/test/apex-atlas-development-bypass.dev.ts"],
  },
});