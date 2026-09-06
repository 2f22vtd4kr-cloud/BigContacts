# Context — living handoff (Apex Atlas / BigContacts)

> **Provisional handoff — 2026-09-06.** This section consolidates the current operational state after the latest Replit repair cycle. Historical implementation batches remain in Git history; do not resurrect obsolete architecture because an old document mentions it.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Verified GitHub tip at handoff:** `c7e998fead754c84e63b0f845cb2211f29a07687`  
**Product:** Apex Atlas research bureau embedded in BigContacts. Bureau is the OSINT/research architecture, not a separate product.

## 1. What Apex is supposed to be

Apex is a model-directed research bureau.

```text
GEMINI
BOSS / PRIMARY ORCHESTRATOR
        |
        v
FREE-ReACT INVESTIGATION RUNTIME
        |
        +-- Investigator LLM capability
        |      Groq
        |      Mistral
        |      other legitimate configured Investigator adapters
        |
        +-- Research capabilities
               EXA / Tavily / Serper / SerpAPI / browser/fetch /
               scraping / registries / WHOIS/RDAP / identity tools /
               other ACTUAL repository capabilities
```

Critical distinction:

- LLMs are reasoning/decision capabilities.
- Search/browser/registry/scraping/etc. are research capabilities.
- They are technically distinct, but exposed inside the same Investigator environment.
- The Investigator model chooses the research trajectory.
- Deterministic code enforces safety, authorization, budgets, provenance, lifecycle and integrity.

### Canonical roles

| Role | Provider | Responsibility |
|---|---|---|
| Boss / Primary Orchestrator | **Gemini** | case direction, investigator assignment, final case gate |
| Right Hand Advisor | **DeepSeek V4 Flash** | advisory/oversight intelligence only |
| Investigator LLM | **Groq** | model-directed free-ReAct research |
| Investigator LLM | **Mistral** | model-directed free-ReAct research / transport fallback |
| Research tools | actual configured adapters | execute Investigator-selected actions |

DeepSeek remains special and MUST NOT enter the generic Investigator pool.

DeepSeek production contract:
- model: `deepseek-ai/deepseek-v4-flash-0731`
- endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- credential: `DEEPSEEK_API_KEY`
- temperature: `1`
- top_p: `0.95`
- max_tokens: `16384`
- reasoning_effort: `high`
- stream: `false`

Do not silently turn Gemini, DeepSeek or another non-Investigator model into a Dig fallback.

## 2. Non-negotiable architecture law

NEVER reintroduce:

- Groq → Mistral as a research sequence
- fixed search-provider ordering
- EXA → Tavily → Serper playbooks
- ranked provider preference lists that determine research intent
- `force_*` research hops
- scripted research trajectories
- hidden AI/search-router layers deciding what to research
- deterministic candidate discovery from arbitrary page text
- fabricated evidence or synthetic research observations

Groq/Mistral fallback is **transport/capacity fallback only**. The research trajectory remains owned by the Investigator.

The model owns:
- what information is missing;
- query construction;
- whether to search;
- which permitted research capability to invoke;
- whether to fetch a page;
- whether to pivot;
- whether evidence is sufficient;
- when to stop;
- remaining uncertainty.

Deterministic code owns:
- authorization;
- schema validation;
- tool safety;
- timeout;
- budgets/rate limits;
- persistence;
- provenance;
- lifecycle/cancellation;
- evidence validation;
- promotion integrity.

## 3. Canonical implementation locations

Primary Dig/ReAct loop:
`artifacts/api-server/src/src/lib/agentic-web-research.ts`

Bureau wrapper:
`artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`

Prompt/orientation:
`artifacts/api-server/src/src/lib/apex-bureau-orientation.ts`

Discovery:
`artifacts/api-server/src/src/lib/discovery-agent.ts`

Important guards:
- `scripts/check-no-force-dig.sh`
- `scripts/check-bureau-free-react.mjs`
- `scripts/check-discovery-quality.mjs`
- `scripts/check-agentic-runtime.mjs`
- `scripts/check-no-synthetic-data.sh`
- Reactor/live-integrity guards
- Redis budget/hardening audit

## 4. What has already been achieved

The repository has undergone a very large iterative build. The ~2,600 commits are construction history, not 2,600 required runtime components. Many commits are corrections, migrations, hardening, regression guards, documentation, CI work and experiments that were superseded.

Important completed architectural work includes:

