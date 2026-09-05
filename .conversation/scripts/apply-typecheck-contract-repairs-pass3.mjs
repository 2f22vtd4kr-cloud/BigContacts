import { readFile, writeFile } from "node:fs/promises";

const path = "artifacts/api-server/src/src/routes/research/cases.ts";
let s = await readFile(path, "utf8");
const before = s;

s = s.replace(
`    progressAssessment: string | null;\n    lanesHonesty: Record<string, unknown> | null;`,
`    progressAssessment: string | null;\n    rightHandDisposition: string | null;\n    rightHandNote: string | null;\n    lanesHonesty: Record<string, unknown> | null;`
);

s = s.replace(
`    note: string | null;\n  }> | undefined>`,
`    note: string | null | undefined;\n  }> | undefined>`
);

s = s.replaceAll(`    let entityId = existing[0]?.id ?? null;`, `    let entityId: number | null = existing[0]?.id ?? null;`);
s = s.replaceAll(`    let entityId = existingEntity?.id ?? null;`, `    let entityId: number | null = existingEntity?.id ?? null;`);

if (s === before) throw new Error("pass3 produced no changes");
await writeFile(path, s);
console.log("Applied third-pass route contract repairs.");
