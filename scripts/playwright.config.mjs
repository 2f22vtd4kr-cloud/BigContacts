import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'frontend-browser.spec.mjs',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.APEX_BROWSER_BASE_URL || 'http://127.0.0.1:5173',
  },
  webServer: {
    command: 'pnpm --dir artifacts/apex-finder dev --host 127.0.0.1',
    url: 'http://127.0.0.1:5173/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
