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
      ["tablet", { width: 768, height: 1024 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const browserErrors = [];
      const failedRequests = [];
      let currentPath = "/";
      let routeFixtureMode = false;
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
          payload = { researchKeysConfigured: false, launchLimits: { discoveryObjectiveMaxChars: 1600 } };
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
        } else if (url.endsWith("/api/registry-matrix")) {
          payload = { sources: [] };
        } else if (url.endsWith("/api/entities/1")) {
          payload = visualEntities[0];
        } else if (url.includes("/api/entities")) {
          payload = (currentPath === "/network" && routeFixtureMode) || currentPath === "/profile/1" ? visualEntities : [];
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
      if (await page.locator(".atlas-round-brand-mark").count() !== 2) throw new Error("The heraldic Apex Atlas shield must appear in desktop and mobile navigation.");
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
      currentPath = "/network";
      await page.goto(new URL("/network", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForSelector(".atlas-connections-path-finder", { timeout: 10_000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(80);
      const connectionsScreenshot = await page.screenshot({ type: "jpeg", quality: 38, fullPage: name === "mobile" });
      fs.writeFileSync(`/tmp/apex-connections-${name}.jpg`, connectionsScreenshot);
      console.log(`APEX_VISUAL_IMAGE_${name}_connections=${connectionsScreenshot.toString("base64")}`);
      routeFixtureMode = true;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector(".atlas-connections-path-finder select", { timeout: 10_000 });
      const routeSelects = page.locator(".atlas-connections-path-finder select");
      if (await routeSelects.count() !== 2) throw new Error("Connections shortest-path controls are missing.");
      await routeSelects.nth(0).selectOption("1");
      await routeSelects.nth(1).selectOption("2");
      await page.getByRole("button", { name: "Find shortest path" }).click();
      await page.waitForSelector(".atlas-home-route-result", { timeout: 10_000 });
      routeFixtureLoaded = true;
      console.log(`APEX_VISUAL_META_${name}_connections=${JSON.stringify({
        url: page.url(),
        routeFixtureLoaded,
        pathResultVisible: await page.locator(".atlas-home-route-result").isVisible(),
        browserErrors: browserErrors.slice(0, 20),
      })}`);

      for (const boardPage of [
        { path: "/profiles", label: "ledger", heading: "Everyone on the register" },
        { path: "/search", label: "discover", heading: "Where Atlas looks" },
        { path: "/reactor", label: "reactor", heading: "Every step, on the record" },
        { path: "/profile/1", label: "card", heading: "Mira Patel" },
      ]) {
        currentPath = boardPage.path;
        await page.goto(new URL(boardPage.path, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.getByRole("heading", { name: boardPage.heading }).first().waitFor({ state: "visible", timeout: 12000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
        const boardDiagnostics = await page.evaluate((label) => {
          const style = (selector) => {
            const element = document.querySelector(selector);
            return element ? getComputedStyle(element) : null;
          };
          const discover = document.querySelector(".atlas-discover-layout");
          const discoverConsole = document.querySelector(".atlas-discover-search-console");
          const discoverInner = document.querySelector(".atlas-discover-search-console-inner");
          const discoverInput = document.querySelector(".atlas-discover-query-field input");
          const ledgerFrame = document.querySelector(".atlas-ledger-board-console");
          const ledgerMeta = document.querySelector(".atlas-ledger-register-meta");
          const reactorGrid = document.querySelector(".atlas-reactor-board-layout");
          const reactorMetrics = document.querySelector(".atlas-reactor-run-metrics");
          const reactorLastStep = document.querySelector(".atlas-reactor-last-step");
          return {
            discover: label === "discover" ? {
              display: discover ? getComputedStyle(discover).display : null,
              columns: discover ? getComputedStyle(discover).gridTemplateColumns : null,
              inputWidth: discoverInput?.getBoundingClientRect().width ?? 0,
              innerBackground: discoverInner ? getComputedStyle(discoverInner).backgroundColor : null,
              checky: discover ? getComputedStyle(document.querySelector(".atlas-discover-search-console"), "::before").backgroundImage : null,
              waves: discover ? getComputedStyle(document.querySelector(".atlas-discover-search-console"), "::after").backgroundImage : null,
            } : null,
            ledger: label === "ledger" ? {
              columns: style(".atlas-ledger-layout")?.gridTemplateColumns ?? null,
              checky: ledgerFrame ? getComputedStyle(ledgerFrame, "::before").backgroundImage : null,
              waves: ledgerFrame ? getComputedStyle(ledgerFrame, "::after").backgroundImage : null,
              metaDisplay: ledgerMeta ? getComputedStyle(ledgerMeta).display : null,
              metaDirection: ledgerMeta ? getComputedStyle(ledgerMeta).flexDirection : null,
            } : null,
            reactor: label === "reactor" ? {
              display: reactorGrid ? getComputedStyle(reactorGrid).display : null,
              columns: reactorGrid ? getComputedStyle(reactorGrid).gridTemplateColumns : null,
              metricsDisplay: reactorMetrics ? getComputedStyle(reactorMetrics).display : null,
              metricLabels: reactorMetrics ? Array.from(reactorMetrics.querySelectorAll("span")).map((item) => item.textContent?.trim()) : [],
              lastStepDisplay: reactorLastStep ? getComputedStyle(reactorLastStep).display : null,
              lastStepDirection: reactorLastStep ? getComputedStyle(reactorLastStep).flexDirection : null,
            } : null,
          };
        }, boardPage.label);
        if (boardPage.label === "discover" && (boardDiagnostics.discover?.display !== "grid" || (boardDiagnostics.discover?.inputWidth ?? 0) < 250 || boardDiagnostics.discover?.innerBackground !== "rgb(255, 255, 255)" || !boardDiagnostics.discover?.checky?.includes("svg") || !boardDiagnostics.discover?.waves?.includes("svg"))) {
          throw new Error(`Discover search desk layout/patterns failed: ${JSON.stringify(boardDiagnostics.discover)}`);
        }
        if (boardPage.label === "ledger" && (boardDiagnostics.ledger?.metaDisplay !== "flex" || boardDiagnostics.ledger?.metaDirection !== "column" || !boardDiagnostics.ledger?.checky?.includes("svg") || !boardDiagnostics.ledger?.waves?.includes("svg"))) {
          throw new Error(`Ledger console frame or register metric hierarchy failed: ${JSON.stringify(boardDiagnostics.ledger)}`);
        }
        if (boardPage.label === "reactor" && (boardDiagnostics.reactor?.display !== "grid" || boardDiagnostics.reactor?.metricsDisplay !== "grid" || boardDiagnostics.reactor?.metricLabels?.join("|") !== "Steps|Sources|Elapsed" || boardDiagnostics.reactor?.lastStepDisplay !== "flex" || boardDiagnostics.reactor?.lastStepDirection !== "column")) {
          throw new Error(`Reactor run console/logbook split or metric hierarchy failed: ${JSON.stringify(boardDiagnostics.reactor)}`);
        }
        if (boardPage.label === "card") {
          const cardColors = await page.evaluate(() => ({
            primaryLabel: getComputedStyle(document.querySelector(".atlas-board-profile [class*=\"text-primary/\"]")).color,
            secondaryLabel: getComputedStyle(document.querySelector(".atlas-board-profile [class*=\"text-secondary/\"]")).color,
          }));
          if (cardColors.primaryLabel !== "rgb(31, 138, 77)" || cardColors.secondaryLabel === "rgb(212, 255, 138)") {
            throw new Error(`Card profile label contrast regression: ${JSON.stringify(cardColors)}`);
          }
        }
        const boardScreenshot = await page.screenshot({ type: "jpeg", quality: 42, fullPage: name === "mobile" });
        fs.writeFileSync(`/tmp/apex-${boardPage.label}-${name}.jpg`, boardScreenshot);
        console.log(`APEX_VISUAL_META_${name}_${boardPage.label}=${JSON.stringify({
          url: page.url(),
          heading: boardPage.heading,
          emptyEntitiesFixture: currentPath !== "/network",
          titleVisible: await page.getByRole("heading", { name: boardPage.heading }).isVisible(),
          boardDiagnostics,
          browserErrors: browserErrors.slice(0, 20),
        })}`);
        console.log(`APEX_VISUAL_IMAGE_${name}_${boardPage.label}=${boardScreenshot.toString("base64")}`);
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
