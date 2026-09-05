#!/usr/bin/env node
/**
 * P0 post-live-audit fixes:
 * 1) Incremental discovery admission (candidates → entities as each slot completes)
 * 2) Safer default discovery batch (3 when targetCount omitted, still capped at 10)
 * 3) Softer findings scope gate when personName + HTTPS sources present
 * 4) Explicit reject logging for parse / admit
 *
 * Does NOT script discovery or force people lists.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const discoveryPath = path.join(root, "artifacts/api-server/src/src/lib/discovery-agent.ts");
const orchPath = path.join(root, "artifacts/api-server/src/src/lib/atlas-orchestrator.ts");

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

let disc = fs.readFileSync(discoveryPath, "utf8");

if (!disc.includes("APEX_DISCOVERY_DEFAULT_BATCH")) {
  disc = disc.replace(
    /const requestedBatch = Math\.max\(\s*1,\s*Math\.min\(10, Number\.isFinite\(Number\(input\.targetCount\)\)\s*\?\s*Number\(input\.targetCount\)\s*:\s*Number\(process\.env\.APEX_DISCOVERY_BATCH_SIZE \|\| "10"\)\),\s*\);/,
    `const requestedBatch = Math.max(
    1,
    Math.min(
      10,
      Number.isFinite(Number(input.targetCount)) && Number(input.targetCount) > 0
        ? Number(input.targetCount)
        : Number(process.env.APEX_DISCOVERY_BATCH_SIZE || process.env.APEX_DISCOVERY_DEFAULT_BATCH || "3"),
    ),
  );`,
  );
}

if (!disc.includes("onCandidate?:")) {
  disc = disc.replace(
    /onLiveStep\?: \(step: \{ action: string; tool\?: string; query\?: string; url\?: string; status: "ok" \| "error" \| "active"; detail\?: string \}\) => void;\n\}\): Promise<DiscoveryAgentResult>/,
    `onLiveStep?: (step: { action: string; tool?: string; query?: string; url?: string; status: "ok" | "error" | "active"; detail?: string }) => void;
  /** Optional: called as soon as a slot produces a distinct well-formed candidate (incremental admit). */
  onCandidate?: (candidate: DiscoveryCandidate, meta: { slot: number; batch: number }) => void | Promise<void>;
}): Promise<DiscoveryAgentResult>`,
  );
}

if (!disc.includes("await input.onCandidate")) {
  disc = disc.replace(
    `if (slotCandidates.length) {
          for (const candidate of slotCandidates) {
            const key = candidate.name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push(candidate);
            if (candidates.length >= requestedBatch) break;
          }
        }`,
    `if (slotCandidates.length) {
          for (const candidate of slotCandidates) {
            const key = candidate.name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push(candidate);
            try {
              await input.onCandidate?.(candidate, { slot: slot + 1, batch: requestedBatch });
            } catch (admitErr) {
              logger.warn(
                { err: String(admitErr).slice(0, 200), name: candidate.name },
                "[discovery-agent] onCandidate failed",
              );
            }
            if (candidates.length >= requestedBatch) break;
          }
        }`,
  );
}

if (disc.includes('if (f.scope !== "candidate" && !(f.scope === "organization" && f.personName)) continue;')) {
  disc = disc.replace(
    'if (f.scope !== "candidate" && !(f.scope === "organization" && f.personName)) continue;',
    `// Prefer explicit scope=candidate; still accept personName + HTTPS sources when
    // the model omits scope (common free-ReAct omission). Reject organization-only
    // rows without a personName.
    const hasPersonName = Boolean(f.personName && String(f.personName).trim().length >= 3);
    const scopeOk =
      f.scope === "candidate" ||
      (f.scope === "organization" && hasPersonName) ||
      (hasPersonName && (f.sourceUrls?.some((u) => /^https?:\\/\\//i.test(String(u))) ?? false));
    if (!scopeOk) {
      logger.info(
        { scope: f.scope, personName: f.personName, value: String(f.value ?? "").slice(0, 80) },
        "[discovery-agent] parsePersonFindings skipped finding (scope/person gate)",
      );
      continue;
    }`,
  );
}

must(disc.includes("onCandidate"), "onCandidate not applied to discovery-agent");
fs.writeFileSync(discoveryPath, disc);
console.log("OK discovery-agent.ts");

let orch = fs.readFileSync(orchPath, "utf8");

if (!orch.includes("onCandidate: async (candidate)")) {
  const needle = `  const discovery = await runDiscoveryAgent({
    jobId: atlasJobId,
    // Discovery slots are part of the caller's lifecycle budget. A 3-target
    // smoke must not silently fan out to the environment default of 10 slots.
    targetCount: targetLimit,
    depth,
    hardTimeoutMs: depth === "fast" ? 60_000 : depth === "deep" ? 150_000 : 90_000,
    onLiveStep: (step) => {
      void appendJobLog(
        atlasJobId,
        \`DISCOVERY_MODEL_STEP \${JSON.stringify({
          action: step.action,
          tool: step.tool,
          query: step.query,
          url: step.url,
          status: step.status,
          detail: step.detail?.slice(0, 240),
        })}\`,
      ).catch(() => {});
    },
  });`;

  const replacement = `  const admittedIds: number[] = [];
  const discovery = await runDiscoveryAgent({
    jobId: atlasJobId,
    // Discovery slots are part of the caller's lifecycle budget. A 3-target
    // smoke must not silently fan out to the environment default of 10 slots.
    targetCount: targetLimit,
    depth,
    hardTimeoutMs: depth === "fast" ? 60_000 : depth === "deep" ? 150_000 : 90_000,
    onLiveStep: (step) => {
      void appendJobLog(
        atlasJobId,
        \`DISCOVERY_MODEL_STEP \${JSON.stringify({
          action: step.action,
          tool: step.tool,
          query: step.query,
          url: step.url,
          status: step.status,
          detail: step.detail?.slice(0, 240),
        })}\`,
      ).catch(() => {});
    },
    // Incremental admit: write ledger rows as soon as a slot produces a person
    // so operators see entities during a long batch and stops do not discard work.
    onCandidate: async (candidate) => {
      await ensureAtlasActive(atlasJobId);
      if (!isWellFormedPersonCandidate(candidate)) {
        logger.info({ name: candidate.name }, "[discovery-first] incremental admit skipped malformed");
        return;
      }
      const id = await createEntityFromDiscoveryCandidate(candidate, { modelSelected: true });
      if (id && !admittedIds.includes(id)) {
        admittedIds.push(id);
        await status(
          \`Admitted \${candidate.name} (\${admittedIds.length}/\${targetLimit}) — continuing discovery…\`,
          Math.min(90, Math.round((admittedIds.length / Math.max(1, targetLimit)) * 40)),
        );
        void appendJobLog(
          atlasJobId,
          \`DISCOVERY_ADMIT \${JSON.stringify({ id, name: candidate.name, sources: candidate.sourceUrls?.slice(0, 3) })}\`,
        ).catch(() => {});
      }
    },
  });`;

  must(orch.includes("const discovery = await runDiscoveryAgent({"), "orchestrator discovery call not found");
  // Use flexible replace if exact needle drifts
  if (orch.includes(needle)) {
    orch = orch.replace(needle, replacement);
  } else {
    // Fallback: insert onCandidate before closing of runDiscoveryAgent call
    const marker = "onLiveStep: (step) => {";
    const idx = orch.indexOf("const discovery = await runDiscoveryAgent({");
    must(idx > 0, "discovery call index missing");
    const endIdx = orch.indexOf("});", orch.indexOf("onLiveStep:", idx));
    must(endIdx > idx, "discovery call end missing");
    const block = orch.slice(idx, endIdx + 3);
    must(block.includes("onLiveStep"), "onLiveStep missing in block");
    must(!block.includes("onCandidate"), "already has onCandidate");
    orch = orch.slice(0, idx) + replacement + orch.slice(endIdx + 3);
  }

  const oldAdmitStart = "// Admission must remain model-output-only";
  const oldAdmitIdx = orch.indexOf(oldAdmitStart);
  if (oldAdmitIdx > 0 && orch.includes("const admittedIds: number[] = [];")) {
    // Remove the later duplicate "const admittedIds" if we already declared it
    const second = orch.indexOf("const admittedIds: number[] = [];", oldAdmitIdx);
    if (second > 0) {
      orch = orch.slice(0, second) + "// admittedIds already filled incrementally\n  " + orch.slice(second + "const admittedIds: number[] = [];".length);
    }
    orch = orch.replace(
      "summary[\"Model admission\"] = \`${admittedIds.length}/${candidates.length} candidates admitted in model order\`;",
      "summary[\"Model admission\"] = \`${admittedIds.length}/${candidates.length} candidates admitted in model order (incremental+final)\`;",
    );
  }
}

must(orch.includes("onCandidate: async"), "orchestrator onCandidate missing");
fs.writeFileSync(orchPath, orch);
console.log("OK atlas-orchestrator.ts");
console.log("P0 incremental admit applied");