- Gemini preserved as Boss.
- DeepSeek preserved as Right Hand.
- Groq/Mistral established as Investigator LLM capability.
- Boss-selected Investigator propagation into actual ReAct execution.
- Free-ReAct tool/action surface.
- Removal of forced research hops.
- Removal of deterministic EXA/Tavily/Serper research strategy.
- Provider-specific transport behavior separated from research intent.
- Model-selected discovery boundary.
- Rejection of generic title-shaped identities.
- Rejection of deterministic `proxy_table` candidate leakage.
- Exact HTTP(S) provenance requirements for discovery evidence.
- Live Reactor made activity/telemetry truthful rather than a fake numbered research pipeline.
- Empty/degraded/timeout/provider-failure states prevented from masquerading as successful research.
- Contact provenance hardened so generated search URLs cannot become evidence URLs.
- Card promotion/rehydration hardened against fabrication and empty-output fallback.
- API startup path repaired with an explicit API `start` script.
- Replit boot repaired to use `REDIS_URL_1` as `REDIS_URL` when appropriate and enable Redis on boot.
- Discovery/audit bounds made explicit for the bounded smoke.
- Blind independent baseline contract exists for later quality comparison.

These facts do **not** by themselves prove live research quality.

## 5. Latest Replit repair cycle — IMPORTANT

The latest Replit workspace started from a blank workspace and imported exactly:

`c7e998fead754c84e63b0f845cb2211f29a07687`

The workspace configured all 14 canonical secrets and installed dependencies successfully.

That workspace then found and repaired several remaining defects locally:

1. `apply-provider-gate-v2.mjs` still expected an obsolete `DIG_INVESTIGATOR_FAILOVER_CHAIN` / Groq→Mistral marker. It was minimally changed to recognize the current canonical Investigator lane without restoring old semantics.
2. `apply-investigator-provider-routing.mjs` was not idempotent. It was minimally changed to recognize the already-installed explicit provider contract.
3. Three serial API builds then passed and stabilized; later builds did not add additional canonical source mutations.
4. Full typecheck exposed Investigator propagation scope defects. The selected Investigator binding and case event callback were repaired minimally. Typecheck then passed.
5. The discovery hardening script was found to use a comment-only duplicate marker. A semantic guard was being repaired when the Replit session exhausted its quota.
6. The Redis audit script's historical TypeScript-in-`.mjs` parse defect had been repaired in the workspace.
7. The last message before quota exhaustion was that Redis was the remaining real runtime guard issue and the workspace was comparing the failure against the repository's own Redis hardening transform.

### Critical distinction

The local Replit repairs above were **not all necessarily pushed to GitHub** before the quota ended.

Therefore:

> **GitHub `main` is the source of truth. Do not assume the local Replit fixes exist in GitHub.**

At this handoff, GitHub `main` is confirmed at `c7e998fead754c84e63b0f845cb2211f29a07687`.

The next engineering session must first inspect `main` and determine which local repairs are already present. Do not blindly reapply patches.

## 6. Current real gate

The application is **NOT YET DECLARED DEPLOYMENT-READY**.

The remaining proof is not another architecture redesign. It is:

1. Confirm current GitHub main.
2. Import/build in a real Replit runtime.
3. Prove canonical build idempotence.
4. Prove typecheck.
5. Prove frontend build.
6. Prove database.
7. Prove Redis runtime + Redis audit.
8. Prove all architecture/no-fabrication/provenance guards.
9. Boot API on port 8080.
10. Verify `/api/healthz`.
11. Verify truthful provider availability.
12. Run the bounded discovery-first smoke only after all gates pass.
13. Require at least one genuinely model-emitted, named-person, visited-source admit.
14. Require a real free-ReAct Dig trajectory.
15. Require honest evidence/card outcome.
16. Only after that consider scaling toward the 10-target blind-comparison audit.

A static green architecture check is NOT equivalent to research-quality success.

## 7. Bounded smoke acceptance contract

The bounded smoke is an **exploration budget**, not a requirement to admit every slot.

Current intended proof:

- discovery exploration: 3 slots
- minimum acceptable real admits: 1
- research limit: 2
- one ReAct research loop at a time when provider capacity is constrained
- no fabricated target, person or evidence

A passing smoke requires:

`model-selected discovery`
→ `real named person`
→ `observed HTTP(S) source`
→ `source-backed admission`
→ `Groq/Mistral free-ReAct Dig`
→ `actual observations`
→ `honest card/evidence outcome`

AND:

- `bureauIntegrity` is not `critical`
- completed state is not degraded
- no provider collapse is being hidden
- source URLs are real
- the person is not a title-shaped identity
- the person was not generated by deterministic page-text extraction

