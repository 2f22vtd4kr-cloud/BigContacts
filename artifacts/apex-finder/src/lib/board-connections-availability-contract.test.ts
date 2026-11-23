import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const connectionsSource = readFileSync(new URL("../pages/board-connections.tsx", import.meta.url), "utf8");

describe("board Connections backend projection", () => {
  it("renders the canonical relationship API rather than inventing a contacts integration", () => {
    expect(connectionsSource).toContain("useListRelationships");
    expect(connectionsSource).toContain("relationship.sourceEntityName");
    expect(connectionsSource).toContain("relationship.targetName");
    expect(connectionsSource).toContain("relationship.relationshipType");
    expect(connectionsSource).toContain("relationship.strength");
    expect(connectionsSource).toContain("No relationships have been recorded yet.");
    expect(connectionsSource).not.toContain("Contact source unavailable");
    expect(connectionsSource).not.toContain("Connect a user-owned contact source");
  });

  it("does not infer verification states from relationship fields", () => {
    expect(connectionsSource).toContain("Evidence verification states are not inferred from these fields.");
    expect(connectionsSource).not.toContain("is-verified");
    expect(connectionsSource).not.toContain("is-corroborated");
    expect(connectionsSource).not.toContain("is-review");
  });

  it("provides searchable and filterable entity and asset relationship records", () => {
    expect(connectionsSource).toContain('filter === "entity"');
    expect(connectionsSource).toContain('filter === "asset"');
    expect(connectionsSource).toContain("setSearch");
  });
});
