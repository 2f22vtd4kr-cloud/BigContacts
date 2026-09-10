import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/case-bureau.ts";
let source = fs.readFileSync(path, "utf8");
const legacy = `    initialAction: {\n      id: "broad-web-discovery",\n      title: "Broad public-web discovery",\n      purpose: "Find realistic investor candidates and routes without assuming a target in advance.",\n      status: "waiting_for_provider",\n    },`;
const canonical = `    initialAction: {\n      id: "awaiting-boss-control",\n      title: "Awaiting Gemini Boss control",\n      purpose: "Durable discovery context is ready; Gemini Boss must decide the next research direction.",\n      status: "waiting_for_gemini",\n    },`;
if (source.includes(legacy)) source = source.replace(legacy, canonical);
if (!source.includes('id: "awaiting-boss-control"')) throw new Error("discovery case initial-action state repair failed");
if (source.includes('id: "broad-web-discovery"')) throw new Error("legacy fixed discovery action remains");
fs.writeFileSync(path, source);
console.log("Discovery case initial state now represents awaiting Boss control, not a research action.");