Do not relabel historical failed runs as successes.

Historical failures included:
- Run `33411996869`: `Head of Marketing`, 0 contacts, provider collapse.
- Run `33420624242`: `Inclusion Recap`, `Inclusion A Business Case`, `Equity Interview Series Learn`, all produced through deterministic `proxy_table` leakage; 0 contacts; `bureauIntegrity=critical`.

Those runs are regression evidence, not success evidence.

## 8. Redis rules

Preserve Redis hardening.

DO NOT add:
- per-step heartbeat storms
- GET-after-SET verification
- repeated lock verification
- per-progress TTL refresh
- recursive Bureau log mirroring
- unnecessary Redis writes

One Redis is sufficient.

Canonical operational alias:
- `REDIS_URL_1` may supply `REDIS_URL` in Replit boot.

`DATABASE_URL` is provided by Replit Postgres and must NOT be requested or manually stored as a secret.

## 9. Canonical 14 Replit secrets

Configure these exact names through Replit Secrets:

```text
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
DEEPSEEK_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY
```

Never log or expose values.

Do not introduce:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
PERPLEXITY_API_KEY
BRAVE_SEARCH_API_KEY
FIRECRAWL_API_KEY
COHERE_API_KEY
NVIDIA_NIM_API_KEY
```

Do not request `WHOXY_API_KEY`.

## 10. Replit operational lessons

- Use the actual imported BigContacts Repl, not a project created from a vague “build Apex” description.
- A new Replit workspace is acceptable when a prior workspace is dead/quota-exhausted; it must import the GitHub repository and preserve the GitHub architecture.
- Run commands in the actual project Shell/API Server workflow, not detached Agent chat without runtime environment.
- One API workflow on port 8080.
- Frontend is the current `artifacts/apex-finder` build served by the actual application.
- Old ApexFinder Pro artifacts do not count.
- `ENABLE_AUTO_PIPELINE=false` unless the verification procedure explicitly enables a bounded run.
- If pnpm lockfile URLs point at a Replit-internal package host, only rewrite those firewall/proxy host URLs to `https://registry.npmjs.org/`; do not change package versions or invent dependency cuts.
- If install OOMs, use the repository's low-memory settings and `NODE_OPTIONS=--max-old-space-size=1536`.
- Never run concurrent source-mutating build transforms.
- Canonical transforms must be idempotent: build #1 may canonicalize; builds #2/#3 must be no-ops.

## 11. SETUP PROMPT FOR A NEW REPLIT WORKSPACE

When starting a fresh Replit workspace, paste the following operational prompt into the Replit Agent:

