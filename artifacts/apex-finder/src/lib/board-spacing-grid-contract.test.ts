import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const boardCss = readFileSync(new URL("../flat-round.css", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../components/layout-round.tsx", import.meta.url), "utf8");
const errorNoticeSource = readFileSync(new URL("../components/apex-error-notice.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../pages/dashboard.tsx", import.meta.url), "utf8");

describe("Flat Round four-pixel spacing grid", () => {
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
    expect(radiusFor(".atlas-round-primary")).toBe("16px");
    expect(radiusFor(".atlas-round-navlink")).toBe("6px");
    expect(radiusFor(".atlas-round .atlas-card")).toBe("12px!important");
    expect(radiusFor(".atlas-round-mobile-tabbar .atlas-round-navlink")).toBe("6px");
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

  it("keeps checky cells and supported dots on exact repeating grids", () => {
    expect(boardCss).toContain("width='24'%20height='24'%20viewBox='0%200%2024%2024'");
    expect(boardCss).toContain("background-size: 24px 24px;");
    expect(boardCss).toContain("radial-gradient(circle, #FAFAF8 1.15px, transparent 1.3px)");
    expect(boardCss).toContain("background-size: 12px 12px;");
    expect(boardCss).toContain("background-color: #1F8A4D;");
    expect(boardCss).toContain("radial-gradient(circle, #FAFAF8 1.15px, transparent 1.3px)");
  });

  it("tiles wave fields continuously across horizontal and vertical SVG edges", () => {
    const continuousWaveRows = "M-16%2012%20C-8%208%20-8%208%200%2012%20S8%2016%2016%2012%20S24%208%2032%2012%20S40%2016%2048%2012";
    expect(boardCss.split(continuousWaveRows).length - 1).toBe(4);
    expect(boardCss).toContain("width='32'%20height='24'%20viewBox='0%200%2032%2024'");
    expect(boardCss).toContain("background-size: 32px 24px;");
    expect(boardCss).toContain("background-color: #2757C6;");
    expect(boardCss).toContain("stroke='%23FAFAF8'");
    expect(boardCss).toContain(".atlas-home-board-console::before { left:0; border-radius:20px 0 0 20px; }");
    expect(boardCss).toContain(".atlas-home-board-console::after { right:0; border-radius:0 20px 20px 0; }");
  });

  it("keeps Card mobile navigation on the shared icon-tab contract", () => {
    expect(layoutSource).toContain('const linkClass = mobile ? "atlas-round-navlink" : isCardPage ? "atlas-card-shell-navlink" : "atlas-round-navlink";');
    expect(layoutSource).toContain('{(!isCardPage || mobile) && <Icon aria-hidden="true" />}');
    expect(boardCss).toContain(".atlas-round-mobile-tabbar .atlas-round-navlink svg");
    expect(boardCss).toContain(".atlas-round-shell.is-card-page .atlas-round-content { padding: 16px 16px calc(112px + env(safe-area-inset-bottom)); }");
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

  it("uses API-state-aware Home framing with Reactor-aligned wave placement", () => {
    expect(dashboardSource).toContain('data-api-state={apiUnavailable || mock ? "down" : "ready"}');
    expect(boardCss).toContain(".atlas-round .atlas-home-board-console::after { display:none; }");
    expect(boardCss).toContain("background-size:64px 24px");
    expect(boardCss).toContain('data-api-state="down"');
    expect(boardCss).toContain("background-color:#BDBDB8!important");
    expect(boardCss).toContain("background-image:conic-gradient(#BDBDB8 25%,#E2E2DD 0 50%,#BDBDB8 0 75%,#E2E2DD 0)");
    expect(boardCss).toContain("background-size:22px 14px");
  });

  it("keeps the sidebar full-height and uses text-only active emphasis", () => {
    expect(boardCss).toContain("grid-row:1 / -1");
    expect(boardCss).toContain("height:100dvh");
    expect(boardCss).toContain(".atlas-round-sidebar .atlas-round-navlink.is-active { background:transparent; color:var(--round-ink); box-shadow:none; }");
    expect(boardCss).toContain("font-weight:700");
    expect(boardCss).not.toContain("box-shadow:inset 3px 0 0 var(--round-red)");
  });

  it("persists dismissal of the same user-facing error for the current tab session", () => {
    expect(errorNoticeSource).toContain('const DISMISSED_ERRORS_KEY = "apex:dismissed-user-errors:v1"');
    expect(errorNoticeSource).toContain("window.sessionStorage.setItem(DISMISSED_ERRORS_KEY");
    expect(errorNoticeSource).toContain("dismissedErrors.current.has(errorFingerprint(next))");
    expect(errorNoticeSource).toContain("onClick={dismissError}");
  });
});
