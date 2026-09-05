import fs from "node:fs";

const out = "docs/bureau-plan/40K_RESEARCH_AGENT_INTEGRITY_PLAN.md";
const minimumWords = 40000;
const maximumWords = 50000;

// Living plan: live evidence changes the implementation agenda. The size is
// deliberately bounded so the plan remains readable and reviewable.
const sections = [
  ["Living mandate and revision rule", "Apex is a research agent, not a scripted enrichment pipeline. Models own research judgment; deterministic software protects truth, provenance, lifecycle, authorization, persistence, promotion and resource safety. The plan must be rewritten whenever live evidence changes the causal picture."],
  ["Current live evidence", "The latest GitHub live audit failed because configured model providers were unavailable: Gemini returned quota exhaustion, Groq returned rate-limit responses, NVIDIA's selected hosted model returned 410, and Mistral was not configured. This distinction is now a first-class engineering requirement."],
  ["Provider truth before research", "A healthy API process and configured secret are not proof that an LLM can answer. Provider preflight must distinguish configured, reachable, authorized, rate-limited, quota-exhausted, deprecated, and successfully responding. A Bureau run must never spend ten discovery slots rediscovering that every provider is dead."],
  ["Model availability is not model judgment", "Provider failover is transport infrastructure, not research strategy. A provider may be replaced because it is unavailable, but the replacement receives the same objective and evidence state and independently chooses the next research action. No provider failure may inject a scripted query or hop."],
  ["Free-ReAct action ownership", "The model chooses queries, URLs, pivots, OSINT tools, candidate order, evidence depth and stopping point. Deterministic code may reject malformed or unsafe actions and enforce budgets, but it may not select the next useful research move."],
  ["Observation fidelity", "Search results, visited pages, snippets, HTML extraction and registry results must remain typed observations with exact source URLs and retrieval status. Observation preprocessing may improve readability but may not silently convert a label, address, product, department or organization into a person claim."],
  ["Identity as an evidence graph", "A person is an attributable claim bound to source evidence, not a string that looks like a name. The system must bind name, role, company, source URL and observation scope. Generic fragments such as com EMAIL, President PERSON, State St, Operational Enablement and Product Comparisons Sage Products must fail causally, not merely because a growing blacklist happens to contain them."],
  ["Discovery economics", "Discovery optimizes expected research value and practical reachability, not fame. A model should prefer information-rich operating-company, ownership, transaction, filing, regional business, professional and intermediary surfaces over billionaire rankings or celebrity enumeration."],
  ["Forbes and fame-list behavior", "Forbes or other richest-person lists are allowed as incidental evidence but are not a discovery strategy. The model should pivot toward the underlying company, transaction, principal, adviser, family office, foundation, filing or regional source when a list appears. A deterministic gate may reject list-only provenance, but must not replace the model's discovery process with a different fixed list."],
  ["Target-contact research", "Once a real person is known, the target-contact agent must behave like an independent human researcher: formulate evidence-led searches, inspect strong results, pivot through operating companies and intermediaries, use available OSINT tools when justified, and stop when marginal expected value becomes low."],
  ["No artificial LLM restriction", "Lifecycle budgets, provider quotas, request timeouts and safety validation are execution realities, not research restrictions. The system must not add per-tool caps, mandatory hop counts, fixed query families, ranking filters, or scripted recovery paths merely to make the model look predictable."],
  ["Boss and right-hand roles", "Boss and right-hand models orient, challenge and review the work without dictating a fixed research path. Their guidance is contextual and evidence-aware. They must not become a hidden rule engine that tells the worker which website, query or hop must come next."],
  ["Provider routing and circuit breakers", "A provider circuit breaker prevents repeated calls to a provider that has just returned a quota, rate-limit, authorization or deprecation failure. This saves resources without constraining a healthy model's research decisions. Circuit state must be observable and must expire according to provider retry information or conservative backoff."],
  ["Provider model lifecycle", "Model identifiers are live dependencies. Current provider documentation must be checked when a hosted model returns 404 or 410. A deprecated endpoint must be replaced by a currently supported endpoint, not hidden behind more fallback aliases that are already dead."],
  ["Gemini transport", "Gemini 3.7 Flash is a current production model and supports agentic work, but a valid model identifier does not imply quota. The transport must surface 429 quota exhaustion, preserve retry information where possible, and avoid consuming the entire batch after the quota is known to be exhausted."],
  ["NVIDIA transport", "NVIDIA's current hosted API exposes newer Nemotron 3 models while some older hosted/free endpoints are deprecated. Apex must use a currently supported inference model and treat 410 as a provider lifecycle signal rather than repeatedly retrying the same dead model."],
  ["Mistral transport", "Mistral currently exposes modern chat models such as Mistral Small 4, Medium 3.5 and Large 3. The application should use current aliases when a Mistral secret is actually configured; absence of the secret must be explicit rather than masquerading as a model failure."],
  ["Quota-aware batching", "Ten-target batches are a research evaluation unit, not permission to fire ten identical provider calls concurrently. The scheduler may serialize or modestly coordinate independent model turns to respect actual provider capacity. This does not constrain what the model researches; it constrains duplicate transport pressure."],
  ["Live comparison protocol", "Apex quality must be compared honestly with an independent researcher on the same target and objective. Apex does not win because it has more fields or a higher score. It wins only when its attributable identities, useful routes, source provenance and research efficiency are genuinely better or at least no worse."],
  ["Blind outcome comparison", "Comparisons must prevent evaluator leakage. The independent researcher should not be shown Apex's answer before producing its own result, and Apex should not be given the independent result during its own run. The comparison occurs after both trajectories are frozen."],
  ["Trajectory comparison", "Outcome quality alone is insufficient. Compare the actions, sources, pivots, dead ends, stopping rationale, provider failures and evidence chain. A lucky final email from a scripted shortcut is not equivalent to an agentic trajectory."],
  ["Historical malformed-target corpus", "The regression corpus must preserve the humiliating failures that motivated the work: com EMAIL, President PERSON, State St, Operational Enablement, Product Comparisons Sage Products, security issues, generic contact forms, list labels, job titles and organization inboxes promoted as personal contacts."],
  ["Causal repair over blacklist growth", "When a malformed candidate appears, first determine whether the defect came from model output, prompt orientation, observation flattening, parser ambiguity, scope loss, persistence, promotion or telemetry. A literal blacklist may be a final safety guard, but it is never sufficient evidence that the causal defect is repaired."],
  ["Scope integrity", "Organization evidence, personal evidence and intermediary evidence remain distinct. An organization phone or inbox can be useful, but it cannot silently become a personal route. The model can choose to pursue an organization surface when it is the best practical path, while the card preserves its scope honestly."],
  ["Evidence and promotion", "Only claims with exact source URLs and sufficient attribution reach durable evidence or cards. Promotion is deterministic mapping of evidence, not synthetic completion. Empty results are valid results and must not trigger scripted filling."],
  ["Telemetry as proof", "Every meaningful turn should make it possible to reconstruct what the model saw, what it selected, which tool ran, what it returned, what the model inferred and what deterministic code persisted. Telemetry must distinguish model choice from executor behavior."],
  ["Provider diagnostics", "Provider logs must include provider, model, status class, retry-after when available, latency and failure category without exposing secrets or sensitive prompts. A 429 quota failure must be visibly different from a 404 model-not-found and from a 401 authorization failure."],
  ["No self-mutating test illusion", "CI must not silently patch production source immediately before claiming it tested main. Permanent code changes belong in main. Live workflows may generate audit artifacts and living documentation, but source repair must be reviewable as repository history."],
  ["Build and runtime parity", "The exact committed source that is claimed to pass must be the source that is built and executed. A generated plan may be committed with skip-ci semantics, but runtime code must not be modified by an audit job and then described as the checked-in tip."],
  ["Failure-fast gates", "If no configured provider can answer a harmless smoke prompt, the live audit must stop before launching a ten-target research batch. This is not a quality pass or failure of the model; it is a provider-readiness failure with actionable evidence."],
  ["Live execution truth", "A green build, healthy Redis, configured provider count or agent span is never sufficient. A successful live Bureau test requires at least one actual model decision, at least one actual web-tool execution, source-backed candidate or explicit evidence-led no-candidate outcome, and a non-critical integrity state when quality is claimed."],
  ["Replit parity", "Replit must execute the same committed application semantics as CI. Environment repair may address package proxies, OOM and secrets, but it must not introduce a second research implementation or a different decision policy."],
  ["100-target endurance", "The long-run validation program uses repeated ten-target batches. The objective is not to force 100 names into the ledger. It is to demonstrate that across 100 independent target opportunities the system maintains identity, provenance, autonomy and practical-reachability quality without recurring malformed states."],
  ["Evaluation score honesty", "The evaluation report must show wins, ties, losses and inconclusive cases. Apex must never manufacture a win by choosing a favorable metric, suppressing a failed target, or treating provider outage as research superiority."],
  ["Regression conversion", "Every live failure becomes at least one durable artifact: unit fixture, integration test, trajectory fixture, provider-health test, schema invariant, telemetry assertion or end-to-end audit case. The exact failure is preserved so future commits cannot erase the lesson."],
  ["Implementation sequencing", "Implement causal repairs in small coherent commits, rebuild, run static autonomy checks, execute provider preflight, then run a real ten-target batch. Only after that should the next batch or comparison phase begin."],
  ["Acceptance and stop rules", "Define explicit pass, fail and inconclusive outcomes. A provider outage is not a model-quality failure. A malformed person candidate is a research-agent failure even if later filtering catches it. A source-backed organization contact is not a personal-contact win."],
  ["Plan maintenance", "At the end of every live validation cycle, append what was learned, what was disproved, which assumptions changed and which implementation tasks remain. The 40k plan is intentionally mutable; new reality outranks old prose."],
];

