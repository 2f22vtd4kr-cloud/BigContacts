import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const connectionsSource = readFileSync(new URL("../pages/board-connections.tsx", import.meta.url), "utf8");

describe("board Connections availability state", () => {
  it("does not present a missing contacts source as a confirmed zero-route result", () => {
    expect(connectionsSource).toContain("Contact source unavailable");
    expect(connectionsSource).toContain("Routes are unavailable.");
    expect(connectionsSource).toContain("Connect a user-owned contact source.");
    expect(connectionsSource).toContain("no contacts or paths are inferred from names alone.");
    expect(connectionsSource).toContain('>Unavailable</span>');
  });
});
