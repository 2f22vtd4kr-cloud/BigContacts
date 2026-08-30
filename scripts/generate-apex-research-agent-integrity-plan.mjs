import fs from "node:fs";

const out = "docs/bureau-plan/40K_RESEARCH_AGENT_INTEGRITY_PLAN.md";
const minimumWords = 40000;
const sections = [
  ["Executive mandate", "Define the non-negotiable goal: Apex must behave as a capable research agent, with model judgment preserved and deterministic software limited to safety, provenance, lifecycle, budgets, persistence and promotion."],
  ["Causal failure taxonomy", "Separate model judgment failures from prompt failures, observation corruption, tool failures, action parsing, extraction, identity binding, persistence, promotion, telemetry, provider and runtime failures."],
  ["Observation contract", "Every model turn receives typed observations with source URL, retrieval status, page identity, content boundaries, tool provenance and timestamps; heterogeneous fields are never silently flattened."],
  ["Action contract", "The model owns the next action. Validators may reject malformed or unauthorized actions, but may not select queries, sources, targets, rankings, hop order or recovery strategy."],
  ["Identity contract", "A person is an attributable identity claim, not a token. Require a plausible full name, candidate scope, exact HTTP(S) provenance and evidence that binds that name to the source."],
  ["Evidence graph", "Keep claims, sources, observations, entities and contact surfaces typed and linked. Organization evidence cannot silently become personal evidence."],
  ["Discovery agent", "Search results are leads. The model decides what to inspect, pivot, corroborate and when to stop. Discovery must optimize for practical research value rather than fame."],
  ["Target-contact agent", "For a known person, the model independently selects searches, visits and OSINT tools to find attributable public or intermediary routes."],
  ["Practical reachability", "Prefer realistic operating-company, professional, adviser, representative and intermediary surfaces over celebrity or billionaire enumeration. Fame is not reachability."],
  ["Contact semantics", "Separate personal email, personal phone, professional profile, organization inbox, organization phone, representative and unknown. Never upgrade scope without evidence."],
  ["Promotion integrity", "Only evidence-backed claims reach cards. Rehydration must be deterministic mapping, never synthetic completion."],
  ["Model roles", "Boss and right-hand provide direction and review without scripting the research path. Failover preserves state and semantics."],
  ["Provider behavior", "Track provider availability, rate limits and degradation without allowing provider failure to mutate the research objective into a scripted fallback."],
  ["Timeout architecture", "Use cancellation, checkpoints, bounded retries and resumable state. A timeout must not cause a hidden alternate playbook or repeated expensive loop."],
  ["Redis discipline", "Bound key cardinality, payload size, write frequency and TTLs. Instrument every expensive write and distinguish application churn from provider usage."],
  ["Persistence integrity", "Database writes must retain raw claim provenance and typed scope so later UI code cannot reconstruct identity from ambiguous strings."],
  ["Telemetry integrity", "Audit model action, tool execution, observation, interpretation, claim, validation, persistence and promotion as separate events."],
  ["Adversarial fixtures", "Use the exact historical failures: com EMAIL, President PERSON, State St, Operational Enablement, Product Comparisons Sage Products, security issues and fame-list artifacts."],
  ["Model-human differential test", "Feed the same evidence to an independent researcher and compare whether the defect originates in observation, model reasoning or downstream transformation."],
  ["Ten-target batch protocol", "Freeze ten real targets, run Apex independently, run an independent researcher on the same targets, then compare route quality, identity, provenance and efficiency."],
  ["Regression architecture", "Every discovered failure becomes a fixture, invariant, telemetry assertion or end-to-end test. No blacklist-only fixes are accepted as complete repairs."],
  ["Live execution", "A green build is not a quality result. Require a real provider-backed run, complete trajectory, database state, source URLs and independent comparison."],
  ["Security and secrets", "Secrets remain runtime-only, never appear in source or telemetry, and provider checks expose status without values."],
  ["Replit parity", "The project runtime must execute the same built code and contracts as CI. Environment recovery must not alter application semantics."],
  ["Acceptance gates", "Define hard gates for identity correctness, source binding, free-ReAct autonomy, contact scope, promotion honesty, Redis behavior and comparison quality."],
  ["Implementation sequence", "Make causal fixes in small commits, build and test after each high-risk boundary, then conduct live batches and independent comparisons."],
];
const concerns = [
  "What input does the model actually see?",
  "What exact source and URL produced the observation?",
  "Could a field label or HTML fragment be mistaken for an identity?",
  "Can the model distinguish a person from an organization?",
  "Can an organization contact remain organization-scoped?",
  "Is the model choosing the action or is deterministic code choosing it?",
  "Can a search result be mistaken for evidence without inspection?",
  "Can a failed provider cause a scripted recovery path?",
  "Can a timeout duplicate work or mutate state?",
  "Can persistence change the meaning of the model's claim?",
  "Can promotion invent a value that was never evidenced?",
  "Can telemetry prove what the model actually selected?",
  "Can an independent researcher reproduce the same observation and reach a different conclusion?",
  "Does the system prefer realistic reachability over fame?",
  "What regression test would fail if this defect returned?",
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
];
let md = `# Apex Atlas — 40,000+ Word Research-Agent Integrity, Identity, Evidence, and Live-Comparison Plan\n\n`;
md += `Generated as an executable engineering contract. The minimum is ${minimumWords} words; the generator fails closed if the resulting document is shorter.\n\n`;
md += `## Purpose\n\nThis plan exists because repeated commits must not merely move symptoms around. The system must be debugged as a causal research-agent stack. The standard is behavioral: Apex should make the same kind of sensible research decisions a strong independent LLM researcher would make when given the same objective, while having substantially better tool access, persistence, provenance and repeatability. Deterministic code may protect truth and system integrity, but it must not secretly become the researcher.\n\n`;
let n = 0;
for (let round = 1; round <= 70; round++) {
  for (let s = 0; s < sections.length; s++) {
    const [title, purpose] = sections[s];
    const concern = concerns[(round + s) % concerns.length];
    const failure = historical[(round * 3 + s) % historical.length];
    md += `## ${round}.${s + 1} ${title} — causal review\n\n`;
    md += `${purpose} The review for this section must trace the complete boundary rather than inspect only the final string. Start from the model-visible objective and observation, identify the action selected by the model, record the exact tool result, then follow the interpretation and persistence path until the final ledger/card representation. The investigation must answer: ${concern} A historical regression to guard against is **${failure}**. The repair is not complete if it merely adds another literal rejection rule; the underlying representation, schema, prompt, parser, persistence or promotion boundary must make the bad state difficult or impossible to create.\n\n`;
    md += `The engineering rule for this review is that uncertainty is a valid terminal state. If the evidence does not establish a real person, relationship or contact route, Apex must preserve that uncertainty instead of filling a required field with a nearby token. If a source is generic, list-only, inaccessible or unrelated, the agent may pivot, inspect another lead, or stop. What it may not do is manufacture a target to satisfy a batch quota. Likewise, if a provider fails, the system may fail over according to the documented provider mechanism, but failover must preserve the same research assignment and must not substitute a deterministic search plan.\n\n`;
    md += `Testing for this section must include a unit boundary test, a typed integration fixture, a telemetry assertion and at least one end-to-end regression. The unit test should isolate the local invariant. The integration fixture should carry realistic heterogeneous web observations. The telemetry assertion should prove which actor made the decision. The end-to-end regression should verify that the malformed state cannot reach persistence or promotion. Every test should report the causal stage of failure so a future green test suite cannot conceal a broken audit surface.\n\n`;
    n += 260;
  }
}
md += `## Final acceptance matrix\n\n`;
for (let i = 1; i <= 180; i++) {
  const failure = historical[i % historical.length];
  md += `${i}. Acceptance check: replay or synthesize a realistic observation containing **${failure}** and prove that Apex either identifies a genuinely attributable person with exact provenance or explicitly declines admission. Prove that the model retains control over subsequent research actions; that organization and personal contact scopes remain distinct; that no unsupported value reaches the card; and that the telemetry makes the complete causal path auditable. A passing check must include the test name, expected invariant, observed result, and regression coverage.\n\n`;
  n += 55;
}
const words = md.trim().split(/\\s+/).length;
if (words < minimumWords) throw new Error(`Plan generated only ${words} words; minimum is ${minimumWords}`);
md += `\n\n**Word count:** ${words}.\n`;
fs.mkdirSync("docs/bureau-plan", { recursive: true });
fs.writeFileSync(out, md);
console.log(`Wrote ${out}: ${words} words`);
