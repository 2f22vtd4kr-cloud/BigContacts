/** Critical-path smoke tests for the live API HTTP boundary. */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = `http://localhost:${process.env.PORT ?? 8080}`;
type JsonBody = any;

async function get(path: string): Promise<{ status: number; body: JsonBody }> {
  const res = await fetch(`${BASE}${path}`);
  const body: unknown = await res.json();
  return { status: res.status, body: body as JsonBody };
}

describe("GET /api/healthz", () => {
  it("returns 200 and status ok", async () => {
    const { status, body } = await get("/api/healthz");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
  });
});

describe("GET /api/ingest/contact-research/status", () => {
  it("returns resumable coordinator state without starting work", async () => {
    const { status, body } = await get("/api/ingest/contact-research/status");
    expect(status).toBe(200);
    expect(body).toHaveProperty("active");
    expect(body).toHaveProperty("latest");
    if (body.latest) {
      expect(body.latest).toHaveProperty("jobId");
      expect(body.latest).toHaveProperty("currentPhase");
    }
  });
});

describe("POST /api/ingest/contact-research/cancel", () => {
  it("returns a safe error when no coordinator is active", async () => {
    const res = await fetch(`${BASE}/api/ingest/contact-research/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("No contact-research job is active");
  });
});

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
    body.forEach((entity: any) => expect(entity.type).toBe("HNWI"));
  });

  it("keeps review-only candidates separate from reachable direct contacts", async () => {
    const candidate = await get("/api/entities?contactOutcome=direct_contact_candidate&limit=100");
    expect(candidate.status).toBe(200);
    expect(Array.isArray(candidate.body)).toBe(true);
    candidate.body.forEach((entity: any) => {
      expect(entity.contactOutcome).toBe("direct_contact_candidate");
      expect(entity.isHot).toBe(false);
    });
    const direct = await get("/api/entities?contactOutcome=direct&limit=100");
    expect(direct.status).toBe(200);
    expect(Array.isArray(direct.body)).toBe(true);
    direct.body.forEach((entity: any) => expect(entity.contactOutcome).toBe("direct_contact_verified"));
  });
});

describe("GET /api/dashboard/stats", () => {
  it("returns expected KPI fields", async () => {
    const { status, body } = await get("/api/dashboard/stats");
    expect(status).toBe(200);
    expect(body).toHaveProperty("totalEntities");
    expect(body).toHaveProperty("totalAssets");
    expect(body).toHaveProperty("avgBayesianScore");
    expect(body).toHaveProperty("contactableCount");
    expect(body).toHaveProperty("enrichmentCoverage");
    expect(typeof body.totalEntities).toBe("number");
  });
});

describe("GET /api/entities/:id/occrp", () => {
  let firstEntityId: number | null = null;
  beforeAll(async () => {
    const { body } = await get("/api/entities?limit=1");
    if (Array.isArray(body) && body.length > 0) firstEntityId = body[0].id;
  });
  it("returns aleph field (null or object) for a valid entity", async () => {
    if (!firstEntityId) return;
    const { status, body } = await get(`/api/entities/${firstEntityId}/occrp`);
    expect(status).toBe(200);
    expect(body).toHaveProperty("entityName");
    expect(body).toHaveProperty("aleph");
  });
  it("returns 400 for a non-numeric id", async () => expect((await get("/api/entities/abc/occrp")).status).toBe(400));
  it("returns 404 for a non-existent entity", async () => expect((await get("/api/entities/9999999/occrp")).status).toBe(404));
});

describe("GET /api/entities/:id/opensky", () => {
  let firstEntityId: number | null = null;
  beforeAll(async () => {
    const { body } = await get("/api/entities?limit=1");
    if (Array.isArray(body) && body.length > 0) firstEntityId = body[0].id;
  });
  it("returns flights array for a valid entity", async () => {
    if (!firstEntityId) return;
    const { status, body } = await get(`/api/entities/${firstEntityId}/opensky`);
    expect(status).toBe(200);
    expect(body).toHaveProperty("flights");
    expect(Array.isArray(body.flights)).toBe(true);
  });
  it("returns 400 for a non-numeric id", async () => expect((await get("/api/entities/xyz/opensky")).status).toBe(400));
});

describe("POST /api/registry-search", () => {
  it("endpoint is reachable and returns a JSON body", async () => {
    const res = await fetch(`${BASE}/api/registry-search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "Holdings", registry: "opencorporates", limit: 3 }) });
    const body: unknown = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
  });
  it("returns 400 for a missing query body", async () => {
    const res = await fetch(`${BASE}/api/registry-search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
  });
});

describe("Duplicate review endpoints", () => {
  it("returns cross-registry candidates without self-pairs", async () => {
    const { status, body } = await get("/api/entities/duplicate-candidates");
    expect(status).toBe(200);
    expect(typeof body).toBe("object");
    expect(Array.isArray(body.candidates)).toBe(true);
    for (const candidate of body.candidates) expect(candidate.entityA.id).not.toBe(candidate.entityB.id);
  });
  it("returns same-source name clusters for review", async () => {
    const { status, body } = await get("/api/entities/same-source-name-clusters");
    expect(status).toBe(200);
    expect(typeof body).toBe("object");
    expect(Array.isArray(body.clusters)).toBe(true);
    for (const cluster of body.clusters) {
      expect(cluster.count).toBeGreaterThan(1);
      expect(cluster.entities.length).toBe(cluster.count);
      expect(new Set(cluster.entities.map((entity: any) => entity.id)).size).toBe(cluster.count);
    }
  });
});
