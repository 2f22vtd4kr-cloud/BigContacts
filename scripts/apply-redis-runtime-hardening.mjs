#!/usr/bin/env node
/**
 * Reconcile the Redis hot-path hardening that must be present in every
 * Replit checkout, including fresh accounts whose local edits cannot commit.
 *
 * This is intentionally fail-closed and idempotent. It only edits the three
 * runtime files implicated by the Redis command amplification incident:
 *   - job-queue.ts
 *   - atlas.ts
 *   - bureau-live-log.ts
 *
 * No research/provider logic is changed here.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = {
  job: path.join(root, "artifacts/api-server/src/src/lib/job-queue.ts"),
  atlas: path.join(root, "artifacts/api-server/src/src/routes/atlas.ts"),
  bureau: path.join(root, "artifacts/api-server/src/src/lib/bureau-live-log.ts"),
};

for (const [name, file] of Object.entries(targets)) {
  if (!fs.existsSync(file)) {
    console.error(`[redis-hardening] missing ${name}: ${file}`);
    process.exit(1);
  }
}

let changed = false;

function replaceExact(file, oldText, newText, label) {
  const before = fs.readFileSync(file, "utf8");
  if (before.includes(newText)) return;
  if (!before.includes(oldText)) {
    console.error(`[redis-hardening] expected context not found: ${label}`);
    process.exit(1);
  }
  const after = before.replace(oldText, newText);
  if (after === before) {
    console.error(`[redis-hardening] replacement made no change: ${label}`);
    process.exit(1);
  }
  fs.writeFileSync(file, after);
  changed = true;
  console.log(`[redis-hardening] applied: ${label}`);
}

replaceExact(
  targets.job,
  `  await safeRedis(async rc => {\n    await rc.hset(jk(jobId), flat);\n    await rc.expire(jk(jobId), JOB_TTL);\n  }, undefined);`,
  `  // Progress updates are frequent; createJob owns the initial TTL.\n  // Refreshing EXPIRE on every update doubles Redis traffic on the hottest path.\n  await safeRedis(async rc => {\n    await rc.hset(jk(jobId), flat);\n  }, undefined);`,
  "job-queue updateJob: remove per-update EXPIRE",
);

replaceExact(
  targets.job,
  `  const wrote = await safeRedis(async rc => {\n    await rc.set(\`apex:activejob:\${type}\`, jobId, "EX", JOB_TTL);\n    return (await rc.get(\`apex:activejob:\${type}\`)) === jobId;\n  }, false);\n  if (!wrote) {\n    console.warn(\`[job-queue] setActiveJob Redis write failed — using in-process lock for \${type}=\${jobId}\`);\n  }`,
  `  // The in-process cache is the immediate verification surface. Do not issue\n  // a write followed by an immediate GET: that verification caused avoidable\n  // Upstash command amplification and did not improve correctness.\n  const wrote = await safeRedis(async rc => {\n    await rc.set(\`apex:activejob:\${type}\`, jobId, "EX", JOB_TTL);\n    return true;\n  }, false);\n  if (!wrote) {\n    console.warn(\`[job-queue] setActiveJob Redis write failed — using in-process lock for \${type}=\${jobId}\`);\n  }`,
  "job-queue setActiveJob: remove SET+GET verification",
);

replaceExact(
  targets.atlas,
  `  // Ensure Redis lock sticks — silent SET failures caused Launch to self-cancel.\n  for (let attempt = 0; attempt < 3; attempt++) {\n    await setActiveJob("atlas-run", atlasJobId);\n    const pinned = await getActiveJob("atlas-run");\n    if (pinned === atlasJobId) break;\n    logger.warn({ atlasJobId, pinned, attempt }, "atlas-run: active job pointer mismatch after setActiveJob");\n  }\n  if ((await getActiveJob("atlas-run")) !== atlasJobId) {\n    // Last resort: pin in-process only (Redis quota exhausted).\n    await setActiveJob("atlas-run", atlasJobId);\n    logger.warn({ atlasJobId }, "atlas-run: proceeding with in-process lock only (Redis unavailable)");\n  }`,
  `  // setActiveJob updates the process-local lock before attempting Redis and\n  // falls back to that lock if Redis is unavailable. Do not read it back here:\n  // Launch is already serialized by getActiveJob above and this route must not\n  // turn one launch into a multi-command Redis verification loop.\n  await setActiveJob("atlas-run", atlasJobId);`,
  "atlas-run: remove three-attempt lock verification loop",
);

replaceExact(
  targets.bureau,
  `export async function mirrorJobLogLine(jobId: string, line: string): Promise<void> {\n  if (/BOSS_DISCOVERY_DIRECTION/i.test(line)) {`,
  `export async function mirrorJobLogLine(jobId: string, line: string): Promise<void> {\n  // publishBureauEvent mirrors structured BUREAU lines back into the job log.\n  // Never mirror those lines into Bureau again or the two mirrors can recurse.\n  if (line.trimStart().startsWith("BUREAU|")) return;\n\n  if (/BOSS_DISCOVERY_DIRECTION/i.test(line)) {`,
  "bureau-live-log: block BUREAU recursion",
);

// Final fail-closed assertions. If a future source change defeats a replacement,
// the boot must stop rather than silently reintroducing the command leak.
const job = fs.readFileSync(targets.job, "utf8");
const atlas = fs.readFileSync(targets.atlas, "utf8");
const bureau = fs.readFileSync(targets.bureau, "utf8");

if (/setActiveJob[\\s\\S]{0,1200}rc\.get\(.*activejob/i.test(job)) {
  console.error("[redis-hardening] FAIL: setActiveJob still contains active-job GET verification");
  process.exit(1);
}
if (/export async function updateJob[\\s\\S]*?rc\.expire\(jk\(jobId\)/.test(job)) {
  console.error("[redis-hardening] FAIL: updateJob still refreshes job TTL");
  process.exit(1);
}
if (/for \(let attempt = 0; attempt < 3; attempt\+\+\)/.test(atlas)) {
  console.error("[redis-hardening] FAIL: atlas-run still contains the 3-attempt lock loop");
  process.exit(1);
}
if (!/line\.trimStart\(\)\.startsWith\("BUREAU\\|"\)/.test(bureau)) {
  console.error("[redis-hardening] FAIL: Bureau recursion guard is missing");
  process.exit(1);
}

console.log(`[redis-hardening] PASS${changed ? " (changes applied)" : " (already hardened)"}`);
