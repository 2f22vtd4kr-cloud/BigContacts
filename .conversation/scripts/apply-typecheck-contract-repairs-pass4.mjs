import { readFile, writeFile } from "node:fs/promises";

const path = "artifacts/api-server/src/src/routes/research/cases.ts";
let s = await readFile(path, "utf8");
const before = s;

s = s.replace(`        error: agenticDiscovery.error,`, `        error: agenticDiscovery.error ?? null,`);
s = s.replace(`        error: agenticVerify.error,`, `        error: agenticVerify.error ?? null,`);
s = s.replace(
`        entityLinks: entityLinks.length ? entityLinks : (workingFile as { entityLinks?: unknown }).entityLinks,`,
`        entityLinks: entityLinks.length\n          ? entityLinks\n          : (workingFile as { entityLinks?: Array<{ from: string; to: string; relation: string; evidence: string[] }> }).entityLinks,`
);
s = s.replace(
`  if (!params.success || !body.success) {\n    res.status(400).json({ error: !params.success ? params.error.message : body.error.message });\n    return;\n  }`,
`  if (!params.success) {\n    res.status(400).json({ error: params.error.message });\n    return;\n  }\n  if (!body.success) {\n    res.status(400).json({ error: body.error.message });\n    return;\n  }`
);

if (s === before) throw new Error("pass4 produced no changes");
await writeFile(path, s);
console.log("Applied final known typecheck repairs.");
