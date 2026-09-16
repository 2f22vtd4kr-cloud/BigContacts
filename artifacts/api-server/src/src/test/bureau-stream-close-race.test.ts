import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(process.cwd(), "src/src/routes/bureau-stream.ts");

function readRoute(): string {
  return fs.readFileSync(routePath, "utf8");
}

describe("Bureau SSE close/snapshot race contract", () => {
  it("registers close handling before snapshot/timers and fences timer startup", () => {
    const source = readRoute();
    const timerDeclarations = source.indexOf("let pollId: NodeJS.Timeout | undefined;");
    const closeHandler = source.indexOf("req.on(\"close\", close);");
    const snapshot = source.indexOf("sendSnapshot();");
    const closedGuard = source.indexOf("if (closed) return;\n\n  pollId = setInterval");

    expect(timerDeclarations).toBeGreaterThanOrEqual(0);
    expect(closeHandler).toBeGreaterThan(timerDeclarations);
    expect(snapshot).toBeGreaterThan(closeHandler);
    expect(closedGuard).toBeGreaterThan(snapshot);
  });

  it("clears both polling timers when the client closes", () => {
    const source = readRoute();
    expect(source).toContain("if (pollId) clearInterval(pollId);");
    expect(source).toContain("if (hbId) clearInterval(hbId);");
    expect(source).toContain("req.on(\"close\", close);");
  });
});
