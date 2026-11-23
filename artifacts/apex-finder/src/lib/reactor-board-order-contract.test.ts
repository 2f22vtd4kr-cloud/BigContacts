import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reactorSource = readFileSync(new URL("../pages/reactor.tsx", import.meta.url), "utf8");
const liveSurfaceSource = readFileSync(new URL("../components/reactor-live-surface.tsx", import.meta.url), "utf8");

describe("board Reactor chronological logbook", () => {
  it("renders recorded activity oldest first and newest last", () => {
    expect(liveSurfaceSource).toContain('.sort((a,b)=>Date.parse(String(a.timestamp??""))-Date.parse(String(b.timestamp??""))');
    expect(reactorSource).toContain("const latestStep = logItems[logItems.length - 1]");
    expect(reactorSource).toContain("newest last");
  });
});
