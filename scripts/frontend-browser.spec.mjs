import { test, expect, chromium } from '@playwright/test';

const baseURL = process.env.APEX_BROWSER_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Apex Reactor responsive browser contract', () => {
  const cases = [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 1024, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const viewport of cases) {
    test(`${viewport.name} renders the live research theatre without fabricated work`, async () => {
      const browser = await chromium.launch({ channel: 'chrome' });
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.goto(`${baseURL}/reactor?mock=1`, { waitUntil: 'networkidle' });

      await expect(page.getByTestId('reactor-live-surface')).toBeVisible();
      await expect(page.getByText('Reactor Live · observable research')).toBeVisible();
      await expect(page.getByTestId('bureau-ops-stage')).toBeVisible();
      await expect(page.getByTestId('reactor-right-hand')).toBeVisible();
      await expect(page.getByTestId('reactor-activity-feed')).toBeVisible();

      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toMatch(/contact email phone/i);
      expect(bodyText).not.toMatch(/step\s+\d+\s+of\s+\d+/i);
      expect(bodyText).not.toMatch(/window\s+\d+\s+of\s+\d+/i);

      const mobileLaunch = page.getByTestId('reactor-launch-bar-mobile');
      if (viewport.name === 'mobile') {
        await expect(mobileLaunch).toBeVisible();
      } else {
        await expect(mobileLaunch).not.toBeVisible();
      }

      await page.screenshot({
        path: `test-results/reactor-${viewport.name}.png`,
        fullPage: true,
      });
      await context.close();
      await browser.close();
    });
  }
});