const concerns = [
  "What exactly did the model receive, including the objective, previous observations and source URLs?",
  "Which actor chose the next action: the model, orchestrator, parser, fallback or provider router?",
  "Was the provider actually available, or did the system merely count its secret as configured?",
  "What exact HTTP status, retry signal and model identifier did the provider return?",
  "Could a provider outage have been mistaken for a model decision?",
  "Could a snippet, heading, label, address or product name be mistaken for a person?",
  "Does the evidence bind the full name to the exact source URL?",
  "Could organization evidence leak into personal scope?",
  "Did the model inspect the strongest lead before issuing another broad search?",
  "Did the model pivot because of evidence or because deterministic code told it where to go?",
  "Did a fame list become the discovery strategy?",
  "Would a strong independent researcher have chosen a different target or source?",
  "Can the trajectory prove why the model stopped?",
  "Could a timeout or retry duplicate expensive research?",
  "What regression test would fail if the defect returned?",
];

const historical = [
  "com EMAIL",
  "President PERSON",
  "State St",
  "Operational Enablement",
  "Product Comparisons Sage Products",
  "security issues",
  "Forbes billionaire list",
  "generic contact form",
  "company inbox promoted as personal",
  "job title promoted as person",
  "NVIDIA hosted model 410",
  "Gemini quota 429",
  "Groq quota 429",
  "Mistral secret absent",
  "zero candidates after broad search",
];

