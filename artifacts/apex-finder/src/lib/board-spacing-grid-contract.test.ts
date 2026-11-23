import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const boardCss = readFileSync(new URL("../flat-round.css", import.meta.url), "utf8");

describe("Flat Round four-pixel spacing grid", () => {
  it("keeps padding, margin and gaps on four-pixel increments", () => {
    const declarations = [...boardCss.matchAll(
      /(?:^|[;{]\\s*)(padding(?:-(?:top|right|bottom|left|inline|block))?|margin(?:-(?:top|right|bottom|left|inline|block))?|gap|row-gap|column-gap)\\s*:\\s*([^;}]+)/g,
    )];
    const violations = declarations.flatMap((match) => {
      const values = [...match[2].matchAll(/(-?\\d+(?:\\.\\d+)?)px/g)].map((value) => Number(value[1]));
      return values.filter((value) => Math.abs(value) % 4 !== 0).map((value) => ({ declaration: match[0], value }));
    });
    expect(violations).toEqual([]);
  });
});
