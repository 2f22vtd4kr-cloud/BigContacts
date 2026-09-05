import { readFile, writeFile } from "node:fs/promises";

async function rewrite(path, replacements) {
  const before = await readFile(path, "utf8");
  let after = before;
  for (const [from, to] of replacements) after = after.replace(from, to);
  if (after !== before) await writeFile(path, after);
  return after !== before;
}

await rewrite("artifacts/api-server/src/src/lib/discovery-agent.ts", [[
  `    input.onLiveStep?.(step);`,
  `    input.onLiveStep?.({\n      action: step.action,\n      tool: step.provider || step.action,\n      query: step.query,\n      url: step.url,\n      detail: step.summary,\n      status: "ok",\n    });`
]]);

await rewrite("artifacts/api-server/src/src/lib/case-bureau.ts", [
  [`  scope: "person" | "organization" | "unknown";`, `  // Provider/model discovery may carry additional review-only scope labels; promotion validates final scope.\n  scope: string;`],
  [`  note: string | null;`, `  // Provider-originated evidence may omit a note.\n  note: string | null | undefined;`],
]);

await rewrite("artifacts/api-server/src/src/routes/research/cases.ts", [
  [`      progressAssessment: string | null;\n      lanesHonesty: Record<string, unknown> | null;`, `      progressAssessment: string | null;\n      rightHandDisposition: string | null;\n      rightHandNote: string | null;\n      lanesHonesty: Record<string, unknown> | null;`],
  [`let entityId: number =`, `let entityId: number | null =`],
  [`        entityLinks: parsed.entityLinks,`, `        entityLinks: Array.isArray(parsed.entityLinks)\n          ? parsed.entityLinks as Array<{ from: string; to: string; relation: string; evidence: string[] }>\n          : undefined,`],
  [`body.error.message`, `body.error?.message`],
]);

console.log("Applied best-effort second-pass contract repairs.");
