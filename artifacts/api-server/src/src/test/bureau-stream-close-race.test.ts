import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(process.cwd(), "src/routes/bureau-stream.ts");

function readRoute(): string {
  return fs.readFileSync(routePath, "utf8");
}

describe("Bureau SSE close/snapshot race contract", () => {
  it("declares timer handles before close can fire and refuses to start timers after snapshot close", () => {
    const source = readRoute();
    const timerDeclarations = source.indexOf("let pollId: NodeJS.Timeout | undefined;");
    const closeHandler = source.indexOf("req.on(\"close\", close);");
    const snapshotAwait = source.indexOf("await sendSnapshot().catch(() => undefined);");
    const closedGuard = source.indexOf("if (closed) return;\n\n  pollId = setInterval");

    expect(timerDeclarations).toBeGreaterThanOrEqual(0);
    expect(closeHandler).toBeGreaterThan(timerDeclarations);
    expect(snapshotAwait).toBeGreaterThan(closeHandler);
    expect(closedGuard).toBeGreaterThan(snapshotAwait);
  });

  it("clears both polling timers when the client closes", () => {
    const source = readRoute();
    expect(source).toContain("if (pollId) clearInterval(pollId);");
    expect(source).toContain("if (hbId) clearInterval(hbId);");
    expect(source).toContain("req.on(\"close\", close);");
  });
});
