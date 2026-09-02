#!/usr/bin/env node
/** Enforce Investigator Decision → Durable Promotion. */
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, t) => fs.writeFileSync(path.join(root, p), t);

{
  let s = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
  if (!s.includes("promotionDecision?: \"promote\" | \"reject\"")) {
    s = s.replace(
      '  note: string;\n};',
      '  note: string;\n  /** Explicit investigator decision; discovery admission requires promote. */\n  promotionDecision?: "promote" | "reject";\n  /** Short investigator-authored reason for the decision. */\n  promotionReason?: string;\n};',
    );
  }
  if (!s.includes('promotionDecision: { type: "string", enum: ["promote", "reject"] }')) {
    s = s.replace(
      '        note: { type: "string" },\n      },',
      '        note: { type: "string" },\n        promotionDecision: { type: "string", enum: ["promote", "reject"] },\n        promotionReason: { type: "string" },\n      },',
    );
  }
  if (!s.includes('const promotionDecision = row.promotionDecision === "promote" || row.promotionDecision === "reject"')) {
    s = s.replace(
      '        const personName = rawPersonName || null;\n        const role = typeof row.role === "string" ? row.role.slice(0, 120) : null;',
      '        const personName = rawPersonName || null;\n        const promotionDecision = row.promotionDecision === "promote" || row.promotionDecision === "reject"\n          ? row.promotionDecision\n          : undefined;\n        const promotionReason = typeof row.promotionReason === "string" ? row.promotionReason.slice(0, 500) : undefined;\n        const role = typeof row.role === "string" ? row.role.slice(0, 120) : null;',
    );
    s = s.replace(
      '          note: typeof row.note === "string" ? row.note.slice(0, 400) : "agentic web research",\n        });',
      '          note: typeof row.note === "string" ? row.note.slice(0, 400) : "agentic web research",\n          promotionDecision,\n          promotionReason,\n        });',
    );
  }
  const oldContract = 'If you establish a real named person, emit action=done with a finding containing personName="Full Name" (or value="person: Full Name | role | company"), scope="candidate", and sourceUrls containing the exact HTTPS page you actually observed.';
  const newContract = 'If you establish a real named person that YOU judge worth promoting, emit action=done with a finding containing personName="Full Name" (or value="person: Full Name | role | company"), scope="candidate", promotionDecision="promote", promotionReason="brief reason", and sourceUrls containing the exact HTTPS page you actually observed. If you do not judge the person worth promoting, emit promotionDecision="reject" or findings=[].';
  if (s.includes(oldContract)) s = s.replace(oldContract, newContract);
  write("artifacts/api-server/src/src/lib/agentic-web-research.ts", s);
  console.log("OK agentic promotion contract");
}

{
  let d = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
  if (!d.includes('promotionDecision?: "promote" | "reject"')) {
    d = d.replace(
      'export type DiscoveryCandidate = { name: string; role?: string; company?: string; basis: string; sourceUrls: string[]; lane?: string; confidence?: number };',
      'export type DiscoveryCandidate = { name: string; role?: string; company?: string; basis: string; sourceUrls: string[]; lane?: string; confidence?: number; promotionDecision: "promote"; promotionReason?: string };',
    );
    d = d.replace(
      '  note?: string;\n  scope?: "organization" | "candidate" | "unknown";\n};',
      '  note?: string;\n  scope?: "organization" | "candidate" | "unknown";\n  promotionDecision?: "promote" | "reject";\n  promotionReason?: string;\n};',
    );
  }
  if (!d.includes('promotionDecision !== "promote"')) {
    d = d.replace(
      '  for (const f of findings ?? []) {\n    // Proxy/DEF-14A auto-extraction',
      '  for (const f of findings ?? []) {\n    // Only the investigator may promote a discovery person.\n    if (f.promotionDecision !== "promote") {\n      logger.info({ personName: f.personName, promotionDecision: f.promotionDecision }, "[discovery-agent] skipped finding without explicit investigator promotion decision");\n      continue;\n    }\n    // Proxy/DEF-14A auto-extraction',
    );
  }
  if (!d.includes('promotionDecision: f.promotionDecision')) {
    d = d.replace(
      '      add(String(f.personName), { role: f.role ?? undefined, basis: f.note || f.role || "Named on visited public page", sourceUrls: urls });',
      '      add(String(f.personName), { role: f.role ?? undefined, basis: f.note || f.role || "Named on visited public page", sourceUrls: urls, promotionDecision: f.promotionDecision, promotionReason: f.promotionReason });',
    );
    d = d.replace(
      '        sourceUrls: urls,\n      });\n      continue;\n    }\n    if (/^related-person:/i.test(value))',
      '        sourceUrls: urls,\n        promotionDecision: f.promotionDecision,\n        promotionReason: f.promotionReason,\n      });\n      continue;\n    }\n    if (/^related-person:/i.test(value))',
    );
  }
  if (!d.includes('promotionDecision: "promote",')) {
    d = d.replace(
      '      confidence: sourceUrls.length ? 0.55 : 0.35,\n    });',
      '      confidence: sourceUrls.length ? 0.55 : 0.35,\n      promotionDecision: "promote",\n      promotionReason: extra.promotionReason,\n    });',
    );
  }
  write("artifacts/api-server/src/src/lib/discovery-agent.ts", d);
  console.log("OK discovery explicit promotion gate");
}

{
  let a = read("artifacts/api-server/src/src/lib/discovery-agent-admit.ts");
  if (!a.includes('c.promotionDecision !== "promote"')) {
    a = a.replace(
      '  if (options.modelSelected) {\n    // Model-selected discovery is deliberately not ranked, scored, or filtered',
      '  if (options.modelSelected) {\n    // Durable admission requires the investigator\'s explicit promotion decision.\n    if (c.promotionDecision !== "promote") {\n      logger.info({ name }, "[discovery-agent-admit] rejected: no explicit investigator promotion decision");\n      return null;\n    }\n    // Model-selected discovery is deliberately not ranked, scored, or filtered',
    );
  }
  if (!a.includes("promotionDecision: c.promotionDecision")) {
    a = a.replace(
      '        company: c.company,\n        ...(fitness ? { fitness: fitness.fit } : {}),',
      '        company: c.company,\n        promotionDecision: c.promotionDecision,\n        promotionReason: c.promotionReason,\n        ...(fitness ? { fitness: fitness.fit } : {}),',
    );
  }
  write("artifacts/api-server/src/src/lib/discovery-agent-admit.ts", a);
  console.log("OK durable promotion persistence");
}

console.log("INVESTIGATOR_PROMOTION_CONTRACT_APPLIED");
