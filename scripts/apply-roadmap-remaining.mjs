#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
function write(p, t) { fs.writeFileSync(path.join(root, p), t); }
function must(c, m) { if (!c) throw new Error(m); }

{
  let disc = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
  if (!disc.includes("onSlotProgress?:")) {
    disc = disc.replace(
      "onCandidate?: (candidate: DiscoveryCandidate, meta: { slot: number; batch: number }) => void | Promise<void>;",
      `onCandidate?: (candidate: DiscoveryCandidate, meta: { slot: number; batch: number }) => void | Promise<void>;\n  /** Fires at the start/end of each discovery slot for operator progress. */\n  onSlotProgress?: (meta: { slot: number; batch: number; phase: "start" | "end"; candidatesInSlot: number }) => void | Promise<void>;`,
    );
  }
  if (!disc.includes("await input.onSlotProgress?.({ slot: slot + 1")) {
    disc = disc.replace(
      "const slotSpan = publishDigSpan({ jobId, spanType: \"stage\", name: \"discovery_slot\", status: \"active\", agentName: \"discovery\", inputSummary: `slot=${slot + 1}/${requestedBatch} concurrent=false` });",
      "const slotSpan = publishDigSpan({ jobId, spanType: \"stage\", name: \"discovery_slot\", status: \"active\", agentName: \"discovery\", inputSummary: `slot=${slot + 1}/${requestedBatch} concurrent=false` });\n      try { await input.onSlotProgress?.({ slot: slot + 1, batch: requestedBatch, phase: \"start\", candidatesInSlot: 0 }); } catch { /* best-effort */ }",
    );
    disc = disc.replace(
      "try { completeDigSpan(jobId, slotSpan.id, { status: slotCandidates.length ? \"ok\" : \"error\", resultSummary: `slot=${slot + 1}/${requestedBatch} candidates=${slotCandidates.length} searches=${result.searches} visits=${result.visits}` }); } catch { /* best-effort */ }",
      "try { completeDigSpan(jobId, slotSpan.id, { status: slotCandidates.length ? \"ok\" : \"error\", resultSummary: `slot=${slot + 1}/${requestedBatch} candidates=${slotCandidates.length} searches=${result.searches} visits=${result.visits}` }); } catch { /* best-effort */ }\n        try { await input.onSlotProgress?.({ slot: slot + 1, batch: requestedBatch, phase: \"end\", candidatesInSlot: slotCandidates.length }); } catch { /* best-effort */ }",
    );
  }
  write("artifacts/api-server/src/src/lib/discovery-agent.ts", disc);
  console.log("OK discovery-agent slot progress");
}

