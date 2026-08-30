/**
 * Discovery agent — free LLM loop to propose people with public basis.
 * Does NOT promote contacts onto entity cards. Output is candidates for discovery-intake.
 *
 * Batch semantics are intentionally model-driven: each slot gets a fresh agentic
 * research pass. The batch controller only prevents duplicate admission and
 * keeps the overall run bounded; it does not prescribe queries, sources, tools,
 * hops, rankings, or target identities.
 */
import { logger } from "./logger";
import { publishDigSpan, completeDigSpan, spanFromLiveStep } from "./dig-span";
import { runAgenticWebResearch } from "./agentic-web-research";

export type DiscoveryCandidate = { name: string; role?: string; company?: string; basis: string; sourceUrls: string[]; lane?: string; confidence?: number };
export type DiscoveryAgentResult = { candidates: DiscoveryCandidate[]; model?: string; searches: number; visits: number; degraded: boolean; message: string };

type DiscoveryFinding = {
  vectorType?: string;
  value?: string;
  sourceUrls?: string[];
  role?: string | null;
  personName?: string | null;
  note?: string;
  scope?: "organization" | "candidate" | "unknown";
};

const INVALID_PERSON_NAME_WORDS = new Set(["a","an","and","as","at","behind","been","by","chief","ceo","company","executive","from","has","in","of","officer","on","the","to","with","security","issues","issue","problem","problems","solutions","services","technology","systems","markets","capital","equity","partners","partner","group","fund","funds","holdings","holding","management","ventures","venture","estate","real","private","public","wealth","investment","investments","finance","financial","industries","industry","resources","strategy","strategies","operations","organization","organizations","foundation","foundations","billionaire","billionaires","millionaire","millionaires","person","email","phone","com","www"]);
const INVALID_PERSON_NAME_PHRASES = ["security issues","security issue","private equity","venture capital","real estate","wealth management","financial services","chief executive officer","chief executive","executive officer","company founder","billionaire founders","billionaire founder","forbes list","forbes billionaires","the billionaire","the billionaires"];
const LIST_ONLY_SOURCE_PATTERNS = [/forbes\.com\/billionaires(?:\/|\?|$)/i,/forbes\.com\/real-time-billionaires(?:\/|\?|$)/i,/forbes\.com\/lists\/[^\s/]*billionaires?/i,/forbes\.com\/lists\/[^\s/]*richest/i,/bloomberg\.com\/billionaires(?:\/|\?|$)/i];


export function hasStrongIdentityEvidence(input: {
  name: string;
  role?: string;
  company?: string;
  basis?: string;
  sourceUrls: string[];
}): boolean {
  const name = input.name.trim().replace(/\s+/g, " ");
  const normalized = name.toLowerCase();
  const urls = input.sourceUrls.filter((u) => /^https?:\/\/\S+$/i.test(String(u)));

  // Safety boundary only: reject values that are structurally recognizable as
  // metadata, labels, addresses, products, departments, or organization text.
  // Do NOT require the explanatory note to repeat the name: doing so would
  // over-filter legitimate model findings and would turn safety into ranking.
  if (/(?:^|\b)(email|phone|address|street|zip|postal|product|comparison|enablement|operational|person)(?:\b|$)/i.test(normalized)) return false;
  if (/^president(?:\s+person)?$/i.test(normalized)) return false;
  if (/^(?:[a-z]+\.)?[a-z]{2,}\s+(?:email|phone)$/i.test(normalized)) return false;
  if (/\b(?:llc|ltd|inc|corp|corporation|holdings|group|partners|fund|capital|ventures|foundation|products?)\b/i.test(normalized)) return false;
  if (/\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b\.?\s+\d+/i.test(normalized)) return false;

  // Candidate provenance remains mandatory and list-only fame pages are not
  // sufficient. The model remains responsible for the actual identity claim.
  return urls.length > 0 && hasIndependentSource(urls);
}

function hasIndependentSource(sourceUrls: string[]): boolean {
  const urls = sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url)));
  return urls.length > 0 && urls.some((url) => !LIST_ONLY_SOURCE_PATTERNS.some((pattern) => pattern.test(url)));
}

