import fs from "node:fs";

const targetPath = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
let source = fs.readFileSync(targetPath, "utf8");

const oldUnion = '  | { action: "footprint_username"; username: string; thought?: string }';
const newUnion = '  | { action: "footprint_username_maigret"; username: string; thought?: string }\n  | { action: "footprint_username_sherlock"; username: string; thought?: string }';
if (source.includes(oldUnion)) source = source.replace(oldUnion, newUnion);

const oldSchema = '"footprint_email", "footprint_username", "domain_lookup"';
const newSchema = '"footprint_email", "footprint_username_maigret", "footprint_username_sherlock", "domain_lookup"';
if (source.includes(oldSchema)) source = source.replace(oldSchema, newSchema);

const oldParse = 'if (action === "footprint_username" && cleanText(value.username, 80).replace(/^@/, "").length >= 2) return { action: "footprint_username", username: cleanText(value.username, 80).replace(/^@/, ""), thought: cleanText(value.thought, 500) || undefined };';
const newParse = 'if ((action === "footprint_username_maigret" || action === "footprint_username_sherlock") && cleanText(value.username, 80).replace(/^@/, "").length >= 2) return { action: action as "footprint_username_maigret" | "footprint_username_sherlock", username: cleanText(value.username, 80).replace(/^@/, ""), thought: cleanText(value.thought, 500) || undefined };';
if (source.includes(oldParse)) source = source.replace(oldParse, newParse);

const oldExecution = /      if \(action\.action === "footprint_username"\) \{[\s\S]*?history\.push\(`step\$\{i \+ 1\}: footprint_username \$\{action\.username\} execution=\$\{record\.execution\}`\); emit\("footprint_username", \{ query: action\.username, provider: "maigret", summary: lastObservation\.slice\(0, 180\) \}\); continue; \}/;
const newExecution = `      if (action.action === "footprint_username_maigret" || action.action === "footprint_username_sherlock") { history.push(\`step\${i + 1}: \${action.action} \${action.username} execution=selected\`); try { const tools = await import("./python-tools"); const result = action.action === "footprint_username_maigret" ? await tools.runMaigret(action.username, { signal: runController.signal }) : await tools.runSherlock(action.username, { signal: runController.signal }); lastObservation = \`\${action.action.toUpperCase()} \${action.username}\\n\${(result.found || []).slice(0, 15).map((h: any) => h.siteName || h.url || "site").join(", ") || result.error || "no platform hits"}\`; record.execution = "success"; record.observation = lastObservation; } catch (error: any) { record.execution = runController.signal.aborted ? "cancelled" : "error"; lastObservation = \`\${action.action} failed: \${error?.message || "error"}\`; record.observation = lastObservation; } history[history.length - 1] = \`step\${i + 1}: \${action.action} \${action.username} execution=\${record.execution}\`; emit(action.action, { query: action.username, provider: action.action === "footprint_username_maigret" ? "maigret" : "sherlock", summary: lastObservation.slice(0, 180) }); continue; }`;
if (oldExecution.test(source)) source = source.replace(oldExecution, newExecution);

if (/action === "footprint_username"/.test(source)) throw new Error("username capability split: legacy compound action remains");
if (!source.includes('action === "footprint_username_maigret"') || !source.includes('action === "footprint_username_sherlock"')) throw new Error("username capability split: expected individual actions missing");

fs.writeFileSync(targetPath, source);
console.log("agentic username capability split: applied");
