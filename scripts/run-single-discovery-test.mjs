#!/usr/bin/env node
/**
 * One-shot discovery test on a single target (holdout vs Grok Agent).
 * Waits for FULL job completion — never scores at Company-lock.
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync, openSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.env.APEX_ROOT || process.cwd();
const API = process.env.APEX_API || "http://127.0.0.1:8080";
const OUT = process.env.TEST_OUT || "/tmp/apex-single-discovery-result.json";

const objective =
  process.env.TEST_OBJECTIVE ||
  "Jamison Industries Inc, Taylor MI — recover public contact surface: org email, phone, address, website, related officers. Fail-closed; every contact needs sourceUrls.";
const motivation = process.env.TEST_MOTIVATION || "Holdout vs Grok Agent baseline (info@jamisonind.com)";
const geography = process.env.TEST_GEOGRAPHY || "United States";
const expectEmailDomain = process.env.TEST_EXPECT_EMAIL_DOMAIN || "jamisonind.com";
const pollMax = Number(process.env.OVERNIGHT_POLL_MAX || 48);
const pollSleep = Number(process.env.OVERNIGHT_POLL_SLEEP_S || 10);

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function ensureApi() {
  try {
    const r = execSync(`curl -s -m 3 -o /dev/null -w "%{http_code}" ${API}/`, { encoding: "utf8" });
    if (r.trim() && r.trim() !== "000") return true;
  } catch { /* */ }
  try {
    sh("pkill -f 'dist/index.mjs' || true");
  } catch { /* */ }
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://apex:apex_local_dev@127.0.0.1:5432/apex",
    REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    PORT: "8080",
    ENABLE_AUTO_PIPELINE: "false",
    NODE_ENV: "development",
    BROWSER_FETCH_MAX_PER_CASE: process.env.BROWSER_FETCH_MAX_PER_CASE || "8",
  };
  const outFd = openSync("/tmp/api.log", "a");
  const child = spawn("node", ["--enable-source-maps", "--max-old-space-size=640", "./dist/index.mjs"], {
    cwd: join(ROOT, "artifacts/api-server"),
    env,
    detached: true,
    stdio: ["ignore", outFd, outFd],
  });
  child.unref();
  for (let i = 0; i < 40; i++) {
    try {
      execSync("sleep 1");
      const r = execSync(`curl -s -m 2 -o /dev/null -w "%{http_code}" ${API}/`, { encoding: "utf8" });
      if (r.trim() && r.trim() !== "000") return true;
    } catch { /* */ }
  }
  return false;
}

function main() {
  const result = {
    ts: new Date().toISOString(),
    tip: "",
    objective,
    expectEmailDomain,
    grokBaseline: {
      email: "info@jamisonind.com",
      phone: "734-946-3088",
      address: "12669 Delta St, Taylor, MI 48180",
      website: "http://www.jamisonind.com/",
    },
  };
  try {
    result.tip = sh("git log --oneline -1").trim();
  } catch { /* */ }

  if (!ensureApi()) {
    result.error = "api_not_up";
    writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.error(JSON.stringify(result));
    process.exit(1);
  }

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
    result.raw = create.slice(0, 500);
    writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.error(JSON.stringify(result));
    process.exit(1);
  }
  result.caseId = caseId;

  const run = execSync(
    `curl -s -X POST ${API}/api/research/bureau/cases/${caseId}/run-discovery -H 'Content-Type: application/json' -d '{}'`,
    { encoding: "utf8" },
  );
  let jobId;
  try {
    jobId = JSON.parse(run).jobId;
  } catch {
    result.error = "run_failed";
    result.raw = run.slice(0, 500);
    writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.error(JSON.stringify(result));
    process.exit(1);
  }
  result.jobId = jobId;

  let terminal = false;
  let lastStatus = "";
  for (let i = 0; i < pollMax; i++) {
    execSync(`sleep ${pollSleep}`);
    const last = execSync(`curl -s ${API}/api/ingest/job/${jobId}`, { encoding: "utf8" });
    let j;
    try {
      j = JSON.parse(last);
    } catch {
      continue;
    }
    lastStatus = String(j.status || "");
    if (lastStatus === "completed" || lastStatus === "failed") {
      terminal = true;
      break;
    }
  }
  result.jobStatus = lastStatus;
  result.terminal = terminal;
  try {
    execSync("sleep 3");
  } catch { /* */ }

  const caseRaw = execSync(`curl -s ${API}/api/research/bureau/cases/${caseId}`, {
    encoding: "utf8",
    maxBuffer: 20_000_000,
  });
  writeFileSync("/tmp/apex-single-case.json", caseRaw);

  let score = null;
  try {
    const scoreOut = execSync(`node ${join(ROOT, "scripts/score-discovery-case.mjs")} /tmp/apex-single-case.json`, {
      encoding: "utf8",
    });
    score = JSON.parse(scoreOut);
  } catch (e) {
    const stdout = e && e.stdout ? String(e.stdout) : "";
    if (stdout.trim()) {
      try {
        score = JSON.parse(stdout);
      } catch {
        result.scoreError = String(e?.message || e).slice(0, 300);
      }
    } else {
      result.scoreError = String(e?.message || e).slice(0, 300);
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
    const needle = `@${expectEmailDomain.toLowerCase()}`;
    hasExpectedEmail = emails.some((e) => String(e.value || "").toLowerCase().includes(needle));
  } catch (e) {
    result.parseError = String(e?.message || e).slice(0, 200);
  }
  result.hasExpectedEmail = hasExpectedEmail;
  result.emails = emails;
  result.vsGrok = {
    expectedEmail: `info@${expectEmailDomain}`,
    recoveredExpectedEmail: hasExpectedEmail,
    score: score?.score ?? null,
    vectors: score?.vectors ?? null,
  };

  writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  // exit 0 always so artifacts upload; success is in JSON
  process.exit(0);
}

main();
