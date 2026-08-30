import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/discovery-agent.ts";
let s = fs.readFileSync(path, "utf8");

if (s.includes("const batchTasks = Array.from({ length: requestedBatch }, (_, slot) =>")) {
  console.log("[apex-discovery-batch-v2] already applied");
  process.exit(0);
}

const start = s.indexOf("    for (let slot = 0; slot < requestedBatch; slot++) {");
const end = s.indexOf("    const finalCandidates = candidates.slice(0, requestedBatch);", start);
if (start < 0 || end < 0) throw new Error("discovery sequential batch loop anchors not found");

const replacement = `    // Real batch execution: all discovery slots in a batch are model-driven and
    // run concurrently. The batch controller only merges duplicate names afterward;
    // it never feeds one slot's query path into another slot.
    const batchTasks = Array.from({ length: requestedBatch }, (_, slot) => (async () => {
      const objective = [
        baseObjective,
        "This slot runs concurrently with the other discovery slots. Choose your own distinct person; duplicate candidates will be discarded after the batch.",
        \`This is batch slot \${slot + 1} of \${requestedBatch}. One strong, distinct candidate is sufficient. Do not pad with weak names.\`,
      ].join("\\n");
      const slotSpan = publishDigSpan({ jobId, spanType: "stage", name: "discovery_slot", status: "active", agentName: "discovery", inputSummary: \`slot=\${slot + 1}/\${requestedBatch} concurrent=true\` });
      try {
        const result = await runAgenticWebResearch({
          targetName: \`Discovery — choose a realistically reachable principal (slot \${slot + 1}/\${requestedBatch})\`,
          companyName: null,
          objective,
          maxIterations: maxIterationsPerSlot,
          hardTimeoutMs: slotTimeout,
          jobId,
          onLiveStep: (step) => {
            try {
              spanFromLiveStep({ jobId, targetName: "discovery", tool: step.tool || step.action, label: step.query || step.url || step.action, detail: step.detail || step.query || step.url, status: step.status === "error" ? "error" : step.status === "active" ? "active" : "ok", agentName: "discovery" });
            } catch { /* spans best-effort */ }
            input.onLiveStep?.(step);
          },
        });
        const slotCandidates = parsePersonFindings(result.findings ?? []);
        try { completeDigSpan(slotSpan.id, { status: slotCandidates.length ? "ok" : "error", resultSummary: \`slot=\${slot + 1}/\${requestedBatch} candidates=\${slotCandidates.length} searches=\${result.searches} visits=\${result.visits}\` }); } catch { /* best-effort */ }
        return { result, slotCandidates };
      } catch (err) {
        try { completeDigSpan(slotSpan.id, { status: "error", resultSummary: String(err).slice(0, 200) }); } catch { /* best-effort */ }
        return { result: null, slotCandidates: [] as DiscoveryCandidate[] };
      }
    })());

    const batchResults = await Promise.all(batchTasks);
    for (const { result, slotCandidates } of batchResults) {
      if (!result) {
        degraded = true;
        continue;
      }
      totalSearches += result.searches ?? 0;
      totalVisits += result.visits ?? 0;
      lastModel = result.model || lastModel;
      lastMessage = result.error || result.status || "completed";
      batchHistory.push(...(result.trajectory ?? []).slice(-8));
      if (result.status === "unavailable" || result.status === "error") degraded = true;
      for (const candidate of slotCandidates) {
        const key = candidate.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
        if (candidates.length >= requestedBatch) break;
      }
      if (candidates.length >= requestedBatch) break;
    }

`;

s = s.slice(0, start) + replacement + s.slice(end);
s = s.replace(
  /const aggregateTimeout = Math\.max\(slotTimeout \* requestedBatch, 600_000\);/,
  "const aggregateTimeout = Math.max(slotTimeout + 120_000, 600_000);",
);

fs.writeFileSync(path, s);
console.log("[apex-discovery-batch-v2] applied concurrent batch execution");
