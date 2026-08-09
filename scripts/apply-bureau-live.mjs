#!/usr/bin/env node
/**
 * Idempotent: wire Bureau live log + discovery intake into Apex Atlas (Replit).
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
  if (!src.includes('import atlasRouter')) return;
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
  if (src.includes("publishBureauEvent")) {
    console.log("job-queue: bureau dual-write already present");
    return;
  }
  if (!src.includes("export async function appendJobLog")) return;
  const old = `export async function appendJobLog(jobId: string, line: string): Promise<void> {
  const ts = \\`\${new Date().toISOString()} \${line}\\`;
  await safeRedis(async rc => {
    await rc.lpush(lk(jobId), ts);
    await rc.ltrim(lk(jobId), 0, LOG_CAP - 1);
    await rc.expire(lk(jobId), JOB_TTL);
  }, undefined);
}`;
  // Fixed below without broken escapes
}

// Simpler job-queue patch: insert after appendJobLog function closing
function patchJobQueue2() {
  if (!fs.existsSync(jobQueue)) return;
  let src = fs.readFileSync(jobQueue, "utf8");
  if (src.includes("mirrorJobLogToBureau")) {
    console.log("job-queue: mirror already present");
    return;
  }
  const anchor = "export async function getJob(jobId: string)";
  if (!src.includes(anchor)) {
    console.warn("job-queue: getJob anchor missing");
    return;
  }
  if (!src.includes("void mirrorJobLogToBureau") && src.includes("await rc.expire(lk(jobId), JOB_TTL);\n  }, undefined);\n}")) {
    src = src.replace(
      "await rc.expire(lk(jobId), JOB_TTL);\n  }, undefined);\n}",
      "await rc.expire(lk(jobId), JOB_TTL);\n  }, undefined);\n  void mirrorJobLogToBureau(jobId, line).catch(() => undefined);\n}\n\nasync function mirrorJobLogToBureau(jobId: string, line: string): Promise<void> {\n  try {\n    const { publishBureauEvent, tryParseBureauLogLine } = await import(\"./bureau-live-log\");\n    const structured = tryParseBureauLogLine(line);\n    if (structured) {\n      await publishBureauEvent({ ...structured, jobId: structured.jobId ?? jobId });\n      return;\n    }\n    const lower = line.toLowerCase();\n    let actor: \"boss\" | \"right_hand\" | \"web\" | \"tool\" | \"system\" | \"registry\" | \"discovery\" = \"system\";\n    if (lower.includes(\"gemini\") || lower.includes(\"boss\")) actor = \"boss\";\n    else if (lower.includes(\"nvidia\") || lower.includes(\"right-hand\") || lower.includes(\"right hand\")) actor = \"right_hand\";\n    else if (lower.includes(\"tavily\") || lower.includes(\"perplexity\") || lower.includes(\"exa\") || lower.includes(\"web search\")) actor = \"web\";\n    else if (lower.includes(\"maigret\") || lower.includes(\"holehe\") || lower.includes(\"sherlock\")) actor = \"tool\";\n    else if (lower.includes(\"registry\") || lower.includes(\"edgar\") || lower.includes(\"companies house\")) actor = \"registry\";\n    else if (lower.includes(\"discovery\") || lower.includes(\"broad\")) actor = \"discovery\";\n    await publishBureauEvent({ actor, title: line.slice(0, 240), jobId, detail: line.length > 240 ? line.slice(0, 500) : undefined });\n  } catch { /* non-fatal */ }\n}\n",
    );
    fs.writeFileSync(jobQueue, src);
    console.log("job-queue: bureau mirror on appendJobLog");
  } else {
    console.warn("job-queue: appendJobLog end not matched");
  }
}

function patchAtlasDiscovery() {
  if (!fs.existsSync(atlasPath)) return;
  let src = fs.readFileSync(atlasPath, "utf8");
  let changed = false;
  if (!src.includes('from \"./discovery-intake\"') && !src.includes("discovery-source-mixer") && !src.includes("buildSourcesToRun")) {
    const a = 'from \"./logger\";';
    if (src.includes(a)) {
      src = src.replace(a, a + '\nimport { buildSourcesToRun } from \"./discovery-intake\";');
      changed = true;
      console.log("atlas: import discovery-intake");
    }
  }
  if (src.includes("selectedBroadCategories") && src.includes(".slice(0, Math.max(1, opts.broadCategories))") && !src.includes("buildSourcesToRun({")) {
    src = src.replace(
      /const includeFaa = !\(opts\.skipFaa \?\? true\);[\s\S]*?const sourcesToRun = selectedBroadCategories[\s\S]*?: DISCOVERY_SOURCES;/,
      `const includeFaa = !(opts.skipFaa ?? true);\n  const sourcesToRun = typeof buildSourcesToRun === \"function\"\n    ? buildSourcesToRun({\n        sources: DISCOVERY_SOURCES as any,\n        discoveryFirst: opts.discoveryFirst,\n        broadCategories: opts.discoveryFirst ? (opts.broadCategories ?? 3) : null,\n        includeFaa,\n      })\n    : DISCOVERY_SOURCES;`,
    );
    changed = true;
    console.log("atlas: sourcesToRun via buildSourcesToRun");
  } else if (src.includes("buildSourcesToRun(")) {
    console.log("atlas: discovery mix already wired");
  } else {
    console.warn("atlas: discovery block not found");
  }
  if (changed) fs.writeFileSync(atlasPath, src);
}

