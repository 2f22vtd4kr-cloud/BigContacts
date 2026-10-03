import { describe, expect, it, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { atlasApiAuth } from "../lib/api-auth";

describe("Atlas API authentication", () => {
  const original = process.env.APEX_API_AUTH_TOKEN;

  beforeEach(() => { process.env.APEX_API_AUTH_TOKEN = "test-token-123"; });
  afterEach(() => {
    if (original === undefined) delete process.env.APEX_API_AUTH_TOKEN;
    else process.env.APEX_API_AUTH_TOKEN = original;
  });

  function app() {
    const instance = express();
    instance.get("/health", (_req, res) => res.status(200).json({ ok: true }));
    instance.use(atlasApiAuth);
    instance.get("/protected", (_req, res) => res.status(200).json({ ok: true }));
    return instance;
  }

  it("rejects missing and invalid bearer tokens", async () => {
    await request(app()).get("/protected").expect(401);
    await request(app()).get("/protected").set("Authorization", "Bearer wrong").expect(401);
  });

  it("accepts the configured bearer token", async () => {
    await request(app()).get("/protected").set("Authorization", "Bearer test-token-123").expect(200);
  });

  it("leaves health-style routes public when mounted after them", async () => {
    await request(app()).get("/health").expect(200);
  });
});
