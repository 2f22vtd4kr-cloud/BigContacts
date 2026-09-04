import { readFile, writeFile } from "node:fs/promises";

async function patch(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change produced for ${path}`);
  await writeFile(path, after);
}

await patch("artifacts/api-server/src/src/lib/discovery-agent.ts", (s) => {
  const from = `    input.onLiveStep?.(step);\n    spanFromLiveStep({ jobId, targetName: "discovery", tool: step.provider || step.action, label: step.query || step.url || step.action, detail: step.summary || step.url || step.query, status: "ok", agentName: "discovery" });`;
  const to = `    input.onLiveStep?.({\n      action: step.action,\n      tool: step.provider || step.action,\n      query: step.query,\n      url: step.url,\n      detail: step.summary,\n      status: "ok",\n    });\n    spanFromLiveStep({ jobId, targetName: "discovery", tool: step.provider || step.action, label: step.query || step.url || step.action, detail: step.summary || step.url || step.query, status: "ok", agentName: "discovery" });`;
  if (!s.includes(from)) throw new Error("discovery callback anchor missing");
  return s.replace(from, to);
});

await patch("artifacts/api-server/src/src/lib/case-bureau.ts", (s) => {
  let next = s;
  next = next.replace(`  scope: "person" | "organization" | "unknown";`, `  // Discovery review may carry provider-specific scope labels; promotion validates the final route scope.\n  scope: string;`);
  next = next.replace(`  note: string | null;`, `  // Evidence notes are optional for provider-originated findings.\n  note: string | null | undefined;`);
  if (next === s) throw new Error("DiscoveryContactEvidence scope/note anchors missing");
  return next;
});

await patch("artifacts/api-server/src/src/routes/research/cases.ts", (s) => {
  let next = s;
  next = next.replace(
`      progressAssessment: string | null;\n      lanesHonesty: Record<string, unknown> | null;`,
`      progressAssessment: string | null;\n      rightHandDisposition: string | null;\n      rightHandNote: string | null;\n      lanesHonesty: Record<string, unknown> | null;`
  );
  next = next.replaceAll(`let entityId: number =`, `let entityId: number | null =`);
  next = next.replace(
`        entityLinks: parsed.entityLinks,`,
`        entityLinks: Array.isArray(parsed.entityLinks)\n          ? parsed.entityLinks as Array<{ from: string; to: string; relation: string; evidence: string[] }>\n          : undefined,`
  );
  next = next.replaceAll(`body.error.message`, `body.error?.message`);
  if (next === s) throw new Error("research-cases pass2 anchors missing");
  return next;
});

console.log("Applied second-pass type contract repairs.");