```text
APEX ATLAS — NEW WORKSPACE IMPORT, REPAIR, VERIFICATION AND DEPLOYMENT GATE

This is NOT a new application build.

Import the existing GitHub repository:
https://github.com/2f22vtd4kr-cloud/BigContacts

GitHub main is the engineering source of truth.

Before doing anything:
1. fetch origin/main;
2. record git status --short;
3. record git rev-parse HEAD;
4. checkout the current origin/main;
5. read docs/context.md completely;
6. read docs/REPLIT_NEW_ACCOUNT_SETUP.md;
7. read docs/RUN_BUREAU.md;
8. inspect the repository's actual package/build/audit scripts.

Do not scaffold Apex Atlas.
Do not create a replacement app.
Do not redesign the architecture.
Do not invent APIs or providers.
Do not run a real investigation before infrastructure gates pass.

Configure these exact Replit Secrets, without displaying values:
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
DEEPSEEK_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY

Do NOT request DATABASE_URL; Replit Postgres injects it.
Do NOT request WHOXY_API_KEY.
Do NOT introduce new provider credentials.

Install from the checked-in lockfile.
If the Replit package proxy has rewritten lockfile tarball hosts, repair only those host URLs to registry.npmjs.org. Do not change package versions.

Then perform the following gates SERIALly.

A. API build #1
B. API build #2
C. API build #3

Build #2 and #3 must not introduce additional source mutations.
If a transform expects an obsolete architecture marker, repair only its canonical/no-op detection. Do not restore old Groq/Mistral or search-provider research chains.

Then:
- full typecheck
- frontend production build
- database/schema verification
- Redis runtime verification
- Redis budget/hardening audit
- no-force-dig audit
- free-ReAct audit
- discovery-quality audit
- agentic-runtime audit
- no-synthetic-data audit
- Reactor/live-integrity audit
- provenance/evidence audit
- full tests

The architecture MUST remain:
Gemini = Boss
DeepSeek V4 Flash = Right Hand Advisor
Groq/Mistral = Investigator LLMs
Research services = Investigator-selected capabilities

There must be NO:
Groq → Mistral research strategy
EXA → Tavily → Serper forced order
fixed research playbook
force_* research hop
hidden search decision layer
synthetic evidence
provider substitution disguised as success

The Investigator owns the research trajectory.
Deterministic code owns safety, provenance, lifecycle, budgets, timeout and integrity.

Previous Replit work already repaired several transform/type/scope defects locally, but those fixes may not have been pushed. Compare current main against the actual source before applying anything. Do not blindly repeat old patches.

The latest previous session ended with:
- 3 serial API builds passing after local transform-idempotence repairs;
- typecheck passing after local Investigator/case-event scope repairs;
- Redis audit syntax repaired locally;
- discovery transform semantic idempotence repair in progress;
- Redis runtime/audit still the final known gate under investigation;
- Replit quota then exhausted.

Treat that as a handoff, NOT as proof that GitHub main contains all those repairs.

Once all static/runtime gates pass, boot the real API on port 8080 and verify /api/healthz.

Only then run ONE bounded discovery-first smoke if an authorized target is already supplied by the verification procedure.
Do not invent a target.
Do not fabricate a Bureau case.

Smoke acceptance:
- 3 discovery exploration slots
- at least 1 genuine named-person admit
- model-emitted finding
- observed HTTP(S) source
- no title-shaped identity
- no proxy-table/deterministic candidate
- real Groq/Mistral free-ReAct Dig trajectory
- actual observations
- honest evidence/card outcome
- bureauIntegrity not critical
- completed state not degraded

Do not scale to a 10-target run until the bounded proof passes.

If anything fails, repair the actual root cause minimally and rerun the relevant gate. Do not weaken the audit just to make it green. If an audit is stale and demands forbidden historical architecture, update the audit to test the current architecture rather than reintroducing obsolete behavior.

Report every unresolved issue as:
ISSUE #N
Severity:
Area:
Observed:
Expected:
Root cause:
Action:
Verification:

Do not claim READY FOR DEPLOYMENT until the application actually boots, health is real, Redis/database are healthy, all hard gates pass, and the bounded live trajectory is honest.
```

## 12. What the next ChatGPT workspace must do

The next ChatGPT is the engineering/reasoning authority. Replit is execution/deployment infrastructure.

The next ChatGPT must:

1. Read this `docs/context.md` before giving architectural advice.
2. Verify current GitHub `main` rather than trusting an old Replit transcript.
3. Distinguish committed GitHub fixes from local Replit-only fixes.
4. Never claim a fix is live until the GitHub commit proves it.
5. Continue the remaining Redis/idempotence/runtime verification work.
6. Do not redesign the Investigator architecture again unless a real source defect proves it necessary.
7. Preserve Gemini = Boss.
8. Preserve DeepSeek = Right Hand.
9. Preserve Groq/Mistral as Investigator LLM capability.
10. Preserve model-directed free-ReAct.
11. Preserve research-provider neutrality and transport-only fallback.
12. Preserve provenance/no-fabrication boundaries.
13. Treat the bounded 3-target smoke as the next meaningful research-quality gate.
14. After a successful bounded smoke, perform forensic trajectory review before scaling to 10 targets.
15. Then run the blind independent baseline comparison.
16. Only after that discuss true deployment readiness.

## 13. How to think about the remaining work

The project has moved beyond “build the architecture.” The architecture is substantially established.

The remaining work is **verification and evidence of actual operation**.

Do not spend another large cycle changing architecture merely because a static scanner or old audit expects historical behavior.

The key question now is:

> Can the current Apex runtime, with the real providers configured, perform a genuinely model-directed investigation, preserve the observations/provenance, and produce an honest useful result without deterministic research choreography?

That is the proof that matters.

A green TypeScript build is necessary.
A green architecture audit is necessary.
A healthy API is necessary.
Healthy Redis/database are necessary.
But none of those alone proves research quality.

The decisive evidence is a real, bounded, source-backed trajectory.

## 14. Final status at handoff

**STATUS: PRE-DEPLOYMENT / LIVE RESEARCH PROOF STILL REQUIRED**

GitHub main at handoff:
`c7e998fead754c84e63b0f845cb2211f29a07687`

The last Replit workspace exhausted its quota during final Redis/discovery-transform repair. Do not treat that workspace's local state as committed until verified against GitHub.

The next objective is not another rebuild.

It is:

**repair → verify → boot → bounded real trajectory → forensic review → blind comparison → deploy.**
