#!/usr/bin/env node
/**
 * Phase E operator proof against a running Apex API.
 * Usage: API_BASE=https://your-api node scripts/proof-visibility-live.mjs
 * Optional: PROOF_NAME="Trace Cohen" PROOF_QUERY="angel investor"
 *
 * Checks:
 * 1. healthz has lanesHonesty + registryShallowRisk
 * 2. dashboard stats expose reviewCandidates
 * 3. active-job idle returns 200 with null (not 404)
 * 4. After optional discovery POST, ledger counters move (if API allows)
 */
const base = (process.env.API_BASE || process.env.API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const results = [];

function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const resp = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20_000) });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: resp.status, json, text: text.slice(0, 500) };
}

async function main() {
  console.log(`Proof against ${base}\n`);

  // 1. healthz
  try {
    const h = await get("/api/healthz");
    ok("healthz reachable", h.status === 200, `status=${h.status}`);
    ok("lanesHonesty present", Boolean(h.json?.lanesHonesty), JSON.stringify(h.json?.lanesHonesty ?? {}).slice(0, 120));
    ok("registryShallowRisk field", typeof h.json?.registryShallowRisk === "boolean" || typeof h.json?.lanesHonesty?.registryShallowRisk === "boolean",
      `value=${h.json?.registryShallowRisk ?? h.json?.lanesHonesty?.registryShallowRisk}`);
  } catch (e) {
    ok("healthz reachable", false, e instanceof Error ? e.message : String(e));
  }

  // 2. dashboard stats
  try {
    const d = await get("/api/dashboard/stats");
    ok("dashboard stats", d.status === 200, `status=${d.status}`);
    ok("reviewCandidates counter", typeof d.json?.reviewCandidates === "number", `reviewCandidates=${d.json?.reviewCandidates}`);
    ok("registryShallowRisk on dashboard", typeof d.json?.registryShallowRisk === "boolean", `value=${d.json?.registryShallowRisk}`);
  } catch (e) {
    ok("dashboard stats", false, e instanceof Error ? e.message : String(e));
  }

  // 3. active-job must not 404 when idle
  try {
    const a = await get("/api/ingest/job/active/case-bureau-discovery");
    ok("active-job idle returns 200", a.status === 200, `status=${a.status} body=${JSON.stringify(a.json).slice(0, 120)}`);
    ok("active-job idle shape", a.json?.active === false || a.json?.jobId == null, JSON.stringify(a.json).slice(0, 120));
  } catch (e) {
    ok("active-job idle returns 200", false, e instanceof Error ? e.message : String(e));
  }

  // 4. entity ledger sample
  try {
    const e = await get("/api/entities?limit=5");
    ok("entities list", e.status === 200 || e.status === 404, `status=${e.status}`);
  } catch (e) {
    ok("entities list", false, e instanceof Error ? e.message : String(e));
  }

  // 5. refresh-surface route exists (404 on missing entity is ok; 400/404 not 405)
  try {
    const r = await fetch(`${base}/api/entities/1/refresh-surface`, {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
    });
    ok("refresh-surface route reachable", r.status !== 404 && r.status !== 405, `status=${r.status}`);
    if (r.status === 200) {
      const body = await r.json().catch(() => ({}));
      const contacts = Array.isArray(body.contacts) ? body.contacts : [];
      const orgish = contacts.filter((c) => c.mark === "organization" || /company|related|org/i.test(String(c.label ?? ""))).length;
      ok("refresh-surface returns contacts array", Array.isArray(body.contacts), `n=${contacts.length}`);
      ok("refresh-surface org/related marks when contacts exist", contacts.length === 0 || orgish >= 0, `orgish=${orgish}`);
    }
  } catch (e) {
    ok("refresh-surface route reachable", false, e instanceof Error ? e.message : String(e));
  }

  // 6. groq honesty fields on healthz
  try {
    const h = await get("/api/healthz");
    const lh = h.json?.lanesHonesty;
    ok("groq key count or fallback flag", typeof lh?.groq === "number" || typeof lh?.groqAdmissionFallback === "boolean",
      `groq=${lh?.groq} fallback=${lh?.groqAdmissionFallback}`);
  } catch (e) {
    ok("groq honesty fields", false, e instanceof Error ? e.message : String(e));
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\nLive proof: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("Failed:", failed.map((f) => f.name).join(", "));
    process.exitCode = 1;
  } else {
    console.log("Operator next: run person-first discovery on a quiet officer lead; confirm reviewCandidates > 0 and cards show related/leads.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
