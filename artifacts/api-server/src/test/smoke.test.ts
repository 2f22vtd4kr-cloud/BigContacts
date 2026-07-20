/**
 * Critical-path smoke tests for the ApexFinder API server.
 * These are integration tests that verify the core endpoints
 * are reachable and return sensible shapes without mocking the DB.
 *
 * Run: pnpm --filter @workspace/api-server test
 *
 * Requirements: API server must be running on the port in PORT env var
 * (defaults to 8080 for dev). Tests hit the live server via HTTP.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = `http://localhost:${process.env.PORT ?? 8080}`;

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

// ── 1. Health check ──────────────────────────────────────────────────────────

describe("GET /api/healthz", () => {
  it("returns 200 and status ok", async () => {
    const { status, body } = await get("/api/healthz");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
  });
});

// ── 2. Entity list ───────────────────────────────────────────────────────────

describe("GET /api/entities", () => {
  it("returns an array with expected fields", async () => {
    const { status, body } = await get("/api/entities?limit=5");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      const first = body[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("type");
      expect(first).toHaveProperty("bayesianScore");
    }
  });

  it("honours limit param", async () => {
    const { body } = await get("/api/entities?limit=3");
    expect(body.length).toBeLessThanOrEqual(3);
  });

  it("filters by type", async () => {
    const { body } = await get("/api/entities?type=HNWI&limit=10");
    expect(Array.isArray(body)).toBe(true);
    body.forEach((e: any) => expect(e.type).toBe("HNWI"));
  });
});

// ── 3. Dashboard stats ───────────────────────────────────────────────────────

describe("GET /api/dashboard/stats", () => {
  it("returns expected KPI fields", async () => {
    const { status, body } = await get("/api/dashboard/stats");
    expect(status).toBe(200);
    // Actual field names from the dashboard route
    expect(body).toHaveProperty("totalEntities");
    expect(body).toHaveProperty("totalAssets");
    expect(body).toHaveProperty("avgBayesianScore");
    // Phase 3/4 KPIs
    expect(body).toHaveProperty("contactableCount");
    expect(body).toHaveProperty("enrichmentCoverage");
    expect(typeof body.totalEntities).toBe("number");
  });
});

// ── 4. Entity OCCRP endpoint (new in Phase 5) ────────────────────────────────

describe("GET /api/entities/:id/occrp", () => {
  let firstEntityId: number | null = null;

  beforeAll(async () => {
    const { body } = await get("/api/entities?limit=1");
    if (Array.isArray(body) && body.length > 0) {
      firstEntityId = body[0].id;
    }
  });

  it("returns aleph field (null or object) for a valid entity", async () => {
    if (!firstEntityId) return; // skip if DB is empty
    const { status, body } = await get(`/api/entities/${firstEntityId}/occrp`);
    expect(status).toBe(200);
    expect(body).toHaveProperty("entityName");
    expect(body).toHaveProperty("aleph"); // may be null if not yet enriched
  });

  it("returns 400 for a non-numeric id", async () => {
    const { status } = await get("/api/entities/abc/occrp");
    expect(status).toBe(400);
  });

  it("returns 404 for a non-existent entity", async () => {
    const { status } = await get("/api/entities/9999999/occrp");
    expect(status).toBe(404);
  });
});

// ── 5. Entity OpenSky endpoint (new in Phase 5) ──────────────────────────────

describe("GET /api/entities/:id/opensky", () => {
  let firstEntityId: number | null = null;

  beforeAll(async () => {
    const { body } = await get("/api/entities?limit=1");
    if (Array.isArray(body) && body.length > 0) {
      firstEntityId = body[0].id;
    }
  });

  it("returns flights array for a valid entity", async () => {
    if (!firstEntityId) return; // skip if DB is empty
    const { status, body } = await get(`/api/entities/${firstEntityId}/opensky`);
    expect(status).toBe(200);
    expect(body).toHaveProperty("flights");
    expect(Array.isArray(body.flights)).toBe(true);
  });

  it("returns 400 for a non-numeric id", async () => {
    const { status } = await get("/api/entities/xyz/opensky");
    expect(status).toBe(400);
  });
});

// ── 6. Registry search ───────────────────────────────────────────────────────
// Note: OpenCorporates requires an API key; without one this endpoint returns
// an error from upstream. The smoke test only verifies the endpoint is reachable
// and returns a JSON object (not a 404/500 from our server itself).

describe("POST /api/registry-search", () => {
  it("endpoint is reachable and returns a JSON body", async () => {
    const res = await fetch(`${BASE}/api/registry-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Holdings", registry: "opencorporates", limit: 3 }),
    });
    const body = await res.json();
    // We accept 200 (API key present) or 500 (upstream auth error) —
    // both indicate our server handled the request, not a routing 404.
    expect([200, 500]).toContain(res.status);
    // Either way the body must be a JSON object
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
  });

  it("returns 400 for a missing query body", async () => {
    const res = await fetch(`${BASE}/api/registry-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
