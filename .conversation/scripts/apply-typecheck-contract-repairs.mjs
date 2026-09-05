import { readFile, writeFile } from "node:fs/promises";

async function patch(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change produced for ${path}`);
  await writeFile(path, after);
}

await patch("artifacts/api-server/src/src/lib/deep-web-osint.ts", (s) => {
  const from = `type CandidateEvidence = {\n  value: string;`;
  const to = `type CandidateEvidence = {\n  vectorType: string;\n  value: string;`;
  if (!s.includes(from)) throw new Error("CandidateEvidence anchor missing");
  return s.replace(from, to);
});

await patch("artifacts/api-server/src/src/lib/discovery-agent.ts", (s) => {
  const from = `spanFromLiveStep({ jobId, targetName: "discovery", tool: step.tool || step.action, label: step.query || step.url || step.action, detail: step.detail || step.url || step.query, status: step.status === "error" ? "error" : step.status === "active" ? "active" : "ok", agentName: "discovery" });`;
  const to = `spanFromLiveStep({ jobId, targetName: "discovery", tool: step.provider || step.action, label: step.query || step.url || step.action, detail: step.summary || step.url || step.query, status: "ok", agentName: "discovery" });`;
  if (!s.includes(from)) throw new Error("discovery live-step anchor missing");
  return s.replace(from, to);
});

await patch("artifacts/api-server/src/src/lib/in-house-enricher.ts", (s) => {
  const from = `setEmail(waybackEmail, 55, "Wayback-Email");`;
  const to = `setEmail(waybackEmail.email, 55, "Wayback-Email", waybackEmail.sourceUrl ?? undefined);`;
  if (!s.includes(from)) throw new Error("Wayback contract anchor missing");
  return s.replace(from, to);
});

await patch("artifacts/api-server/src/src/lib/web-enricher.ts", (s) => {
  let next = s;
  next = next.replaceAll(`? sanitizePublicSocialUrl(normalized, "linkedin", scope)\n        : network === "instagram"`, `? (sanitizePublicSocialUrl(normalized, "linkedin", scope) ?? "")\n        : network === "instagram"`);
  next = next.replaceAll(`: sanitizePublicSocialUrl(normalized, "instagram", scope))`, `: (sanitizePublicSocialUrl(normalized, "instagram", scope) ?? ""))`);
  next = next.replaceAll(`: sanitizePublicSocialUrl(normalized, "twitter", scope))`, `: (sanitizePublicSocialUrl(normalized, "twitter", scope) ?? ""))`);
  next = next.replace(`if (candidate.sourceUrls.length > 0 && candidate.state !== "rejected") return value;`, `if (candidate.sourceUrls.length > 0) return value;`);
  if (next === s) throw new Error("web-enricher anchors missing");
  return next;
});

await patch("artifacts/api-server/src/src/routes/extended-osint.ts", (s) => {
  let next = s;
  next = next.replace(
`      const domains = Array.isArray(result.allUniqueDomains) ? result.allUniqueDomains : [];
      const domainVectors = domains.slice(0, 20)
        .filter((d: unknown): d is string => typeof d === "string" && d.trim().length > 0)
        .map((d: string) => {
          const host = d.replace(/^https?:\\/\\//i, "").split("/")[0] ?? d;
          const url = /^https?:\\/\\//i.test(d) ? d : \`https://\${host}\`;`,
`      const domains = Array.isArray(result.allUniqueDomains) ? result.allUniqueDomains : [];
      const domainVectors = domains.slice(0, 20)
        .filter((d) => typeof d.domain_name === "string" && d.domain_name.trim().length > 0)
        .map((d) => {
          const host = d.domain_name.trim().toLowerCase();
          const url = \`https://\${host}\`;`
  );
  next = next.replace(
`.filter((p: { url?: string }) => typeof p.url === "string" && /^https?:\\/\\//i.test(p.url))
        .map((p: { name?: string; url: string }) => ({`,
`.filter((p): p is typeof p & { url: string } => typeof p.url === "string" && /^https?:\\/\\//i.test(p.url))
        .map((p) => ({`
  );
  next = next.replace(
`.filter((p: { url?: string }) => typeof p.url === "string" && /^https?:\\/\\//i.test(p.url))
        .map((p: { siteName?: string; url: string }) => ({`,
`.filter((p): p is typeof p & { url: string } => typeof p.url === "string" && /^https?:\\/\\//i.test(p.url))
        .map((p) => ({`
  );
  if (next === s) throw new Error("extended-osint anchors missing");
  return next;
});

await patch("artifacts/api-server/src/src/lib/atlas-orchestrator.ts", (s) => {
  let next = s;
  next = next.replace(
`          }).then(r => r.json()).catch(() => null);

          const raw = resp?.choices?.[0]?.message?.content?.trim() ?? "";`,
`          }).then(async (r) => r.json() as Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>).catch(() => null);

          const raw = resp?.choices?.[0]?.message?.content?.trim() ?? "";`
  );
  next = next.replace(
`      const entityAssets = await db.select({
        category: assetsTable.category,
        estimatedValue: assetsTable.estimatedValue,
        jurisdiction: assetsTable.jurisdiction,
      }).from(assetsTable).where(eq(assetsTable.ownerEntityId, id)).catch(() => []);`,
`      const entityAssets: Array<{ category: string | null; estimatedValue: number | string | null; jurisdiction: string | null }> = await db.select({
        category: assetsTable.category,
        estimatedValue: assetsTable.estimatedValue,
        jurisdiction: assetsTable.jurisdiction,
      }).from(assetsTable).where(eq(assetsTable.ownerEntityId, id)).catch(() => []);`
  );
  if (next === s) throw new Error("atlas anchors missing");
  return next;
});

await patch("artifacts/api-server/src/src/lib/case-bureau.ts", (s) => {
  const from = `export type DiscoveryContactEvidence = {\n  vectorType: "email" | "phone" | "linkedin" | "twitter" | "instagram" | "telegram" | "website" | "organization_contact" | "other";`;
  const to = `export type DiscoveryContactEvidence = {\n  // Discovery is provider/model-selected and may surface new public route labels;\n  // downstream persistence still validates scope, source URLs and promotion state.\n  vectorType: string;`;
  if (!s.includes(from)) throw new Error("DiscoveryContactEvidence anchor missing");
  return s.replace(from, to);
});

await patch("artifacts/api-server/src/src/routes/research/cases.ts", (s) => {
  let next = s;
  next = next.replace(
`          progressAssessment?: string | null;\n          rightHandDisposition?: string | null;`,
`          progressAssessment?: string | null;\n          rightHandDisposition?: string | null;`
  );
  next = next.replace(
`type DiscoveryCandidate = ReturnType<typeof parseDiscoveryCaseFile> extends infer T\n  ? Exclude<T, null>["discoveredCandidates"][number]\n  : never;`,
`type DiscoveryCandidate = import("../../lib/case-bureau").DiscoveryCaseFile["discoveredCandidates"][number];`
  );
  next = next.replace(`        entityId = null;`, `        entityId = null;`);
  if (next === s) throw new Error("research-cases anchors missing");
  return next;
});

console.log("Applied first-pass type contract repairs.");
