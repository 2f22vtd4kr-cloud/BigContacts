#!/usr/bin/env node
/**
 * Batch holdout: run N discovery cases sequentially vs Grok baselines.
 * Input: HOLDOUT_TARGETS_JSON env (array of {name, geo, expectDomain, diff})
 * or default first-batch list.
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync, openSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.env.APEX_ROOT || process.cwd();
const API = process.env.APEX_API || "http://127.0.0.1:8080";
const OUT_DIR = process.env.TEST_OUT_DIR || "/tmp/apex-holdout-batch";
const pollMax = Number(process.env.OVERNIGHT_POLL_MAX || 48);
const pollSleep = Number(process.env.OVERNIGHT_POLL_SLEEP_S || 10);

const DEFAULT_BATCH = [
  { id: "h01", name: "Custom Machine Inc", geo: "Tiffin OH", expectDomain: "cmi79.com", diff: "easy", emailHint: "sales@cmi79.com" },
  { id: "h02", name: "Modern Machine and Tool Inc", geo: "Van Buren IN", expectDomain: "modernmachinevb.com", diff: "easy", emailHint: "cncparts@modernmachinevb.com" },
  { id: "h03", name: "Dearborn Inc", geo: "Berea OH", expectDomain: "dearborninc.com", diff: "easy", emailHint: "sales@dearborninc.com" },
  { id: "h08", name: "Bandit Industries", geo: "Remus MI", expectDomain: "banditchippers.com", diff: "medium", emailHint: "sales@banditchippers.com" },
  { id: "h18", name: "Rayco Manufacturing", geo: "Wooster OH", expectDomain: "raycomfg.com", diff: "hard", emailHint: "frank.renick@raycomfg.com" },
];

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function ensureApi() {
  try {
    const r = execSync(`curl -s -m 3 -o /dev/null -w "%{http_code}" ${API}/`, { encoding: "utf8" });
    if (r.trim() && r.trim() !== "000") return true;
  } catch { /* */ }
  try { sh("pkill -f 'dist/index.mjs' || true"); } catch { /* */ }
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://apex:apex_local_dev@127.0.0.1:5432/apex",
    REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    PORT: "8080",
    ENABLE_AUTO_PIPELINE: "false",
    NODE_ENV: "development",
    BROWSER_FETCH_MAX_PER_CASE: process.env.BROWSER_FETCH_MAX_PER_CASE || "10",
    APEX_SKIP_SEMANTIC: "1",
  };
  const outFd = openSync("/tmp/api.log", "a");
  const child = spawn("node", ["--enable-source-maps", "--max-old-space-size=768", "./dist/index.mjs"], {
    cwd: join(ROOT, "artifacts/api-server"),
    env,
    detached: true,
    stdio: ["ignore", outFd, outFd],
  });
  child.unref();
  for (let i = 0; i < 50; i++) {
    try {
      execSync("sleep 1");
      const r = execSync(`curl -s -m 2 -o /dev/null -w "%{http_code}" ${API}/`, { encoding: "utf8" });
      if (r.trim() && r.trim() !== "000") return true;
    } catch { /* */ }
  }
  return false;
}

