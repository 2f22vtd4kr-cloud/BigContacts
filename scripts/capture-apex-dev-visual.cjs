const { chromium } = require("playwright");
const fs = require("node:fs");

const baseUrl = process.env.APEX_VISUAL_BASE_URL || "http://127.0.0.1:23695";

// Synthetic browser-only fixtures for the visual harness. The route interceptor
// below serves these responses locally; no fixture is written to or sent to Apex.
const visualEntities = [
  { id: 1, name: "Mira Patel", type: "HNWI", isHidden: false },
  { id: 2, name: "Noah Reed", type: "HNWI", isHidden: false },
  { id: 3, name: "Northstar Capital", type: "Corporation", isHidden: false },
  { id: 4, name: "Harbor Ventures", type: "Corporation", isHidden: false },
];
const visualConnectionPath = {
  found: true,
  path: [
    { id: "1", label: "Mira Patel", nodeType: "Person", isTarget: true, isCentral: true },
    { id: "3", label: "Northstar Capital", nodeType: "Organization", isTarget: false, isCentral: false },
    { id: "4", label: "Harbor Ventures", nodeType: "Organization", isTarget: false, isCentral: false },
    { id: "2", label: "Noah Reed", nodeType: "Person", isTarget: true, isCentral: false },
  ],
  edges: [
    { id: "edge-1", source: "1", target: "3", label: "Founder at", strength: 0.82, evidenceStatus: "supported" },
    { id: "edge-2", source: "3", target: "4", label: "Investment relationship", strength: 0.61, evidenceStatus: "disputed" },
    { id: "edge-3", source: "4", target: "2", label: "Board connection", strength: 0.74, evidenceStatus: "review" },
  ],
  hops: 3,
  pathScore: 0.72,
  recommendation: "Review the disputed middle relationship before relying on this path.",
};

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
        if (url.endsWith("/api/ingest/atlas-config")) {
          payload = { discoveryObjectiveMaxChars: 1600, discoveryContextMaxChars: 1200 };
        } else if (url.endsWith("/api/healthz")) {
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
        } else if (url.includes("/api/graph/path")) {
          payload = visualConnectionPath;
        } else if (url.includes("/api/entities")) {
          payload = visualEntities;
        } else if (url.includes("/api/relationships") || url.includes("/api/assets")) {
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
      await page.waitForFunction(() => [...document.querySelectorAll(".atlas-round-status")].some((el) => getComputedStyle(el).display !== "none" && el.getAttribute("data-status") === "ready"), { timeout: 8_000 });
      await page.waitForTimeout(400);
      const workspaceStatusVisible = await page.evaluate(() => {
        const status = [...document.querySelectorAll(".atlas-round-status")].find((el) => getComputedStyle(el).display !== "none");
        if (!status) return false;
        const rect = status.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return rect.width > 0 && rect.height > 0 && !!hit && (hit === status || status.contains(hit));
      });
      if (!workspaceStatusVisible) throw new Error("Workspace status is obscured by the shell header");

      const prompt = page.locator("textarea").first();
      if (await prompt.count()) {
        await prompt.fill("Founders of UK climate startups with a warm route");
        await page.waitForTimeout(250);
      }

      let routeFixtureLoaded = false;

      const title = await page.locator("h1").first().textContent().catch(() => "");
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const sidebarLinks = await page.locator(".atlas-round-sidebar-nav a").allTextContents();
      if (sidebarLinks.length !== 5 || sidebarLinks.some((label) => /Field manual|System status|Data sources|Source directory|Persona review|Duplicate review|Workspace activity|Network graph|Reactor topology|Intel terminal/.test(label))) {
        throw new Error(`Board sidebar must expose exactly the five designed destinations; received: ${sidebarLinks.join(" | ")}`);
      }
      if (await page.locator(".atlas-round-mark").count()) throw new Error("The obsolete target/crosshair brand mark is still rendered.");
      const diagnostics = await page.evaluate(() => ({
        documentTitle: document.title,
        readyState: document.readyState,
        rootHtml: document.querySelector("#root")?.innerHTML.slice(0, 3500) ?? null,
        rootHtmlLength: document.querySelector("#root")?.innerHTML.length ?? -1,
        bodyHtmlLength: document.body.innerHTML.length,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        rootDisplay: document.querySelector("#root") ? getComputedStyle(document.querySelector("#root")).display : null,
        sidebar: (() => {
          const element = document.querySelector(".atlas-round-sidebar");
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { width: rect.width, height: rect.height, position: style.position, visibility: style.visibility, links: Array.from(element.querySelectorAll("nav a")).map((link) => link.textContent?.trim()) };
        })(),
        launchFramePatterns: (() => {
          const element = document.querySelector(".atlas-home-board-console");
          if (!element) return null;
          return { checky: getComputedStyle(element, "::before").backgroundImage, waves: getComputedStyle(element, "::after").backgroundImage };
        })(),
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
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(80);
      const screenshot = await page.screenshot({ type: "jpeg", quality: 38, fullPage: name === "mobile" });
      fs.writeFileSync(`/tmp/apex-home-${name}.jpg`, screenshot);
      console.log(`APEX_VISUAL_META_${name}=${JSON.stringify({
        title,
        url: page.url(),
        hasOperatorSignIn: /operator sign-in|operator login/i.test(bodyText),
        routeFixtureLoaded,
        body: bodyText.slice(0, 900),
        diagnostics,
        browserErrors: browserErrors.slice(0, 20),
        failedRequests: failedRequests.slice(0, 20),
        viteLog: fs.existsSync("/tmp/apex-vite.log") ? fs.readFileSync("/tmp/apex-vite.log", "utf8").slice(-5000) : "",
      })}`);
      console.log(`APEX_VISUAL_IMAGE_${name}=${screenshot.toString("base64")}`);
      if (name === "mobile") {
        const openNavigation = page.getByRole("button", { name: "Open navigation" });
        if (await openNavigation.count()) {
          await openNavigation.click();
          await page.waitForSelector(".atlas-round-sidebar.is-open", { timeout: 3000 });
          const drawer = await page.screenshot({ type: "jpeg", quality: 55, fullPage: false });
          console.log(`APEX_VISUAL_IMAGE_mobile_sidebar=${drawer.toString("base64")}`);
        } else {
          throw new Error("Mobile sidebar toggle is missing.");
        }
      }
      await page.goto(new URL("/network", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForSelector(".atlas-connections-path-finder", { timeout: 10_000 });
      const routeSelects = page.locator(".atlas-connections-path-finder select");
      if (await routeSelects.count() !== 2) throw new Error("Connections shortest-path controls are missing.");
      await routeSelects.nth(0).selectOption("1");
      await routeSelects.nth(1).selectOption("2");
      await page.getByRole("button", { name: "Find shortest path" }).click();
      await page.waitForSelector(".atlas-home-route-result", { timeout: 10_000 });
      routeFixtureLoaded = true;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(80);
      const connectionsScreenshot = await page.screenshot({ type: "jpeg", quality: 38, fullPage: name === "mobile" });
      fs.writeFileSync(`/tmp/apex-connections-${name}.jpg`, connectionsScreenshot);
      console.log(`APEX_VISUAL_META_${name}_connections=${JSON.stringify({
        url: page.url(),
        routeFixtureLoaded,
        pathResultVisible: await page.locator(".atlas-home-route-result").isVisible(),
        browserErrors: browserErrors.slice(0, 20),
        failedRequests: failedRequests.slice(0, 20),
      })}`);
      console.log(`APEX_VISUAL_IMAGE_${name}_connections=${connectionsScreenshot.toString("base64")}`);
      for (const [routePath, selector, routeName] of [
        ["/profiles", ".atlas-ledger-layout", "ledger"],
        ["/search", ".atlas-discover-layout", "discover"],
        ["/reactor", ".atlas-board-reactor", "reactor"],
      ]) {
        await page.goto(new URL(routePath, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForSelector(selector, { timeout: 15000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
        const routeShot = await page.screenshot({ type: "jpeg", quality: 38, fullPage: name === "mobile" });
        fs.writeFileSync(`/tmp/apex-${routeName}-${name}.jpg`, routeShot);
        console.log(`APEX_VISUAL_IMAGE_${routeName}_${name}=${routeShot.toString("base64")}`);
        console.log(`APEX_VISUAL_META_${routeName}_${name}=${JSON.stringify({
          route: routePath,
          title: await page.locator("h1").first().textContent().catch(() => ""),
          browserErrors: browserErrors.slice(0, 20),
          failedRequests: failedRequests.slice(0, 20),
        })}`);
      }
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
