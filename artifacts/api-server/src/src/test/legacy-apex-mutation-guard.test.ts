import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

const rows = vi.hoisted(() => ({ current: [] as Array<{ id: number; type: string }> }));

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows.current,
        }),
      }),
    }),
  },
  entitiesTable: { id: "id", type: "type" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_a: unknown, _b: unknown) => "eq",
  inArray: (_a: unknown, _b: unknown) => "inArray",
}));

import { legacyApexMutationGuard } from "../lib/legacy-apex-mutation-guard";

function invoke(input: { method: string; path: string; params?: Record<string, string>; body?: unknown; rows?: Array<{ id: number; type: string }> }) {
  rows.current = input.rows ?? [];
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { response.statusCode = code; return response; },
    json(body: unknown) { response.body = body; return response; },
  } as unknown as Response;
  let nextCalled = false;
  const next = (() => { nextCalled = true; }) as NextFunction;
  void legacyApexMutationGuard({
    method: input.method,
    path: input.path,
    params: input.params ?? {},
    body: input.body ?? {},
  } as unknown as Request, response, next);
  return new Promise((resolve) => setImmediate(() => resolve({ response, nextCalled })));
}

describe("legacy Apex mutation boundary", () => {
  it("blocks a PATCH that promotes a non-Apex entity to HNWI while adding contact state", async () => {
    const result = await invoke({
      method: "PATCH",
      path: "/entities/7",
      params: { id: "7" },
      body: { type: "HNWI", email: "person@example.com" },
      rows: [{ id: 7, type: "Corporation" }],
    });
    expect(result.response.statusCode).toBe(409);
    expect(result.nextCalled).toBe(false);
  });

  it("blocks an import draft whose invalid type would default to HNWI with contact state", async () => {
    const result = await invoke({
      method: "POST",
      path: "/entities/import/batch",
      body: { drafts: [{ name: "Example Person", type: "Person", email: "person@example.com" }] },
    });
    expect(result.response.statusCode).toBe(409);
    expect(result.nextCalled).toBe(false);
  });

  it("blocks merges involving an Apex entity", async () => {
    const result = await invoke({
      method: "POST",
      path: "/entities/7/merge/8",
      params: { id: "7", targetId: "8" },
      rows: [{ id: 7, type: "HNWI" }, { id: 8, type: "Corporation" }],
    });
    expect(result.response.statusCode).toBe(409);
    expect(result.nextCalled).toBe(false);
  });

  it("allows a merge when neither entity is Apex", async () => {
    const result = await invoke({
      method: "POST",
      path: "/entities/7/merge/8",
      params: { id: "7", targetId: "8" },
      rows: [{ id: 7, type: "Corporation" }, { id: 8, type: "Trust" }],
    });
    expect(result.response.statusCode).toBe(200);
    expect(result.nextCalled).toBe(true);
  });
});
