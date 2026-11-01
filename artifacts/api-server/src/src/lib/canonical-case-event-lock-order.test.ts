import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const eventWriterPaths = [
  "src/src/lib/canonical-atlas-discovery.ts",
  "src/src/lib/atlas-control-decision.ts",
  "src/src/lib/target-control-decision.ts",
  "src/src/lib/bureau-agentic-pass.ts",
  "src/src/lib/canonical-single-target-runner.ts",
  "src/src/routes/research/canonical-case-continuation.ts",
  "src/src/routes/research/canonical-target-continuation.ts",
];

function assertEventTransactionsLockBeforeRow(relativePath: string): number {
  const filePath = path.resolve(process.cwd(), relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const starts = [...source.matchAll(/(?:await\\s+)?db\\.transaction\\(async\\s*\\(tx\\)\\s*=>\\s*\\{/g)]
    .map((match) => match.index ?? -1);
  let checked = 0;
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]!;
    const end = starts[index + 1] ?? source.length;
    const block = source.slice(start, end);
    if (!block.includes("tx.insert(researchCaseEventsTable)")) continue;
    const rowLock = block.indexOf('.for("update")');
    if (rowLock < 0) continue;
    checked += 1;
    const lock = block.indexOf("lockResearchCaseEventAppendStream(tx,");
    const insert = block.indexOf("tx.insert(researchCaseEventsTable)");
    expect(lock, relativePath + ": event-writing transaction must acquire the per-case advisory lock").toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(rowLock);
    expect(lock).toBeLessThan(insert);
  }
  return checked;
}

describe("canonical case-event append lock ordering", () => {
  it("acquires the per-case advisory lock before row locks in every event-writing transaction", () => {
    let checked = 0;
    for (const relativePath of eventWriterPaths) {
      checked += assertEventTransactionsLockBeforeRow(relativePath);
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });
});
