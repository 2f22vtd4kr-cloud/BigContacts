import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("hidden entity visibility across list and cache surfaces", () => {
  it("flushes dashboard and search projections whenever hidden state changes", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/entities.ts"),
      "utf8",
    );
    const start = source.indexOf('router.patch("/entities/:id/hide"');
    const end = source.indexOf('router.patch("/entities/:id/reject-contact"', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const hideRoute = source.slice(start, end);
    expect(hideRoute).toContain('delCachePattern("entities:list:*")');
    expect(hideRoute).toContain('delCachePattern("dashboard:*")');
    expect(hideRoute).toContain('delCachePattern("search:*")');
  });

  it("does not include hidden entities in deduplication review candidate lists", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/entities.ts"),
      "utf8",
    );
    const duplicateStart = source.indexOf('router.get("/entities/duplicate-candidates"');
    const clusterStart = source.indexOf('router.get("/entities/same-source-name-clusters"');
    const clusterEnd = source.indexOf('router.get("/entities/:id/contact-evidence"', clusterStart);
    expect(duplicateStart).toBeGreaterThanOrEqual(0);
    expect(clusterStart).toBeGreaterThan(duplicateStart);
    expect(clusterEnd).toBeGreaterThan(clusterStart);
    expect(source.slice(duplicateStart, clusterStart)).toContain('.where(eq(entitiesTable.isHidden, false))');
    expect(source.slice(clusterStart, clusterEnd)).toContain('.where(eq(entitiesTable.isHidden, false))');
  });

  it("filters identity candidates that involve hidden entities", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/identity.ts"),
      "utf8",
    );
    expect(source).toContain('isHidden: entitiesTable.isHidden');
    expect(source).toContain('entityMap.get(candidate.entityId)?.isHidden !== true');
    expect(source).toContain('entityMap.get(candidate.candidateEntityId)?.isHidden !== true');
  });
});
