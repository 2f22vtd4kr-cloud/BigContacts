import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function listTypeScriptSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptSources(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts") || entry.name.endsWith(".dev.ts")) return [];
    return [fullPath];
  });
}

describe("canonical case-event append lock ordering", () => {
  it("acquires the per-case advisory lock before row locks in every event-writing transaction", () => {
    const sourceRoot = resolve(process.cwd(), "src/src");
    const sourceFiles = listTypeScriptSources(sourceRoot);
    let checked = 0;
    const violations: string[] = [];
    for (const filePath of sourceFiles) {
      const source = readFileSync(filePath, "utf8");
      const starts = [...source.matchAll(/db\.transaction\(async\s*\(?\s*tx\s*\)?\s*=>\s*\{/g)]
        .map((match) => match.index ?? -1);
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
        if (lock < 0 || lock > rowLock || lock > insert) violations.push(relative(sourceRoot, filePath));
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
    expect(violations, "event-writing transactions with row locks must acquire the per-case advisory lock first").toEqual([]);
  });
});