function runOne(target) {
  const objective =
    `${target.name}${target.geo ? `, ${target.geo}` : ""} — recover public contact surface: org email, phone, mailing address, website, related officers/principals. Fail-closed; every contact needs sourceUrls. Prefer company contact pages and Facebook About.`;
  const expectDomain = target.expectDomain || "example.com";
  const result = {
    id: target.id,
    ts: new Date().toISOString(),
    name: target.name,
    geo: target.geo,
    diff: target.diff,
    expectDomain,
    emailHint: target.emailHint || null,
    objective,
  };

  try {
    const motivation = `Holdout batch ${target.id} vs Grok (${target.emailHint || expectDomain})`;
    const geography = "United States";
    // Match run-single-discovery-test.mjs: double-JSON encode body for curl -d
    const create = execSync(
      `curl -s -X POST ${API}/api/research/bureau/cases -H 'Content-Type: application/json' -d ${JSON.stringify(
        JSON.stringify({ objective, motivation, geography }),
      )}`,
      { encoding: "utf8", maxBuffer: 10_000_000 },
    );
    let caseId;
    try {
      caseId = JSON.parse(create).id;
    } catch {
      result.error = "create_failed";
      result.rawCreate = create.slice(0, 500);
      return result;
    }
    result.caseId = caseId;
    if (!caseId) {
      result.error = "no_case_id";
      result.rawCreate = create.slice(0, 500);
      return result;
    }

    // Must use run-discovery (not /run) — same path as working single-test
    const startRaw = execSync(
      `curl -s -X POST ${API}/api/research/bureau/cases/${caseId}/run-discovery -H 'Content-Type: application/json' -d '{}'`,
      { encoding: "utf8", maxBuffer: 5_000_000 },
    );
    let jobId = null;
    try {
      jobId = JSON.parse(startRaw).jobId;
    } catch {
      result.error = "run_failed";
      result.rawStart = startRaw.slice(0, 500);
      return result;
    }
    result.jobId = jobId;

    let lastStatus = "";
    let terminal = false;
    if (jobId) {
      for (let i = 0; i < pollMax; i++) {
        execSync(`sleep ${pollSleep}`);
        try {
          const last = execSync(`curl -s ${API}/api/ingest/job/${jobId}`, { encoding: "utf8" });
          const j = JSON.parse(last);
          lastStatus = String(j.status || "");
          if (lastStatus === "done" || lastStatus === "completed" || lastStatus === "failed") {
            terminal = true;
            break;
          }
        } catch { /* */ }
      }
    }
    result.jobStatus = lastStatus;
    result.terminal = terminal;

    execSync("sleep 2");
    const caseRaw = execSync(`curl -s ${API}/api/research/bureau/cases/${caseId}`, {
      encoding: "utf8",
      maxBuffer: 20_000_000,
    });
    writeFileSync(join(OUT_DIR, `${target.id}-case.json`), caseRaw);

    let score = null;
    try {
      const scoreOut = execSync(`node ${join(ROOT, "scripts/score-discovery-case.mjs")} ${join(OUT_DIR, `${target.id}-case.json`)}`, {
        encoding: "utf8",
      });
      score = JSON.parse(scoreOut);
    } catch (e) {
      const stdout = e && e.stdout ? String(e.stdout) : "";
      if (stdout.trim()) {
        try { score = JSON.parse(stdout); } catch { result.scoreError = String(e?.message || e).slice(0, 200); }
      }
    }
    result.score = score;

    let hasExpectedEmail = false;
    let emails = [];
    try {
      const parsed = JSON.parse(caseRaw);
      const file = parsed.caseFile;
      const cf = typeof file === "string" ? JSON.parse(file) : file || {};
      const ev = (cf.discoveredCandidates || []).flatMap((c) => c.contactEvidence || []);
      emails = ev
        .filter((e) => e.vectorType === "email")
        .map((e) => ({ value: e.value, sourceUrls: e.sourceUrls || [], note: e.note }));
      const needle = `@${expectDomain.toLowerCase()}`;
      hasExpectedEmail = emails.some((e) => String(e.value || "").toLowerCase().includes(needle));
      if (target.emailHint) {
        hasExpectedEmail = hasExpectedEmail || emails.some((e) => String(e.value || "").toLowerCase() === target.emailHint.toLowerCase());
      }
    } catch (e) {
      result.parseError = String(e?.message || e).slice(0, 200);
    }
    result.hasExpectedEmail = hasExpectedEmail;
    result.emails = emails.slice(0, 10);
    result.vsGrok = {
      emailHint: target.emailHint,
      recoveredExpectedEmail: hasExpectedEmail,
      score: score?.score ?? null,
      vectors: score?.vectors ?? null,
    };
  } catch (err) {
    result.error = String(err?.message || err).slice(0, 400);
  }
  return result;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let targets = DEFAULT_BATCH;
  if (process.env.HOLDOUT_TARGETS_JSON) {
    try { targets = JSON.parse(process.env.HOLDOUT_TARGETS_JSON); } catch { /* keep default */ }
  }
  const tip = (() => { try { return sh("git log --oneline -1").trim(); } catch { return ""; } })();
  const summary = { ts: new Date().toISOString(), tip, results: [] };

  if (!ensureApi()) {
    summary.error = "api_not_up";
    writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  for (const t of targets) {
    console.error(`[holdout] starting ${t.id} ${t.name}...`);
    const r = runOne(t);
    summary.results.push(r);
    writeFileSync(join(OUT_DIR, `${t.id}-result.json`), JSON.stringify(r, null, 2));
    console.error(`[holdout] ${t.id} score=${r.score?.score} email=${r.hasExpectedEmail} status=${r.jobStatus}`);
  }

  const scores = summary.results.map((r) => r.score?.score).filter((n) => typeof n === "number");
  summary.metric = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  summary.emailHits = summary.results.filter((r) => r.hasExpectedEmail).length;
  summary.total = summary.results.length;

  writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main();
