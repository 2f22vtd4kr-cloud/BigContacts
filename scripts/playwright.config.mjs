import { defineConfig } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: '.',
  testMatch: 'frontend-browser.spec.mjs',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.APEX_BROWSER_BASE_URL || `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `pnpm --dir artifacts/apex-finder dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
