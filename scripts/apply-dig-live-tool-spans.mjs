#!/usr/bin/env node
import fs from "node:fs";

const patch = (file, replacements) => {
  let source = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    if (!source.includes(from)) throw new Error(`Patch anchor missing in ${file}: ${from.slice(0, 100)}`);
    if (source.includes(to)) continue;
    source = source.replace(from, to);
  }
  fs.writeFileSync(file, source);
};

patch("artifacts/api-server/src/src/lib/agentic-web-research.ts", [
  [
    'import { spanFromLiveStep } from "./dig-span";',
    'import { completeDigSpan, publishDigSpan, spanFromLiveStep } from "./dig-span";',
  ],
  [
    '    if (action.action === "web_search") {\n      searches++;',
    '    const activeToolSpan = action.action === "done"\n      ? null\n      : publishDigSpan({\n          jobId: input.jobId || "unknown",\n          targetName: name,\n          spanType: "tool",\n          name: action.action,\n          status: "active",\n          inputSummary: ("query" in action ? action.query : "url" in action ? action.url : "email" in action ? action.email : "username" in action ? action.username : "domain" in action ? action.domain : "registry" in action ? `${action.registry}:${action.query}` : action.action)?.slice(0, 400),\n          agentName: "investigator",\n        });\n\n    const retireActiveToolSpan = (status: "ok" | "error" = "ok", resultSummary?: string) => {\n      if (!activeToolSpan) return;\n      completeDigSpan(input.jobId || "unknown", activeToolSpan.id, { status, resultSummary });\n    };\n\n    if (action.action === "web_search") {\n      searches++;',
  ],
  [
    '      emitLive({\n        action: "web_search",\n        query: action.query,\n        provider: sr.provider || "unknown",\n        summary: `${sr.provider || "?"} · ${sr.urls.length} URLs · ${sr.text.slice(0, 140)}`,\n      });\n      continue;',
    '      emitLive({\n        action: "web_search",\n        query: action.query,\n        provider: sr.provider || "unknown",\n        summary: `${sr.provider || "?"} · ${sr.urls.length} URLs · ${sr.text.slice(0, 140)}`,\n      });\n      retireActiveToolSpan("ok", `${sr.provider || "?"} · ${sr.urls.length} URLs`);\n      continue;',
  ],
  [
    '      emitLive({\n        action: "visit",\n        url: action.url,\n        provider: "page-fetch",\n        summary: extracted.length\n          ? `page read · ${extracted.length} contact fact(s) extracted`\n          : "page read · no contact facts auto-extracted",\n      });\n      continue;',
    '      emitLive({\n        action: "visit",\n        url: action.url,\n        provider: "page-fetch",\n        summary: extracted.length\n          ? `page read · ${extracted.length} contact fact(s) extracted`\n          : "page read · no contact facts auto-extracted",\n      });\n      retireActiveToolSpan("ok", extracted.length ? `page read · ${extracted.length} contact fact(s)` : "page read");\n      continue;',
  ],
  [
    '      emitLive({\n        action: "domain_lookup",\n        query: action.domain,\n        provider: "rdap",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      continue;',
    '      emitLive({\n        action: "domain_lookup",\n        query: action.domain,\n        provider: "rdap",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      retireActiveToolSpan("ok", (lastObservation || "").slice(0, 180));\n      continue;',
  ],
  [
    '      emitLive({\n        action: "registry_search",\n        query: action.query,\n        provider: action.registry || "registry",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      continue;',
    '      emitLive({\n        action: "registry_search",\n        query: action.query,\n        provider: action.registry || "registry",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      retireActiveToolSpan("ok", (lastObservation || "").slice(0, 180));\n      continue;',
  ],
  [
    '      emitLive({\n        action: "harvest_domain",\n        query: action.domain,\n        provider: "theharvester",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      continue;',
    '      emitLive({\n        action: "harvest_domain",\n        query: action.domain,\n        provider: "theharvester",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      retireActiveToolSpan("ok", (lastObservation || "").slice(0, 180));\n      continue;',
  ],
  [
    '      emitLive({\n        action: "browser_fetch",\n        url: action.url,\n        provider: "scrapfly",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      continue;',
    '      emitLive({\n        action: "browser_fetch",\n        url: action.url,\n        provider: "scrapfly",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      retireActiveToolSpan("ok", (lastObservation || "").slice(0, 180));\n      continue;',
  ],
  [
    '      emitLive({ action: "tool", query: "reverse_whois", provider: "none", summary: "whoxy deprecated" });\n      continue;',
    '      emitLive({ action: "tool", query: "reverse_whois", provider: "none", summary: "whoxy deprecated" });\n      retireActiveToolSpan("error", "whoxy deprecated");\n      continue;',
  ],
  [
    '      emitLive({\n        action: "footprint_email",\n        query: action.email,\n        provider: "holehe",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      continue;',
    '      emitLive({\n        action: "footprint_email",\n        query: action.email,\n        provider: "holehe",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      retireActiveToolSpan("ok", (lastObservation || "").slice(0, 180));\n      continue;',
  ],
  [
    '      emitLive({\n        action: "footprint_username",\n        query: action.username,\n        provider: "maigret",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      continue;',
    '      emitLive({\n        action: "footprint_username",\n        query: action.username,\n        provider: "maigret",\n        summary: (lastObservation || "").slice(0, 180),\n      });\n      retireActiveToolSpan("ok", (lastObservation || "").slice(0, 180));\n      continue;',
  ],
]);

patch("artifacts/apex-finder/src/components/reactor-activity-only.tsx", [
  [
    '    .filter((activity) => activity.status === "active")',
    '    .filter((activity) => activity.status === "active" && activity.spanType === "tool" && Boolean(activity.tool))',
  ],
  [
    '        Live telemetry only · active nodes disappear when spans retire · solid links are observed parent flow · dashed links are inferred sequence',
    '        Live telemetry only · active tool spans only · nodes disappear when tool spans retire · solid links are observed parent flow · dashed links are inferred sequence',
  ],
]);

patch("scripts/check-reactor-live-integrity.mjs", [
  [
    '["graph consumes shared telemetry store", /useReactorLiveTelemetry\\(\\)/.test(activity)],',
    '["graph consumes shared telemetry store", /useReactorLiveTelemetry\\(\\)/.test(activity)],\n  ["graph renders only active tool spans", /status === "active" && activity\\.spanType === "tool" && Boolean\\(activity\\.tool\\)/.test(activity)],',
  ],
]);

console.log("Applied targeted Dig live-tool-span instrumentation and Reactor active-tool filter.");
