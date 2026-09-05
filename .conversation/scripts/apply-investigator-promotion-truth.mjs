#!/usr/bin/env node
/**
 * Investigator Decision → Durable Promotion instrumentation + search provider truth.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, t) => fs.writeFileSync(path.join(root, p), t);

{
  let s = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
  if (!s.includes('provider: "serper" | "tavily" | "exa" | "ddg"')) {
    s = s.replace(
      "async function toolWebSearch(query: string): Promise<{ text: string; urls: string[] }> {\n  // Prefer Serper (stable SERP URLs), then Tavily (keyed advanced search), then DDG HTML.\n  // Single-provider starvation is why a general agent can beat the bureau on the same surface.\n  const serper = await toolWebSearchSerper(query);\n  if (serper && serper.urls.length > 0) return serper;\n\n  const tavily = await toolWebSearchTavily(query);\n  if (tavily && (tavily.urls.length > 0 || tavily.text.length > 40)) return tavily;\n\n  const exa = await toolWebSearchExa(query);\n  if (exa && (exa.urls.length > 0 || exa.text.length > 40)) return exa;",
      `async function toolWebSearch(query: string): Promise<{ text: string; urls: string[]; provider: "serper" | "tavily" | "exa" | "ddg" }> {
  // Prefer Serper, then Tavily, then Exa, then DDG. Providers are tools — not promotion authorities.
  const serper = await toolWebSearchSerper(query);
  if (serper && serper.urls.length > 0) return { ...serper, provider: "serper" };

  const tavily = await toolWebSearchTavily(query);
  if (tavily && (tavily.urls.length > 0 || tavily.text.length > 40)) return { ...tavily, provider: "tavily" };

  const exa = await toolWebSearchExa(query);
  if (exa && (exa.urls.length > 0 || exa.text.length > 40)) return { ...exa, provider: "exa" };`,
    );
    s = s.replace(
      'if (!resp.ok) return exa ?? tavily ?? serper ?? { text: "", urls: [] };',
      'if (!resp.ok) return { ...(exa ?? tavily ?? serper ?? { text: "", urls: [] }), provider: exa ? "exa" : tavily ? "tavily" : serper ? "serper" : "ddg" };',
    );
    s = s.replace(
      "if (out.urls.length === 0 && (exa || tavily || serper)) return exa ?? tavily ?? serper!;",
      'if (out.urls.length === 0 && (exa || tavily || serper)) return { ...(exa ?? tavily ?? serper!), provider: (exa ? "exa" : tavily ? "tavily" : "serper") };',
    );
    s = s.replace(
      'return exa ?? tavily ?? serper ?? { text: "", urls: [] };',
      'return { ...(exa ?? tavily ?? serper ?? { text: "", urls: [] }), provider: exa ? "exa" : tavily ? "tavily" : serper ? "serper" : "ddg" };',
    );
  }
  s = s.replace(
    'lastObservation = formatSearchObservation(action.query, sr);\n      emitLive({\n        action: "web_search",\n        query: action.query,\n        provider: "serper",\n        summary: `${sr.urls.length} URLs · ${sr.text.slice(0, 160)}`,\n      });',
    'lastObservation = formatSearchObservation(action.query, sr) +\n        `\\nSEARCH_PROVIDER: ${sr.provider || "unknown"} (tool result — not a promotion decision)`;\n      emitLive({\n        action: "web_search",\n        query: action.query,\n        provider: sr.provider || "unknown",\n        summary: `${sr.provider || "?"} · ${sr.urls.length} URLs · ${sr.text.slice(0, 140)}`,\n      });',
  );
  const oldOut = "const out = { text, urls: [...new Set(urls)].slice(0, 10) };";
  const newOut = 'const out = { text, urls: [...new Set(urls)].slice(0, 10), provider: "ddg" as const };';
  if (s.includes(oldOut)) s = s.replace(oldOut, newOut);
  write("artifacts/api-server/src/src/lib/agentic-web-research.ts", s);
  console.log("OK agentic web_search provider truth");
}

{
  let d = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
  d = d.replace(
    "resultSummary: `slot=${slot + 1}/${requestedBatch} candidates=${slotCandidates.length} searches=${result.searches} visits=${result.visits}`",
    "resultSummary: `slot=${slot + 1}/${requestedBatch} investigator_decisions=${slotCandidates.length} searches=${result.searches} visits=${result.visits} (modelFindings only — not infra extract)`",
  );
  if (!d.includes("INVESTIGATOR_PROMOTION_DECISION")) {
    d = d.replace(
      "if (slotCandidates.length) {\n          for (const candidate of slotCandidates) {",
      `if (slotCandidates.length) {
          for (const candidate of slotCandidates) {
            try {
              publishDigSpan({
                jobId,
                spanType: "stage",
                name: "investigator_promotion_decision",
                status: "ok",
                agentName: "discovery",
                inputSummary: candidate.name,
                resultSummary: \`INVESTIGATOR_PROMOTION_DECISION name=\${candidate.name} sources=\${(candidate.sourceUrls || []).slice(0, 2).join("|")} — awaiting durable persist\`,
              });
            } catch { /* best-effort */ }`,
    );
  }
  if (!d.includes("PROMOTION AUTHORITY")) {
    d = d.replace(
      '"DISCOVERY ASSIGNMENT — find a real person worth a later public-contact dig.",',
      '"DISCOVERY ASSIGNMENT — find a real person worth a later public-contact dig.",\n    "PROMOTION AUTHORITY: You (the investigator) decide who is worth promoting. Deterministic code only validates provenance/schema and persists your decision — it does not pick people for you from page scrapes.",',
    );
  }
  write("artifacts/api-server/src/src/lib/discovery-agent.ts", d);
  console.log("OK discovery-agent promotion spans");
}

{
  let o = read("artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
  if (!o.includes("DURABLE_PROMOTION_PERSISTED")) {
    o = o.replace(
      "void appendJobLog(\n          atlasJobId,\n          `DISCOVERY_ADMIT ${JSON.stringify({ id, name: candidate.name, sources: candidate.sourceUrls?.slice(0, 3) })}`,\n        ).catch(() => {});",
      `void appendJobLog(
          atlasJobId,
          \`DURABLE_PROMOTION_PERSISTED \${JSON.stringify({ id, name: candidate.name, sources: candidate.sourceUrls?.slice(0, 3), state: "candidate_admitted" })}\`,
        ).catch(() => {});
        try {
          const { publishDigSpan } = await import("./dig-span");
          publishDigSpan({
            jobId: atlasJobId,
            spanType: "stage",
            name: "durable_promotion",
            status: "ok",
            agentName: "discovery",
            inputSummary: candidate.name,
            resultSummary: \`entityId=\${id} state=candidate_admitted\`,
          });
        } catch { /* best-effort */ }`,
    );
  }
  write("artifacts/api-server/src/src/lib/atlas-orchestrator.ts", o);
  console.log("OK orchestrator durable promotion log");
}

