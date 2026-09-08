#!/usr/bin/env node
import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let source = fs.readFileSync(file, "utf8");
const from = '    const activeToolSpan = action.action === "done"\n      ? null\n      : publishDigSpan({\n          jobId: input.jobId || "unknown",\n          targetName: name,\n          spanType: "tool",\n          name: action.action,\n          status: "active",\n          inputSummary: ("query" in action ? action.query : "url" in action ? action.url : "email" in action ? action.email : "username" in action ? action.username : "domain" in action ? action.domain : "registry" in action ? `${action.registry}:${action.query}` : action.action)?.slice(0, 400),\n          agentName: "investigator",\n        });';
const to = '    const duplicateVisit = action.action === "visit" && visitedUrls.has(action.url);\n    const activeToolSpan = action.action === "done" || duplicateVisit\n      ? null\n      : publishDigSpan({\n          jobId: input.jobId || "unknown",\n          targetName: name,\n          spanType: "tool",\n          name: action.action,\n          status: "active",\n          inputSummary: String((action as any).query ?? (action as any).url ?? (action as any).email ?? (action as any).username ?? (action as any).domain ?? ((action as any).registry ? `${(action as any).registry}:${(action as any).query ?? ""}` : (action as any).action ?? "tool")).slice(0, 400),\n          agentName: "investigator",\n        });';
if (!source.includes(from)) throw new Error("live tool span block anchor missing");
source = source.replace(from, to);
fs.writeFileSync(file, source);
console.log("Applied live tool span type/duplicate guard.");
