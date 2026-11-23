import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const boardCss = readFileSync(new URL("../flat-round.css", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../components/layout-round.tsx", import.meta.url), "utf8");

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
    expect(radiusFor(".atlas-round-mobile-utilities")).toBe("16px");
    expect(radiusFor(".atlas-round-mobile-utilities a,.atlas-round-mobile-utilities button")).toBe("6px");
    expect(radiusFor(".atlas-home-console-inner")).toBe("12px");
    expect(radiusFor(".atlas-round .atlas-home-board-console")).toBe("20px!important");
    expect(radiusFor(".atlas-round .atlas-home-board-console .atlas-launch-cta")).toBe("10px!important");
    expect(radiusFor(".atlas-launch-depth button")).toBe("6px");
    expect(radiusFor(".atlas-launch-target-count button")).toBe("6px");
    expect(layoutSource).toContain("primaryNav.map(item =>");
    expect(layoutSource).toContain("utilityNav.map(item =>");
    expect(layoutSource).not.toContain("atlas-round-mobile-nav");
  });

  it("keeps checky cells and verified dots on exact repeating grids", () => {
    expect(boardCss).toContain("width='24'%20height='24'%20viewBox='0%200%2024%2024'");
    expect(boardCss).toContain("background-size: 24px 24px;");
    expect(boardCss).toContain("radial-gradient(circle, #1F8A4D 1.15px, transparent 1.3px)");
    expect(boardCss).toContain("background-size: 12px 12px;");
    expect(boardCss).toContain("background-color: #1F8A4D;");
    expect(boardCss).toContain("radial-gradient(circle, #FAFAF8 1.15px, transparent 1.3px)");
  });

  it("tiles wave fields continuously across horizontal and vertical SVG edges", () => {
    const continuousWaveRows = "M-16%2012%20C-8%208%20-8%208%200%2012%20S8%2016%2016%2012%20S24%208%2032%2012%20S40%2016%2048%2012";
    expect(boardCss.split(continuousWaveRows).length - 1).toBe(2);
    expect(boardCss).toContain("width='32'%20height='24'%20viewBox='0%200%2032%2024'");
    expect(boardCss).toContain("background-size: 32px 24px;");
    expect(boardCss).toContain("background-color: #2757C6;");
    expect(boardCss).toContain("stroke='%23FAFAF8'");
    expect(boardCss).toContain(".atlas-home-board-console::before { left:0; border-radius:20px 0 0 20px; }");
    expect(boardCss).toContain(".atlas-home-board-console::after { right:0; border-radius:0 20px 20px 0; }");
  });

  it("draws review bends with a seamless repeating diagonal field", () => {
    expect(boardCss).toContain("background-image: repeating-linear-gradient(135deg, #EDB92B 0 5px, #F8E8B7 5px 11px)");
    expect(boardCss).toMatch(/is-review\s*\{\s*background-image:\s*repeating-linear-gradient/ );
    expect(boardCss).toContain("background-repeat: no-repeat;\n  background-size: auto;");
    expect(boardCss).toContain("background-color: #F8E8B7;");
  });

});
