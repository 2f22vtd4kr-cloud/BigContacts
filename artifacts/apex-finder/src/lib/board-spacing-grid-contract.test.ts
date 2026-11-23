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
    const unsupported = radii.filter((radius) => !/^(?:0|50%|(?:6|10|12|16|20)px)(?:!important)?$/.test(radius));
    expect(unsupported).toEqual([]);
  });

  it("uses the intended control and card corner radii", () => {
    const radiusFor = (selector: string) => {
      const start = boardCss.lastIndexOf(selector + " {");
      if (start < 0) return undefined;
      const open = boardCss.indexOf("{", start);
      const close = boardCss.indexOf("}", open);
      return boardCss.slice(open + 1, close).match(/border-radius:\s*([^;]+)/)?.[1].trim();
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
});