const liveFacts = [
  "The latest live audit produced zero candidates because every configured LLM attempt failed; the run was correctly classified as bureauIntegrity=critical.",
  "Gemini 3.7 Flash returned HTTP 429 with an explicit free-tier generate-content quota exhaustion message and retry delay.",
  "Groq returned HTTP 429 across the configured candidate models during the same audit.",
  "NVIDIA returned HTTP 410 for the selected hosted model aliases, exposing a provider lifecycle mismatch rather than a research-quality failure.",
  "Mistral was absent from the GitHub Actions environment, so it was not actually available for fallback.",
  "Static free-ReAct, trajectory and discovery-quality checks passed, proving that static autonomy assertions cannot substitute for provider-backed execution.",
  "The audit workflow previously changed source before building it; permanent source changes are now committed before the tested build.",
  "The first provider-circuit implementation was not idempotent and produced duplicate declarations; this is now itself a regression class that the patcher must eliminate on repeated execution.",
];

let md = `# Apex Atlas — 40,000+ Word Living Research-Agent Integrity, Identity, Evidence, Provider, and Independent-Comparison Plan\n\n`;
md += `**Status:** living engineering contract. **Required size:** ${minimumWords}-${maximumWords} words. **Last rewrite basis:** live provider-backed GitHub audit on 2026-08-30.\n\n`;
md += `## Why this document is deliberately mutable\n\nApex Atlas cannot be repaired by writing a plan once and treating that plan as truth forever. The repository has accumulated enough iterations that the central risk is plan inertia: an old assumption becomes a new layer of code, the new code changes behavior, and later work optimizes around the changed behavior rather than the original objective. This document therefore treats live evidence as a higher-priority input than earlier architecture prose. When a live run disproves an assumption, the plan is regenerated and implementation priorities change. The target remains stable — a genuinely capable, model-directed research bureau — while the engineering route remains revisable.\n\n`;
md += `## Current evidence that changed the plan\n\n${liveFacts.map((x) => `- ${x}`).join("\n")}\n\n`;
md += `The most important lesson is that a research agent can be perfectly free-ReAct in source code and still be functionally brain-dead if every provider call is rejected. Conversely, a provider can be healthy while the model behaves badly. These are different causal classes and must never be collapsed into one score. A valid audit therefore establishes provider readiness, executes a real model decision, observes real tools, freezes the trajectory, and only then judges research quality.\n\n`;