{
  const op = "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts";
  let o = read(op);
  if (!o.includes("SEARCH/BROWSE TOOLS (not promotion authorities)")) {
    if (o.includes("web_search") && !o.includes("Serper → Tavily → Exa")) {
      o = o.replace(
        /web_search[^\n]*/,
        (m) =>
          m +
          "\nSEARCH/BROWSE TOOLS (not promotion authorities): web_search routes Serper → Tavily → Exa → DDG; visit/browser_fetch may use HTTP then Scrapfly/ZenRows/Browserless. Specialist: domain_lookup, registry_search, footprint_*, harvest_domain. The investigator chooses tools; providers only execute.",
      );
    }
    if (!o.includes("Investigator decides promotion")) {
      o =
        o +
        "\n\n// PROMOTION LAW\n// Investigator (Groq→Mistral) decides who/what is worth promoting via structured findings.\n// Deterministic code validates identity/provenance/scope and persists that decision.\n// Boss/Gemini and NVIDIA right-hand never promote. Search providers never promote.\n";
    }
    write(op, o);
    console.log("OK orientation promotion/tools");
  }
}

{
  let s = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
  const oldOut = "const out = { text, urls: [...new Set(urls)].slice(0, 10) };";
  const newOut = 'const out = { text, urls: [...new Set(urls)].slice(0, 10), provider: "ddg" as const };';
  if (s.includes(oldOut)) {
    s = s.replace(oldOut, newOut);
    write("artifacts/api-server/src/src/lib/agentic-web-research.ts", s);
    console.log("OK ddg provider field");
  }
}

console.log("INVESTIGATOR_PROMOTION_TRUTH_APPLIED");