{
  let orch = read("artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
  orch = orch.replace(
    "const targetLimit = Math.max(1, Math.min(50, opts.targetCount ?? 50));",
    "const targetLimit = Math.max(1, Math.min(50, opts.targetCount ?? 3));",
  );
  orch = orch.replace(
    `const status = async (message: string, progress: number, entityProgress?: number, entityTotal?: number) => {
    await ensureAtlasActive(atlasJobId);
    await updateJob(atlasJobId, {
      status: "running",
      progress,
      total: 3,
      atlasPhase: progress,
      atlasPhaseTotal: 3,
      message,
      entityProgress,
      entityTotal,
    });
  };`,
    `const status = async (message: string, progress: number, entityProgress?: number, entityTotal?: number) => {
    await ensureAtlasActive(atlasJobId);
    await updateJob(atlasJobId, {
      status: "running",
      progress,
      total: Math.max(1, targetLimit),
      atlasPhase: progress,
      atlasPhaseTotal: Math.max(1, targetLimit),
      message,
      entityProgress,
      entityTotal,
    });
  };`,
  );
  if (!orch.includes("BOSS_DIRECTION_WRITTEN")) {
    orch = orch.replace(
      "if (brief?.raw) {\n        await appendJobLog(atlasJobId, `BOSS_DISCOVERY_DIRECTION model=${brief.model} ${String(brief.raw).slice(0, 400)}`).catch(() => {});\n      }",
      "if (brief?.raw) {\n        const bossLine = `BOSS_DISCOVERY_DIRECTION model=${brief.model} ${String(brief.raw).slice(0, 400)}`;\n        await appendJobLog(atlasJobId, bossLine, { dedupeKey: \"BOSS_DIRECTION_WRITTEN\" }).catch(() => {\n          void appendJobLog(atlasJobId, bossLine).catch(() => {});\n        });\n      }",
    );
  }
  if (!orch.includes("onSlotProgress:")) {
    orch = orch.replace(
      "onCandidate: async (candidate) => {",
      `onSlotProgress: async ({ slot, batch, phase, candidatesInSlot }) => {
      const pct = Math.min(90, Math.round((slot / Math.max(1, batch)) * 50));
      if (phase === "start") {
        await status(\`Discovery slot \${slot}/\${batch} — model hunting…\`, pct, admittedIds.length, targetLimit);
      } else {
        await status(
          \`Discovery slot \${slot}/\${batch} done (\${candidatesInSlot} candidate(s), \${admittedIds.length} admitted)…\`,
          pct,
          admittedIds.length,
          targetLimit,
        );
      }
    },
    onCandidate: async (candidate) => {`,
    );
  }
  orch = orch.replace(
    `for (const candidate of candidates) {
    await ensureAtlasActive(atlasJobId);
    const id = await createEntityFromDiscoveryCandidate(candidate, { modelSelected: true });
    if (id) admittedIds.push(id);
  }`,
    `for (const candidate of candidates) {
    await ensureAtlasActive(atlasJobId);
    const id = await createEntityFromDiscoveryCandidate(candidate, { modelSelected: true });
    if (id && !admittedIds.includes(id)) admittedIds.push(id);
  }`,
  );
  write("artifacts/api-server/src/src/lib/atlas-orchestrator.ts", orch);
  console.log("OK atlas-orchestrator");
}

{
  const jqPath = "artifacts/api-server/src/src/lib/job-queue.ts";
  let jq = read(jqPath);
  if (!jq.includes("opts?: { dedupeKey?: string }")) {
    jq = jq.replace(
      "export async function appendJobLog(jobId: string, line: string): Promise<void> {\n  const ts = `${new Date().toISOString()} ${line}`;",
      `export async function appendJobLog(jobId: string, line: string, opts?: { dedupeKey?: string }): Promise<void> {
  if (opts?.dedupeKey) {
    const ok = await safeRedis(async (rc) => {
      const key = \`apex:joblog:dedupe:\${jobId}:\${opts.dedupeKey}\`;
      const set = await rc.set(key, "1", "EX", 86400, "NX");
      return set === "OK" || set === true;
    }, true);
    if (!ok) return;
  }
  const memCheck = memoryLogs.get(jobId) ?? [];
  if (memCheck[0] && memCheck[0].includes(line.slice(0, 120))) return;
  const ts = \`\${new Date().toISOString()} \${line}\`;`,
    );
    write(jqPath, jq);
    console.log("OK job-queue");
  }
}

{
  const blPath = "artifacts/api-server/src/src/lib/bureau-live-log.ts";
  let bl = read(blPath);
  if (!bl.includes("lastBossTitleMirror")) {
    bl = bl.replace(
      "const MIRROR_MAX_PER_WINDOW = 40;",
      'const MIRROR_MAX_PER_WINDOW = 40;\nlet lastBossTitleMirror = "";',
    );
    bl = bl.replace(
      "export async function mirrorJobLogLine(jobId: string, line: string): Promise<void> {\n  const structured = tryParseBureauLogLine(line);\n  if (structured) {\n    await publishBureauEvent({ ...structured, jobId: structured.jobId ?? jobId });\n    return;\n  }",
      `export async function mirrorJobLogLine(jobId: string, line: string): Promise<void> {
  if (/BOSS_DISCOVERY_DIRECTION/i.test(line)) {
    const sig = line.slice(0, 160);
    if (sig === lastBossTitleMirror) return;
    lastBossTitleMirror = sig;
  }
  const structured = tryParseBureauLogLine(line);
  if (structured) {
    if (structured.actor === "boss" && structured.title && structured.title === lastBossTitleMirror) return;
    if (structured.actor === "boss") lastBossTitleMirror = structured.title || lastBossTitleMirror;
    await publishBureauEvent({ ...structured, jobId: structured.jobId ?? jobId });
    return;
  }`,
    );
    write(blPath, bl);
    console.log("OK bureau-live-log");
  }
}

{
  const routePath = "artifacts/api-server/src/src/routes/atlas.ts";
  let route = read(routePath);
  if (!route.includes("/* roadmap: discoveryFirst default targetCount 3 */")) {
    route = route.replace(
      "targetCount:        Number(body.targetCount)       || C.targetCount,",
      `/* roadmap: discoveryFirst default targetCount 3 */
    targetCount:        Number(body.targetCount)
      || (Boolean(body.discoveryFirst !== undefined ? body.discoveryFirst : C.discoveryFirst) ? 3 : C.targetCount),`,
    );
    write(routePath, route);
    console.log("OK atlas route");
  }
}

console.log("ROADMAP_REMAINING_APPLIED");