export function isWellFormedPersonCandidate(candidate: Pick<DiscoveryCandidate,"name"|"sourceUrls">): boolean {
  const name = String(candidate.name ?? "").trim().replace(/\s+/g, " ");
  const words = name.split(" ");
  const normalized = name.toLowerCase().replace(/[.'’\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (words.length < 2 || words.length > 5) return false;
  if (!/^\p{L}[\p{L}.'’\-]*(?:\s+\p{L}[\p{L}.'’\-]*){1,4}$/u.test(name)) return false;
  if (words.some((w) => INVALID_PERSON_NAME_WORDS.has(w.toLowerCase().replace(/[.'’\-]/g, "")))) return false;
  if (INVALID_PERSON_NAME_PHRASES.some((p) => normalized === p || normalized.includes(` ${p} `) || normalized.startsWith(`${p} `) || normalized.endsWith(` ${p}`))) return false;
  if (/^state\s+st$/i.test(normalized)) return false;
  if (!words.some((w) => /^\p{Lu}/u.test(w))) return false;
  const sourceUrls = (candidate.sourceUrls ?? []).map(String);
  return sourceUrls.some((url) => /^https?:\/\/\S+$/i.test(url)) && hasIndependentSource(sourceUrls);
}

function parsePersonFindings(findings: DiscoveryFinding[]): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];
  const seen = new Set<string>();
  const add = (name: string, extra: Partial<DiscoveryCandidate>) => {
    const n = name.trim().replace(/\s+/g, " ");
    if (n.length < 3 || n.length > 120) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    const sourceUrls = (extra.sourceUrls ?? []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 6);
    if (!isWellFormedPersonCandidate({ name: n, sourceUrls })) return;
    if (!hasStrongIdentityEvidence({ name: n, role: extra.role, company: extra.company, basis: extra.basis, sourceUrls })) return;
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    seen.add(key);
    out.push({
      name: n,
      role: extra.role,
      company: extra.company,
      basis: extra.basis || "Public web discovery",
      sourceUrls,
      lane: extra.lane || "discovery-agent",
      confidence: sourceUrls.length ? .55 : .35,
    });
  };
  for (const f of findings ?? []) {
    // AgenticWebResearch explicitly labels findings by scope. Discovery admission
    // is semantic: only the model's candidate-scoped findings can become people.
    // Organization contact facts remain evidence for a later dig, never targets.
    if (f.scope !== "candidate") continue;
    const urls = (f.sourceUrls ?? []).filter((u) => /^https?:\/\//i.test(String(u)));
    if (f.personName && String(f.personName).trim().length >= 3) {
      add(String(f.personName), { role: f.role ?? undefined, basis: f.note || f.role || "Named on visited public page", sourceUrls: urls });
    }
    const value = String(f.value ?? "").trim();
    if (!value) continue;
    const m = value.match(/^person:\s*(.+?)(?:\s*\|\s*(.*?))?(?:\s*\|\s*(.*?))?$/i);
    if (m) {
      add(m[1]!, {
        role: (m[2] || f.role || "").trim() || undefined,
        company: (m[3] || "").trim() || undefined,
        basis: f.note || "person: finding from discovery dig",
        sourceUrls: urls,
      });
      continue;
    }
    if (/^related-person:/i.test(value)) {
      add(value.replace(/^related-person:/i, ""), { basis: "Related person from public filing/page", sourceUrls: urls });
    }
  }
  return out.slice(0, 30);
}

export async function runDiscoveryAgent(input: {
  jobId?: string;
  depth?: "fast" | "standard" | "deep";
  laneHint?: string;
  hardTimeoutMs?: number;
  onLiveStep?: (step: { action: string; tool?: string; query?: string; url?: string; status: "ok" | "error" | "active"; detail?: string }) => void;
}): Promise<DiscoveryAgentResult> {
  const jobId = input.jobId ?? `discovery_${Date.now()}`;
  const depth = input.depth ?? "standard";
  const requestedBatch = Math.max(1, Math.min(10, Number(process.env.APEX_DISCOVERY_BATCH_SIZE || "10")));
  const maxIterationsPerSlot = depth === "fast" ? 7 : depth === "deep" ? 18 : 14;
  const defaultSlotTimeout = depth === "fast" ? 75_000 : depth === "deep" ? 300_000 : 210_000;
  const suppliedTimeout = input.hardTimeoutMs ?? defaultSlotTimeout;
  const slotTimeout = Math.max(suppliedTimeout, defaultSlotTimeout);
  const aggregateTimeout = Math.max(slotTimeout * requestedBatch, 600_000);
  const batchStarted = Date.now();
  const span = publishDigSpan({ jobId, spanType: "stage", name: "discovery_agent", status: "active", agentName: "discovery", inputSummary: `depth=${depth} batch=${requestedBatch} lane=${input.laneHint ?? "model-choice"}` });

  const baseObjective = [
    "DISCOVERY ASSIGNMENT — find a real person worth a later public-contact dig.",
    "You are not researching a person supplied by the operator. You are choosing whom the bureau should investigate next.",
    "Act like a strong human open-web researcher with a limited research budget. Your first priority is information gain: find a concrete public story, business, ownership fact, transaction, filing, leadership page, trade publication, regional report, or other source that naturally exposes a NAMED PERSON.",
    "The objective is not to enumerate rich or famous people. Wealth is a relevance clue, not a discovery method. A realistic principal/operator with a public operating-company or intermediary surface is often a much better target than a billionaire or celebrity whose access is heavily protected.",
    "Prefer the kind of person a serious business researcher could plausibly reach through a company, adviser, professional association, regional business publication, transaction, family-office, foundation, conference, or other public/intermediary surface. Mid-market and upper-middle-market principals are often more useful than globally famous names. Do not assume that a very large net worth means a better contact result.",
    "Do not spend discovery iterations on Forbes/Bloomberg/richest/billionaire rankings, celebrity lists, generic HNWI lists, or similar fame enumerations. Those lists are low expected-value discovery because they optimize for fame rather than an attainable route. If search results contain such a list, use it only as incidental context and pivot to the underlying operating company, a named principal, an ownership story, a transaction, a regional business source, a family office, a foundation, a filing, or another concrete public surface. Do not walk the ranking.",
    "BAD DISCOVERY BEHAVIOR: starting with a billionaire ranking because it is easy to enumerate, repeatedly searching a generic phrase such as 'security issues', treating a title like 'chief executive officer' as a person, or hunting generic contact forms before a person is known.",
    "GOOD DISCOVERY BEHAVIOR: choose an information-rich angle that can reveal a specific person; inspect the source; pivot when it is generic, list-only, or inaccessible; corroborate the person's identity on a real public source; then stop or continue based on expected outreach value.",
    "Search results are leads, not conclusions. When a result looks plausibly useful — for example a concrete company story, acquisition, leadership article, ownership report, filing, or interview — prefer inspecting the strongest result before issuing another broad search. If the results are weak or generic, change direction instead. This is a judgment principle, not a mandatory hop.",
    "A promising company or transaction should trigger a question in your reasoning: who is the actual principal behind this? Use the evidence you just found to answer that question rather than abandoning the lead for a random broad search. Likewise, a named person is not automatically useful: prefer people with a plausible operating, ownership, investment, advisory, or intermediary context that could support a later public-contact investigation.",
    "Do not imitate any example query literally. These examples describe decision quality, not a scripted query sequence. You own query wording, source choice, pivots, tool choice, candidate order, and stopping point.",
    "A candidate is useful only when it is a real named individual supported by an exact HTTP(S) source. Prefer independent sources over list-only provenance. Do not invent a person from a snippet fragment, topic, product, company name, job title, sector phrase, or organization.",
    "If a company is discovered before its principal, that company is an intermediate lead. Use your judgment to find the actual named owner/founder/principal/operator on a public source. Do not admit the generic company/contact page as a person.",
    "Do not finish with done merely because the last search was inconvenient or noisy. A normal discovery pass should finish after finding a source-backed named person or after you have genuinely exhausted the promising directions available in the budget. If a promising result is in front of you, inspect it or pivot intelligently before stopping.",
    "Before every action, silently sanity-check the direction: (1) could this plausibly expose or verify a specific person? (2) if I find a person, is there a realistic public/intermediary surface worth a later dig? (3) am I following evidence or merely following fame/list availability? If the direction is weak, change it.",
    "Before finishing, ask yourself: do I have a full personal name, an exact source URL, and a concrete reason this person is plausibly reachable? If not, continue the investigation or finish with no candidate rather than manufacturing one.",
    "Use personName or value form: person: Full Name | role | company when possible.",
    input.laneHint ? `Optional lane context (not a script): ${input.laneHint}` : "",
  ].filter(Boolean).join("\n");

  const candidates: DiscoveryCandidate[] = [];
  const seen = new Set<string>();
  let totalSearches = 0;
  let totalVisits = 0;
  let degraded = false;
  let lastModel: string | undefined;
  let lastMessage = "";
  const batchHistory: string[] = [];

  try {
    for (let slot = 0; slot < requestedBatch; slot++) {
      if (Date.now() - batchStarted >= aggregateTimeout) break;
      const already = candidates.map((c) => c.name).join("; ");
      const recentBatchTrajectory = batchHistory.slice(-10).join("\n");
      const objective = [
        baseObjective,
        already ? `ALREADY SELECTED IN THIS BATCH — do not repeat these people; find a genuinely different principal/operator: ${already}` : "This is the first slot; choose the strongest promising person you can find.",
        recentBatchTrajectory ? `RECENT BATCH TRAJECTORY (context only — do not copy its actions; use it to avoid repeating dead ends):\n${recentBatchTrajectory}` : "No prior batch trajectory is available.",
        `This is batch slot ${slot + 1} of ${requestedBatch}. One strong, distinct candidate is sufficient for this slot. You may discover more if the evidence naturally reveals them, but do not pad the result with weak names.`,
      ].join("\n");

      const slotSpan = publishDigSpan({ jobId, spanType: "stage", name: "discovery_slot", status: "active", agentName: "discovery", inputSummary: `slot=${slot + 1}/${requestedBatch}` });
      try {
        const result = await runAgenticWebResearch({
          targetName: `Discovery — choose a realistically reachable principal (slot ${slot + 1}/${requestedBatch})`,
          companyName: null,
          objective,
          maxIterations: maxIterationsPerSlot,
          hardTimeoutMs: slotTimeout,
          jobId,
          onLiveStep: (step) => {
            try {
              spanFromLiveStep({ jobId, targetName: "discovery", tool: step.tool || step.action, label: step.query || step.url || step.action, detail: step.detail || step.query || step.url, status: step.status === "error" ? "error" : step.status === "active" ? "active" : "ok", agentName: "discovery" });
            } catch { /* spans best-effort */ }
            input.onLiveStep?.(step);
          },
        });
        totalSearches += result.searches ?? 0;
        totalVisits += result.visits ?? 0;
        lastModel = result.model || lastModel;
        lastMessage = result.error || result.status || "completed";
        batchHistory.push(...(result.trajectory ?? []).slice(-8));
        if (result.status === "unavailable" || result.status === "error") degraded = true;
        const slotCandidates = parsePersonFindings(result.findings ?? []);
        for (const candidate of slotCandidates) {
          const key = candidate.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(candidate);
          if (candidates.length >= requestedBatch) break;
        }
        try { completeDigSpan(slotSpan.id, { status: slotCandidates.length ? "ok" : "error", resultSummary: `slot=${slot + 1}/${requestedBatch} candidates=${slotCandidates.length} searches=${result.searches} visits=${result.visits}` }); } catch { /* best-effort */ }
      } catch (err: unknown) {
        degraded = true;
        lastMessage = err instanceof Error ? err.message : String(err);
        try { completeDigSpan(slotSpan.id, { status: "error", resultSummary: lastMessage.slice(0, 200) }); } catch { /* best-effort */ }
      }
      if (candidates.length >= requestedBatch) break;
    }

    const finalCandidates = candidates.slice(0, requestedBatch);
    try { completeDigSpan(span.id, { status: finalCandidates.length ? "ok" : "error", resultSummary: `candidates=${finalCandidates.length}/${requestedBatch} searches=${totalSearches} visits=${totalVisits}` }); } catch { /* best-effort */ }
    return {
      candidates: finalCandidates,
      model: lastModel,
      searches: totalSearches,
      visits: totalVisits,
      degraded,
      message: finalCandidates.length
        ? `Discovery agent proposed ${finalCandidates.length}/${requestedBatch} distinct source-backed people`
        : degraded
          ? `Discovery agent degraded: ${lastMessage}`
          : `Discovery agent finished with no source-backed person candidates`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: msg }, "[discovery-agent] failed");
    try { completeDigSpan(span.id, { status: "error", resultSummary: msg.slice(0, 200) }); } catch { /* ignore */ }
    return { candidates: [], searches: totalSearches, visits: totalVisits, degraded: true, message: `Discovery agent degraded: ${msg.slice(0, 180)}` };
  }
}
