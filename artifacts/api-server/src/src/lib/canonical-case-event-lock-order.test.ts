import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const canonicalPath = path.resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts");
const controlPath = path.resolve(process.cwd(), "src/src/lib/atlas-control-decision.ts");

function assertEventTransactionsLockBeforeRow(): void {
  const source = fs.readFileSync(canonicalPath, "utf8");
  const starts = [...source.matchAll(/await db\.transaction\(async \(tx\) => \{/g)].map((match) => match.index ?? -1);
  let eventTransactions = 0;
  for (const start of starts) {
    const end = source.indexOf('}, { isolationLevel: "serializable" });', start);
    if (end < 0) continue;
    const block = source.slice(start, end);
    if (!block.includes("tx.insert(researchCaseEventsTable)")) continue;
    eventTransactions += 1;
    const lock = block.indexOf("lockResearchCaseEventAppendStream(tx,");
    const rowLock = block.indexOf('.for("update")');
    const insert = block.indexOf("tx.insert(researchCaseEventsTable)");
    expect(lock, "event-writing transaction must acquire the per-case advisory lock").toBeGreaterThanOrEqual(0);
    expect(rowLock, "event-writing transaction must retain its durable row lock").toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(rowLock);
    expect(lock).toBeLessThan(insert);
  }
  expect(eventTransactions).toBeGreaterThanOrEqual(10);
}

describe("canonical case-event append lock ordering", () => {
  it("takes the same per-case advisory lock before row locks in every canonical event-writing transaction", () => {
    assertEventTransactionsLockBeforeRow();
  });

  it("takes the per-case append lock before locking the case for a Boss control decision", () => {
    const source = fs.readFileSync(controlPath, "utf8");
    const start = source.indexOf("async function persistControlDecision(");
    const end = source.indexOf("\nexport function compactAtlasInvestigatorReport", start);
    const body = source.slice(start, end);
    const lock = body.indexOf("lockResearchCaseEventAppendStream(tx, input.caseId)");
    const rowLock = body.indexOf('.for("update")');
    const insert = body.indexOf("tx.insert(researchCaseEventsTable)");
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(rowLock).toBeGreaterThan(lock);
    expect(insert).toBeGreaterThan(rowLock);
  });
});
