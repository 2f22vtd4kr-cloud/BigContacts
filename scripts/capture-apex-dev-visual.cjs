const { chromium } = require("playwright");
const fs = require("node:fs");

const baseUrl = process.env.APEX_VISUAL_BASE_URL || "http://127.0.0.1:23695";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    for (const [name, viewport] of [
      ["desktop", { width: 1280, height: 900 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const browserErrors = [];
      const failedRequests = [];
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });
      page.on("pageerror", (error) => browserErrors.push(error.stack || error.message));
      page.on("requestfailed", (request) => failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText || "request failed",
      }));
      await page.route("**/api/**", async (route) => {
        const url = route.request().url();
        let payload = {};
        if (url.endsWith("/api/healthz")) {
          payload = { researchKeysConfigured: false };
        } else if (url.endsWith("/api/system/status")) {
          payload = {
            ai: { groqInvestigator: [], serper: [], tavily: [], exa: [] },
            databases: {
              postgres: { status: "ok", latencyMs: 1 },
              localRedis: { status: "ok", latencyMs: 1 },
              upstash: [{ slot: 1, status: "ok", quotaExhausted: false }],
            },
            generatedAt: new Date().toISOString(),
            cached: false,
            cachedAgoMs: 0,
          };
        } else if (url.includes("/api/dashboard/stats")) {
          payload = {
            totalEntities: 248,
            totalRelationships: 37,
            totalAssets: 1412,
            registryShallowRisk: false,
          };
        } else if (url.includes("/api/dashboard/research-leads")) {
          payload = { leads: [], sourceLeads: [], activeDiscovery: false };
        } else if (url.includes("/api/ingest/job/active/atlas-run")) {
          payload = { active: false, status: "idle" };
        } else if (url.includes("/api/relationships") || url.includes("/api/entities") || url.includes("/api/assets")) {
          payload = [];
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });
      });

      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.addStyleTag({
        content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
      });
      await page.waitForTimeout(1800);

      const prompt = page.locator("textarea").first();
      if (await prompt.count()) {
        await prompt.fill("Founders of UK climate startups with a warm route");
        await page.waitForTimeout(250);
      }

      const title = await page.locator("h1").first().textContent().catch(() => "");
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const diagnostics = await page.evaluate(() => ({
        documentTitle: document.title,
        readyState: document.readyState,
        rootHtml: document.querySelector("#root")?.innerHTML.slice(0, 3500) ?? null,
        rootHtmlLength: document.querySelector("#root")?.innerHTML.length ?? -1,
        bodyHtmlLength: document.body.innerHTML.length,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        rootDisplay: document.querySelector("#root") ? getComputedStyle(document.querySelector("#root")).display : null,
        launchButton: (() => {
          const element = document.querySelector('[data-testid="button-launch-apex-atlas"]');
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          const parentRect = element.parentElement?.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            text: element.textContent?.trim(),
            disabled: element.disabled,
            className: element.className,
            width: rect.width,
            height: rect.height,
            parentWidth: parentRect?.width ?? null,
            display: style.display,
            flex: style.flex,
            minWidth: style.minWidth,
          };
        })(),
        scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      }));
      const screenshot = await page.screenshot({ type: "jpeg", quality: 38, fullPage: false });
      fs.writeFileSync(`/tmp/apex-home-${name}.jpg`, screenshot);
      console.log(`APEX_VISUAL_META_${name}=${JSON.stringify({
        title,
        url: page.url(),
        hasOperatorSignIn: /operator sign-in|operator login/i.test(bodyText),
        body: bodyText.slice(0, 900),
        diagnostics,
        browserErrors: browserErrors.slice(0, 20),
        failedRequests: failedRequests.slice(0, 20),
        viteLog: fs.existsSync("/tmp/apex-vite.log") ? fs.readFileSync("/tmp/apex-vite.log", "utf8").slice(-5000) : "",
      })}`);
      console.log(`APEX_VISUAL_IMAGE_${name}=${screenshot.toString("base64")}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Apex visual capture failed:", error);
  process.exitCode = 1;
});
