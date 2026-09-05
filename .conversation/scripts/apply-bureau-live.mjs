#!/usr/bin/env node
/**
 * Idempotent: wire Bureau live log + discovery intake into Apex Atlas (Replit).
 * Must stay valid under `node --check` — no broken template escapes.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiLib = path.join(root, "artifacts/api-server/src/src/lib");
const apiRoutes = path.join(root, "artifacts/api-server/src/src/routes");
const reactorPath = path.join(root, "artifacts/apex-finder/src/pages/reactor.tsx");
const atlasPath = path.join(apiLib, "atlas-orchestrator.ts");
const routesIndex = path.join(apiRoutes, "index.ts");
const jobQueue = path.join(apiLib, "job-queue.ts");

function patchRoutesIndex() {
  if (!fs.existsSync(routesIndex)) return;
  let src = fs.readFileSync(routesIndex, "utf8");
  if (src.includes("bureau-stream")) {
    console.log("routes: bureau-stream already registered");
    return;
  }
  if (!src.includes("import atlasRouter")) return;
  src = src.replace(
    'import atlasRouter from "./atlas";',
    'import atlasRouter from "./atlas";\nimport bureauStreamRouter from "./bureau-stream";',
  );
  src = src.replace(
    "router.use(atlasRouter);",
    "router.use(atlasRouter);\nrouter.use(bureauStreamRouter);",
  );
  fs.writeFileSync(routesIndex, src);
  console.log("routes: registered bureau-stream");
}

function patchJobQueue() {
  if (!fs.existsSync(jobQueue)) return;
  let src = fs.readFileSync(jobQueue, "utf8");
  if (src.includes("mirrorJobLogToBureau") || src.includes("publishBureauEvent")) {
    console.log("job-queue: bureau mirror already present");
    return;
  }
  const endMarker = "await rc.expire(lk(jobId), JOB_TTL);\n  }, undefined);\n}";
  if (!src.includes(endMarker)) {
    console.warn("job-queue: appendJobLog end not matched");
    return;
  }
  const mirrorFn = [
    "async function mirrorJobLogToBureau(jobId: string, line: string): Promise<void> {",
    "  try {",
    '    const { publishBureauEvent, tryParseBureauLogLine } = await import("./bureau-live-log");',
    "    const structured = tryParseBureauLogLine(line);",
    "    if (structured) {",
    "      await publishBureauEvent({ ...structured, jobId: structured.jobId ?? jobId });",
    "      return;",
    "    }",
    "    const lower = line.toLowerCase();",
    '    let actor: "boss" | "right_hand" | "web" | "tool" | "system" | "registry" | "discovery" = "system";',
    '    if (lower.includes("gemini") || lower.includes("boss")) actor = "boss";',
    '    else if (lower.includes("nvidia") || lower.includes("right-hand") || lower.includes("right hand")) actor = "right_hand";',
    '    else if (lower.includes("tavily") || lower.includes("perplexity") || lower.includes("exa") || lower.includes("web search")) actor = "web";',
    '    else if (lower.includes("maigret") || lower.includes("holehe") || lower.includes("sherlock")) actor = "tool";',
    '    else if (lower.includes("registry") || lower.includes("edgar") || lower.includes("companies house")) actor = "registry";',
    '    else if (lower.includes("discovery") || lower.includes("broad")) actor = "discovery";',
    "    await publishBureauEvent({ actor, title: line.slice(0, 240), jobId, detail: line.length > 240 ? line.slice(0, 500) : undefined });",
    "  } catch { /* non-fatal */ }",
    "}",
    "",
  ].join("\n");
  src = src.replace(
    endMarker,
    "await rc.expire(lk(jobId), JOB_TTL);\n  }, undefined);\n  void mirrorJobLogToBureau(jobId, line).catch(() => undefined);\n}\n\n" + mirrorFn,
  );
  fs.writeFileSync(jobQueue, src);
  console.log("job-queue: bureau mirror on appendJobLog");
}

function patchAtlasDiscovery() {
  if (!fs.existsSync(atlasPath)) return;
  let src = fs.readFileSync(atlasPath, "utf8");
  let changed = false;
  if (!src.includes('from "./discovery-intake"') && !src.includes("discovery-source-mixer") && !src.includes("buildSourcesToRun")) {
    const a = 'from "./logger";';
    if (src.includes(a)) {
      src = src.replace(a, a + '\nimport { buildSourcesToRun } from "./discovery-intake";');
      changed = true;
      console.log("atlas: import discovery-intake");
    }
  }
  if (src.includes("buildSourcesToRun(")) {
    console.log("atlas: discovery mix already wired");
  } else if (src.includes("selectedBroadCategories") && src.includes(".slice(0, Math.max(1, opts.broadCategories))")) {
    src = src.replace(
      /const includeFaa = !\(opts\.skipFaa \?\? true\);[\s\S]*?const sourcesToRun = selectedBroadCategories[\s\S]*?: DISCOVERY_SOURCES;/,
      [
        "const includeFaa = !(opts.skipFaa ?? true);",
        "  const sourcesToRun = typeof buildSourcesToRun === \"function\"",
        "    ? buildSourcesToRun({",
        "        sources: DISCOVERY_SOURCES as any,",
        "        discoveryFirst: opts.discoveryFirst,",
        "        broadCategories: opts.discoveryFirst ? (opts.broadCategories ?? 3) : null,",
        "        includeFaa,",
        "      })",
        "    : DISCOVERY_SOURCES;",
      ].join("\n"),
    );
    changed = true;
    console.log("atlas: sourcesToRun via buildSourcesToRun");
  } else {
    console.warn("atlas: discovery block not found");
  }
  if (changed) fs.writeFileSync(atlasPath, src);
}

function patchReactor() {
  if (!fs.existsSync(reactorPath)) return;
  let src = fs.readFileSync(reactorPath, "utf8");
  if (src.includes("BureauLiveFeed") || src.includes("bureau-stream") || src.includes("Bureau LIVE")) {
    console.log("reactor: Bureau live UI already present");
    return;
  }
  const marker = "<AtlasTelemetryInspector telemetry={atlasState?.atlasTelemetry} eventLog={atlasState?.eventLog} />";
  if (!src.includes(marker)) {
    console.warn("reactor: telemetry marker not found — skip inject (main may already use a different layout)");
    return;
  }
  // Minimal no-op inject marker only if legacy layout still present
  src = src.replace(
    marker,
    marker + "\n        {/* Bureau LIVE: prefer mainline reactor SSE panel when present */}",
  );
  fs.writeFileSync(reactorPath, src);
  console.log("reactor: legacy layout noted (full BureauLiveFeed ships on main)");
}

patchRoutesIndex();
patchJobQueue();
patchAtlasDiscovery();
patchReactor();
console.log("DONE apply-bureau-live");