function patchReactor() {
  if (!fs.existsSync(reactorPath)) return;
  let src = fs.readFileSync(reactorPath, "utf8");
  if (src.includes("BureauLiveFeed")) {
    console.log("reactor: BureauLiveFeed already present");
    return;
  }
  const marker = "<AtlasTelemetryInspector telemetry={atlasState?.atlasTelemetry} eventLog={atlasState?.eventLog} />";
  if (!src.includes(marker)) {
    console.warn("reactor: telemetry marker not found");
    return;
  }
  src = src.replace(marker, marker + "\n        <BureauLiveFeed />");
  const insertAt = src.indexOf("function MobileReactor");
  if (insertAt < 0) {
    console.warn("reactor: MobileReactor not found");
    return;
  }
  const component = `\nfunction BureauLiveFeed() {\n  const [events, setEvents] = useState<Array<any>>([]);\n  const [live, setLive] = useState(false);\n  const [filter, setFilter] = useState("all");\n  useEffect(() => {\n    let es: EventSource | null = null;\n    let pollId: ReturnType<typeof setInterval> | null = null;\n    let cancelled = false;\n    const applyList = (list: any[]) => { if (!cancelled) setEvents(list.slice(0, 100)); };\n    const poll = () => {\n      fetch(\\`\${BASE}/api/ingest/bureau-events?limit=80\\`, { cache: "no-store" })\n        .then((r) => (r.ok ? r.json() : null))\n        .then((data) => { if (data?.events) applyList(data.events); })\n        .catch(() => undefined);\n    };\n    poll();\n    pollId = setInterval(poll, 4000);\n    try {\n      es = new EventSource(\\`\${BASE}/api/ingest/bureau-stream\\`);\n      es.addEventListener("open", () => setLive(true));\n      es.addEventListener("error", () => setLive(false));\n      es.addEventListener("snapshot", (ev) => {\n        try { const data = JSON.parse((ev as MessageEvent).data); if (Array.isArray(data.events)) applyList(data.events); setLive(true); } catch {}\n      });\n      es.addEventListener("bureau", (ev) => {\n        try { const event = JSON.parse((ev as MessageEvent).data); setEvents((prev) => [event, ...prev.filter((e: any) => e.id !== event.id)].slice(0, 100)); setLive(true); } catch {}\n      });\n      es.addEventListener("heartbeat", () => setLive(true));\n    } catch { setLive(false); }\n    return () => { cancelled = true; if (pollId) clearInterval(pollId); es?.close(); };\n  }, []);\n  const filtered = filter === "all" ? events : events.filter((e: any) => (e.actor ?? "system") === filter);\n  const actorColor: Record<string, string> = { boss: "#c4b5fd", right_hand: "#2dd4bf", web: "#7dd3fc", tool: "#fbbf24", system: "#94a3b8", registry: "#86efac", discovery: "#f9a8d4" };\n  return (\n    <div style={{ marginTop: 10, border: "1px solid rgba(45,212,191,0.25)", borderRadius: 8, background: "rgba(8,14,18,0.92)", padding: "8px 10px", maxHeight: 280, overflow: "auto", fontSize: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>\n      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>\n        <span style={{ color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.04em" }}>BUREAU LIVE</span>\n        <span style={{ color: live ? "#34d399" : "#64748b" }}>{live ? "● stream" : "○ poll"}</span>\n        {["all", "boss", "right_hand", "web", "tool", "system"].map((f) => (\n          <button key={f} type="button" onClick={() => setFilter(f)} style={{ border: filter === f ? "1px solid #2dd4bf" : "1px solid #334155", background: filter === f ? "rgba(45,212,191,0.12)" : "transparent", color: "#cbd5e1", borderRadius: 4, padding: "1px 6px", fontSize: 9, cursor: "pointer" }}>{f}</button>\n        ))}\n      </div>\n      {filtered.length === 0 && <div style={{ color: "#64748b" }}>No Bureau events yet — run Atlas or a case investigation.</div>}\n      {filtered.map((e: any, i: number) => {\n        const t = e.timestamp ? new Date(e.timestamp) : null;\n        const hh = t && Number.isFinite(t.getTime()) ? t.toLocaleTimeString(undefined, { hour12: false }) + "." + String(t.getMilliseconds()).padStart(3, "0").slice(0, 1) : "—";\n        return (\n          <div key={e.id ?? i} style={{ borderLeft: \\`2px solid \${actorColor[e.actor ?? "system"] ?? "#64748b\"}\\`, padding: "4px 0 4px 8px", marginBottom: 4 }}>\n            <div style={{ color: "#94a3b8" }}><span style={{ color: actorColor[e.actor ?? "system"] }}>{(e.actor ?? "system").toUpperCase()}</span>{" · "}{hh}{e.provider ? \\` · \${e.provider}\\` : ""}{e.targetName ? \\` · \${e.targetName}\\` : ""}</div>\n            <div style={{ color: "#e2e8f0" }}>{e.title}</div>\n            {e.ask && <div style={{ color: "#7dd3fc" }}>ASK {e.ask}</div>}\n            {e.responseSummary && <div style={{ color: "#a7f3d0" }}>RESPONSE {e.responseSummary}</div>}\n            {e.detail && !e.ask && <div style={{ color: "#94a3b8" }}>{e.detail}</div>}\n          </div>\n        );\n      })}\n    </div>\n  );\n}\n\n`;
  src = src.slice(0, insertAt) + component + src.slice(insertAt);
  fs.writeFileSync(reactorPath, src);
  console.log("reactor: BureauLiveFeed injected");
}

patchRoutesIndex();
patchJobQueue2();
patchAtlasDiscovery();
patchReactor();
console.log("DONE apply-bureau-live");