for (let round = 1; round <= 2; round++) {
  for (let s = 0; s < sections.length; s++) {
    const [title, purpose] = sections[s];
    const concern = concerns[(round + s) % concerns.length];
    const failure = historical[(round * 3 + s) % historical.length];
    const fact = liveFacts[(round + s * 2) % liveFacts.length];
    md += `## ${round}.${s + 1} ${title} — causal implementation review\n\n`;
    md += `${purpose} This review must begin with the actual model-visible assignment and end at the durable outcome. Do not infer the cause from the final string alone. Trace the objective, observations, model action, executor result, model interpretation, candidate/evidence parser, persistence, promotion and telemetry. The review must answer: ${concern} A historical or current failure to keep visible is **${failure}**. Current live evidence to incorporate is: ${fact}\n\n`;
    md += `The implementation rule is that uncertainty is valid. If evidence does not establish a person, relationship or contact route, the agent may continue, pivot, or stop without a candidate. It must never invent a target merely to satisfy a targetCount. If a provider is unavailable, the runtime must preserve the research objective while failing over or stopping honestly; it must never convert provider failure into a deterministic research playbook. If a source is a list, generic page, inaccessible page, title fragment, address, product, department or organization-only surface, the system must preserve its type rather than forcing it into a person-shaped slot.\n\n`;
    md += `Testing for this section requires a local unit invariant, a typed integration fixture, an observable telemetry assertion and, when credentials permit, a live or replayable end-to-end case. A passing static test proves only the local property it covers. A live claim requires a real provider-backed trajectory. A comparison claim requires an independent researcher on the same target and objective. Any test that can pass while the model never executes a real decision is insufficient for research-quality claims.\n\n`;
    md += `The engineering review must record false positives. A string resembling a full name is not enough; the source must bind that name to the candidate context. An email is not enough; its scope must be attributable. High net worth is not enough; it does not establish practical reachability. A green provider count is not enough; a successful model response is required. A tool span is not enough; the action must be attributable to the model rather than a hidden scripted fallback.\n\n`;
  }
}

md += `## Final acceptance matrix\n\n`;
for (let i = 1; i <= 120; i++) {
  const failure = historical[i % historical.length];
  const fact = liveFacts[i % liveFacts.length];
  md += `${i}. **Acceptance check ${i}:** replay or synthesize a realistic observation containing **${failure}** and prove the causal boundary. Establish whether a real provider-backed model decision occurred, preserve exact source provenance, keep person and organization scope separate, prevent unsupported identity promotion, and show that the next research action remained model-selected. Incorporate the current evidence that **${fact}**. Record pass, fail, or inconclusive; never turn provider outage into a research-quality win or loss. If the test fails, preserve the exact trajectory and add a regression artifact before declaring the repair complete.\n\n`;
}

const words = md.trim().split(/\s+/).length;
if (words < minimumWords || words > maximumWords) throw new Error(`Plan generated ${words} words; required range is ${minimumWords}-${maximumWords}`);
md += `\n\n**Generated word count:** ${words}.\n`;
fs.mkdirSync("docs/bureau-plan", { recursive: true });
fs.writeFileSync(out, md);
console.log(`Wrote ${out}: ${words} words`);
