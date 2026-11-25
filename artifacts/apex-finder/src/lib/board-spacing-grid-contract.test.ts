import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const boardCss = readFileSync(new URL("../flat-round.css", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../pages/dashboard.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../components/layout-round.tsx", import.meta.url), "utf8");
const errorNoticeSource = readFileSync(new URL("../components/apex-error-notice.tsx", import.meta.url), "utf8");
const workspaceStatusSource = readFileSync(new URL("../components/workspace-status.tsx", import.meta.url), "utf8");
const apiKeyHealthSource = readFileSync(new URL("../components/api-key-health.tsx", import.meta.url), "utf8");
const systemStatusPageSource = readFileSync(new URL("../pages/status.tsx", import.meta.url), "utf8");
const providerSecretsDoc = readFileSync(new URL("../../../../docs/APEX_ATLAS_PROVIDER_SECRETS.md", import.meta.url), "utf8");
const launchAtlasButtonSource = readFileSync(new URL("../components/launch-atlas-button.tsx", import.meta.url), "utf8");
const captureScriptSource = readFileSync(new URL("../../../../scripts/capture-apex-dev-visual.cjs", import.meta.url), "utf8");
const responsiveWorkflowSource = readFileSync(new URL("../../../../.github/workflows/frontend-responsive.yml", import.meta.url), "utf8");
const secondaryRouteSources = [
  "graph",
  "jobs",
  "research",
  "manual",
  "improvements",
  "data-sources",
  "duplicates",
  "osint-tools",
].map((page) => readFileSync(new URL(`../pages/${page}.tsx`, import.meta.url), "utf8"));

function lastRule(selector: string): string {
  let cursor = 0;
  let body = "";
  while (cursor < boardCss.length) {
    const start = boardCss.indexOf(selector + " {", cursor);
    if (start < 0) break;
    const open = boardCss.indexOf("{", start);
    const close = boardCss.indexOf("}", open);
    if (close < 0) break;
    body = boardCss.slice(open + 1, close);
    cursor = close + 1;
  }
  return body;
}

describe("Apex Atlas design-board and unslop contract", () => {
  it("keeps padding, margin and gaps on four-pixel increments", () => {
    const declarations = [...boardCss.matchAll(
      /(?:^|[;{]\s*)(padding(?:-(?:top|right|bottom|left|inline|block))?|margin(?:-(?:top|right|bottom|left|inline|block))?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g,
    )];
    const violations = declarations.flatMap((match) => {
      const values = [...match[2].matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((value) => Number(value[1]));
      return values.filter((value) => Math.abs(value) % 4 !== 0).map((value) => ({ declaration: match[0], value }));
    });
    expect(violations).toEqual([]);
  });

  it("uses only the board's documented corner-radius scale", () => {
    const radii = [...boardCss.matchAll(/border-radius:\s*([^;]+)/g)].map((match) => match[1].trim());
    const unsupported = radii.filter((radius) => !/^(?:0|50%|(?:6|10|12|16|20)px|20px 0 0 20px|0 20px 20px 0)(?:!important)?$/.test(radius));
    expect(unsupported).toEqual([]);
  });

  it("uses the intended control and card corner radii", () => {
    const radiusFor = (selector: string) => {
      let cursor = 0;
      let radius: string | undefined;
      while (cursor < boardCss.length) {
        const start = boardCss.indexOf(selector + " {", cursor);
        if (start < 0) break;
        const open = boardCss.indexOf("{", start);
        const close = boardCss.indexOf("}", open);
        if (close < 0) break;
        radius = boardCss.slice(open + 1, close).match(/border-radius:\s*([^;]+)/)?.[1].trim() ?? radius;
        cursor = close + 1;
      }
      return radius;
    };
    expect(radiusFor(".atlas-round-sidebar .atlas-round-navlink")).toBe("6px");
    expect(radiusFor(".atlas-round .atlas-card")).toBe("12px!important");
    expect(radiusFor(".atlas-home-console-inner")).toBe("12px");
    expect(radiusFor(".atlas-round .atlas-home-board-console")).toBe("20px!important");
    expect(radiusFor(".atlas-round .atlas-home-board-console .atlas-launch-cta")).toBe("10px!important");
    expect(radiusFor(".atlas-launch-depth button")).toBe("6px");
    expect(radiusFor(".atlas-launch-target-count button")).toBe("6px");
    expect(layoutSource).toContain("primaryNav.map((item) =>");
    expect(layoutSource).not.toContain("utilityNav");
    expect(layoutSource).not.toContain("Crosshair");
    expect(layoutSource).not.toContain("atlas-round-mobile-nav");
  });

  it("keeps the grey checker repeat and supported dots on their documented grids", () => {
    expect(boardCss).toContain("background-color:#BDBDB8!important;");
    expect(boardCss).toContain("conic-gradient(#BDBDB8 25%,#E2E2DD 0 50%,#BDBDB8 0 75%,#E2E2DD 0)");
    expect(boardCss).toContain("background-size:22px 14px!important;");
    expect(boardCss).toContain("radial-gradient(circle, #FAFAF8 1.15px, transparent 1.3px)");
    expect(boardCss).toContain("background-size: 12px 12px;");
    expect(boardCss).toContain("background-color: #1F8A4D;");
  });

  it("tiles one continuous 64-by-24 wave field across every framed console", () => {
    const continuousWave = "M-32%2012%20C-16%200%20-16%200%200%2012%20S16%2024%2032%2012%20S48%200%2064%2012%20S80%2024%2096%2012";
    expect(boardCss.split(continuousWave).length - 1).toBe(4);
    expect(boardCss).toContain("width='64'%20height='24'%20viewBox='0%200%2064%2024'");
    expect(boardCss).toContain("background-size:64px 24px!important;");
    expect(boardCss).toContain("stroke='%23E6E6E2'");
    expect(boardCss).toContain(".atlas-round .atlas-home-board-console::after,");
    expect(boardCss).toContain("display:none!important;");
  });

  it("keeps the full-height sidebar and text-only active navigation", () => {
    expect(layoutSource).toContain('id="atlas-round-sidebar"');
    expect(layoutSource).toContain('className="atlas-round-sidebar-nav"');
    expect(layoutSource).toContain('aria-label="Main navigation"');
    expect(boardCss).toContain("height:calc(100dvh - 68px);");
    const activeRule = lastRule(".atlas-round-sidebar .atlas-round-navlink.is-active");
    expect(activeRule).toContain("background:transparent!important;");
    expect(activeRule).toContain("box-shadow:none!important;");
    expect(activeRule).toContain("font-weight:700!important;");
    expect(activeRule).not.toContain("var(--round-red)");
    expect(boardCss).toContain(".atlas-round-shell .atlas-round-sidebar .atlas-round-navlink span { display:inline; }");
  });

  it("keeps the header and API-down shell on one uninterrupted paper surface", () => {
    const headerRule = lastRule(".atlas-round-shell > .atlas-round-header");
    expect(headerRule).toContain("background:var(--round-paper)!important;");
    expect(headerRule).toContain("border-bottom:0!important;");
    expect(headerRule).toContain("box-shadow:none!important;");
    expect(boardCss).toContain("background-color:#BDBDB8!important;");
  });

  it("renders global errors using the board's paper alert surface", () => {
    expect(errorNoticeSource).toContain('className="atlas-error-notice max-h-[38dvh] sm:max-h-[min(52dvh,360px)]"');
    expect(errorNoticeSource).toContain('className="atlas-error-notice-card"');
    expect(errorNoticeSource).toContain("data-severity={error.severity}");
    expect(errorNoticeSource.split("min-h-[44px]").length - 1).toBe(3);
    expect(errorNoticeSource.split("min-w-[44px]").length - 1).toBe(3);
    expect(errorNoticeSource).not.toMatch(/bg-(?:sky|amber|lime|orange|rose)-950/);
    expect(boardCss).toContain(".atlas-error-notice-card {");
  });

  it("draws review bends with a seamless repeating diagonal field", () => {
    expect(boardCss).toContain("background-image: repeating-linear-gradient(135deg, #EDB92B 0 8px, #F8E8B7 8px 16px)");
    expect(boardCss).toMatch(/is-review\s*\{[^}]*background-image:\s*repeating-linear-gradient/);
    expect(boardCss).toContain("background-repeat: no-repeat;\n  background-size: auto;");
    expect(boardCss).toContain("background-color: #F8E8B7;");
  });

  it("uses the exact board palette and keeps the status UI quiet and legible", () => {
    expect(boardCss).toContain("--round-paper: #FAFAF8");
    expect(boardCss).toContain("--round-card: #FFFFFF");
    expect(boardCss).toContain("--round-raised: #F3F3F0");
    expect(boardCss).toContain("--round-ink: #18181A");
    expect(boardCss).toContain("--round-ink-2: #55555A");
    expect(boardCss).toContain("--round-ink-3: #74747A");
    expect(boardCss).toContain("--round-line: #E4E4DF");
    expect(boardCss).toContain("--round-red: #C8321E");
    expect(boardCss).toContain("--round-green: #1F8A4D");
    expect(boardCss).toContain("--round-blue: #2757C6");
    expect(boardCss).toContain("--round-gold: #EDB92B");
    expect(boardCss).toContain("box-shadow:0 8px 24px rgba(24,24,26,.10)!important;");
    expect(boardCss).not.toMatch(/font-size:\s*(?:8|9|10)px|font:\s*\d+\s*(?:8|9|10)px/);
    expect(workspaceStatusSource).not.toMatch(/text-\[10px\]|uppercase|tracking-|font-bold|font-semibold|shadow-\[0_0_8px|animate-pulse/);
    expect(launchAtlasButtonSource).not.toContain("text-[10px]");
    expect(launchAtlasButtonSource).not.toMatch(/rounded-lg|gap-2\.5|gap-1\.5/);
    expect(launchAtlasButtonSource).not.toContain("text-rose-300");
  });

  it("distinguishes missing keys, configured roles, and an unreachable API", () => {
    expect(apiKeyHealthSource).toContain('setLabel("No keys")');
    expect(apiKeyHealthSource).toContain('setLabel("Keys configured")');
    expect(apiKeyHealthSource).toContain('setLabel("API offline")');
    expect(apiKeyHealthSource).toContain('health?.researchKeysConfigured === false');
    expect(workspaceStatusSource).toContain("noKeysConfigured");
    expect(workspaceStatusSource).toContain("noActiveProviderCapacity");
    expect(workspaceStatusSource).toContain("No search-provider keys configured");
    expect(workspaceStatusSource).toContain("No keys configured");
    expect(systemStatusPageSource).toContain("GROQ_BOSS_API_KEY");
    expect(systemStatusPageSource).toContain("GROQ_RIGHT_HAND_API_KEY");
    expect(systemStatusPageSource).toContain("GROQ_INVESTIGATOR_API_KEY");
    expect(systemStatusPageSource).toContain("No active search-provider pool keys");
    expect(systemStatusPageSource).toContain("totalCooling");
    expect(providerSecretsDoc).toContain("A generic `GROQ_API_KEY` is a retired legacy name and does not substitute for these role-specific variables.");
  });

  it("keeps operational status surfaces within the board's quiet visual language", () => {
    expect(apiKeyHealthSource).not.toMatch(/uppercase|tracking-|text-\[10px\]|#9CFF1A|text-rose|font-bold/);
    expect(systemStatusPageSource).not.toMatch(/bg-gradient|blur-3xl|shadow-\[0_0_8px|animate-pulse|uppercase|tracking-|font-bold|font-semibold|text-\[10px\]/);
    expect(workspaceStatusSource).not.toMatch(/shadow-\[0_0_8px|animate-pulse|uppercase|tracking-|font-bold|font-semibold|text-\[10px\]/);
    expect(launchAtlasButtonSource).not.toContain("text-[10px]");
  });

  it("normalizes secondary routes to the board palette, type scale and spacing grid", () => {
    expect(boardCss).toContain('.atlas-round [class*="text-[10px]"]');
    expect(boardCss).toContain("font-size:11px!important;");
    expect(boardCss).toContain('.atlas-round [class*="uppercase"] { text-transform:none!important; }');
    expect(boardCss).toContain('.atlas-round [class*="tracking-"] { letter-spacing:0!important; }');
    expect(boardCss).toContain('.atlas-round [class*="font-bold"],');
    expect(boardCss).toContain('.atlas-round [class*="text-primary"] { color:var(--round-green)!important; }');
    expect(boardCss).toContain('.atlas-round [class*="text-secondary"] { color:var(--round-ink-2)!important; }');
    expect(boardCss).toContain('.atlas-round [class~="bg-primary"] { background-color:var(--round-green)!important; color:#FFFFFF!important; }');
    expect(boardCss).toContain('.atlas-round [class*="bg-gradient-to-"]');
    expect(boardCss).toContain("background-image:none!important;");
    expect(boardCss).toContain('.atlas-round [class*="shadow-"] { box-shadow:none!important; }');
    expect(boardCss).toContain('.atlas-round [class*="animate-pulse"] { animation:none!important; }');
    expect(boardCss).toContain('.atlas-round [class*="gap-2.5"] { gap:12px!important; }');
    expect(boardCss).toContain('.atlas-round [class*="py-2.5"] { padding-top:12px!important; padding-bottom:12px!important; }');
    expect(boardCss).toContain('.atlas-round [class*="rounded-lg"] { border-radius:12px!important; }');
    for (const source of secondaryRouteSources) {
      expect(source).not.toMatch(/text-\[(?:10|9|8)px\]|uppercase|tracking-\[|tracking-wider|tracking-wide|font-bold|font-semibold|bg-gradient-to-|blur-3xl|shadow-2xl|shadow-xl|shadow-lg|animate-pulse|#9CFF1A|#b8ff4d|#d4ff8a/);
    }
  });

  it("runs and retains real-browser evidence for missing-key and API-down states", () => {
    expect(responsiveWorkflowSource).toContain("fix/light-board-api-down-frame-and-alerts-2026-11-24");
    expect(responsiveWorkflowSource).toContain("actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02");
    expect(captureScriptSource).toContain("apiDownMode = true");
    expect(captureScriptSource).toContain("No active search-provider pool keys");
    expect(captureScriptSource).toContain('backgroundSize !== "64px 24px"');
    expect(captureScriptSource).toContain('checkerSize !== "22px 14px"');
    expect(captureScriptSource).toContain('headerBorderBottomWidth !== "0px"');
    expect(captureScriptSource).toContain("APEX_VISUAL_IMAGE_mobile_api_down_");
  });

  it("keeps the Discover rail inside the phone viewport after final desktop sizing", () => {
    expect(boardCss).toContain("@media (max-width:760px) {\n  .atlas-round .atlas-discover-layout { grid-template-columns:minmax(0,1fr); gap:24px; }");
    expect(boardCss).toContain(".atlas-round .atlas-discover-rail,\n  .atlas-round .atlas-discover-panel { min-width:0; max-width:100%; }");
  });


  it("uses the current light-shell collapsible sidebar instead of horizontal or bottom navigation", () => {
    expect(layoutSource).toContain('className="atlas-round-sidebar-toggle"');
    expect(layoutSource).toContain('id="atlas-round-sidebar"');
    expect(layoutSource).toContain('className="atlas-round-sidebar-nav"');
    expect(layoutSource).toContain('setSidebarCollapsed((collapsed) => !collapsed)');
    expect(layoutSource).toContain('setMobileOpen((open) => !open)');
    expect(boardCss).toContain(".atlas-round-shell.is-sidebar-collapsed");
    expect(boardCss).toContain(".atlas-round-shell.is-mobile-nav-open .atlas-round-sidebar");
    expect(boardCss).toContain(".atlas-round-mobile-tabbar { display:none; }");
  });

  it("keeps Home API-down in the same neutral checker-and-wave frame as the other consoles", () => {
    expect(boardCss).toContain(".atlas-round .atlas-home-route-card");
    expect(boardCss).toContain("border-radius:12px");
    expect(lastRule(".atlas-round .atlas-home-board-console.is-api-down")).toContain("background-color:#BDBDB8!important;");
    expect(lastRule(".atlas-round .atlas-home-board-console.is-api-down")).toContain("background-size:64px 24px!important;");
    expect(lastRule(".atlas-round .atlas-home-board-console.is-api-down::before")).toContain("background-size:22px 14px!important;");
    expect(boardCss).toContain(".atlas-round-shell:has(.atlas-round-status[data-status=\"offline\"]) .atlas-home-board-console,");
    expect(boardCss).toContain(".atlas-round-shell:has(.atlas-round-status[data-status=\"offline\"]) .atlas-discover-search-console,");
    expect(boardCss).toContain(".atlas-round-shell:has(.atlas-round-status[data-status=\"offline\"]) .atlas-ledger-console,");
    expect(boardCss).toContain(".atlas-round-shell:has(.atlas-round-status[data-status=\"offline\"]) .atlas-connections-console {");
    expect(lastRule(".atlas-round .atlas-reactor-run-console.is-api-down")).toContain("background-size:64px 24px;");
    expect(lastRule(".atlas-round .atlas-reactor-run-console.is-api-down::before")).toContain("background-size:22px 14px;");
  });
  it("renders the launch-console identity and rounded evidence rails from the design board", () => {
    expect(dashboardSource).toContain('className="atlas-home-console-brand"');
    expect(dashboardSource).toContain("<ApexAtlasMark className=\"atlas-home-console-brand-mark\" />");
    expect(dashboardSource).toContain(">Launch console</span>");
    expect(boardCss).toContain("font-size:clamp(42px,4.5vw,60px);");
    expect(boardCss).toContain("margin: 16px 0 0; color:var(--round-ink-2)!important; font-size:16px; line-height:1.6;");
    expect(launchAtlasButtonSource).toContain("rows={1}");
    expect(boardCss).toContain(".atlas-home-board-console textarea { min-height:56px; resize:vertical; padding: 16px 12px!important;");
    expect(lastRule(".atlas-round .atlas-evidence-pattern")).toContain("border-radius:6px!important;");
    expect(boardCss).toContain("width='64'%20height='24'%20viewBox='0%200%2064%2024'");
    expect(boardCss).toContain("background-size:64px 24px!important;");
  });

});
