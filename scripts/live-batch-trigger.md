# Live Bureau batch trigger

Touch this file to intentionally launch the provider-backed Bureau proof audit on `main`.

This narrow path exists for the connected engineering harness because the repository's normal workflow remains manually dispatchable. It is not a product runtime trigger.

Current proof regime: bounded 3-target discovery-first exploration, with a minimum acceptance of 1 real investigator-promoted person. The strict audit must prove model-owned discovery, explicit investigator promotion, HTTPS source-backed admission, free-ReAct target research, honest contact provenance, and the absence of deterministic promotion shortcuts.

This trigger follows the discovery completion-contract repair: discovery investigators must not treat deterministic FINDINGS SO FAR as a substitute for an explicit promotion finding, and web-search provider choice may be model-selected when useful.

Last intentional production-candidate audit trigger: 2026-09-25T21:04+03:00 (rerun after aligning the agentic-runtime contract with the canonical provider-backed audit path).

Follow-up verification trigger: 2026-09-21, final runtime-hardening verification after provider-gate, provenance, durability, deadline, and CI-audit repairs.

## Independent live-run fallback trigger — 2026-10-25 (UI-default settings)

This file change intentionally triggers `.github/workflows/apex-canonical-runtime-proof.yml` to execute the real canonical API in an isolated GitHub Actions runner with PostgreSQL + Redis. It is provider-backed rather than scripted/mock, but it does not connect to Replit's persistent database; it is a fallback proof path, not proof of persistence in the user's Replit workspace. The launch request now matches the normal UI defaults exactly: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`. For credential naming compatibility, role-specific Groq secrets take precedence and fall back to `GROQ_API_KEY` / `GROQ_API_KEY_N` aliases if those are configured; key values remain in encrypted GitHub Actions secrets and are never placed in the repository. A successful conclusion is not enough: do not report a card unless uploaded runtime artifacts prove a durable admitted person card with source evidence and the same card is retrievable through the run's API projection. Append the exact run ID, terminal job state, admitted card/evidence counts, source URLs, and API projection result to the visible sequential audit.


## Follow-up canonical runtime proof retry — provider correction and prompt recovery

This touch intentionally starts another real canonical API run on `main` with the standard UI request (`targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`). The previous live attempt reached real Groq and external search/fetch providers but terminalized with zero admitted candidates and no card. The source now has targeted recovery guidance for invalid `browser_fetch` providers and a bounded fallback prompt when structured intelligence-context formatting throws. The Investigator still chooses actions dynamically; the source fix does not relax evidence or admission rules. Only durable card/source evidence and independent API-projection retrieval count as success.

## Canonical proof after evidence-gated review-card projection and exact UI body — 2026-10-25T10:41:00Z

Trigger one isolated, genuine canonical Apex Atlas run against the current main code. The preceding run (job 1839ef8a-49fa-47df-a004-016447ef8949 in workflow 40183010170) reached the real model-led discovery loop but failed at the Investigator iteration ceiling with zero findings and zero entities/cards. Subsequent main commits added bounded provider-action recovery, resilient Investigator context formatting, evidence-gated projection of canonical PersonCandidate admissions into the research-leads dashboard, and explicit promotion metadata on reused evidence. This run must use the exact UI-default launch body only: targetCount=3, researchDepth=standard, targetTimeoutMs=420000. Do not seed targets or data. Verify health, actual persisted entity/evidence counts and dashboard research-leads projection from the same run, then append the job ID, terminal state, tool/source evidence, durable IDs and result to the starred audit. Success requires at least one newly materialized, source-bound review card, a linked identity_candidate evidence row bound to the exact case/job/supporting event, and that same card returned by the API projection. Do not weaken gates or count a search lead/model assertion as a card.


## Canonical live retry after provider-failure circuit-breaker merge — 2026-10-25

This intentional trigger reruns the unmocked canonical Atlas UI-default path after merge of PR #742, which records repeated invalid search-provider responses per Investigator trajectory and prevents repeated calls to a non-retryable failing provider. Preserve the model-owned Boss → Right-hand → Investigator flow and the existing source-backed admission requirements. Requested settings remain `targetCount=3`, `researchDepth=standard`, and `targetTimeoutMs=420000`. The run is successful only when its artifact contains a durably admitted source-backed person card and an API projection of that same card, with terminal job state and released active-job lock. Do not seed/fabricate a card or claim success from a green workflow alone.


## Canonical live retry after discovery prompt syntax repair — 2026-10-25

This trigger follows the prompt-budget recovery commit and the CI-discovered TypeScript syntax defect caused by unescaped quotes around the literal case label in the discovery guidance. The source now escapes that literal; the next workflow run must compile and execute the actual canonical API using the UI-default body only: targetCount=3, researchDepth=standard, targetTimeoutMs=420000. Keep the real Boss → Right-hand → Investigator loop, public-source research, strict evidence admission, durable writes, and projection verification. A green build or job launch is not card success. Count success only after the same run proves a newly persisted source-backed person card, linked source evidence, and API projection retrieval of that same card. Do not seed targets or fabricate cards.


## Canonical live retry after bounded Boss token-window recovery — 2026-10-25

The preceding real API run launched correctly but the Boss control-plane request failed with an observed Groq token-window 429: `upstream_token_window_wait_exceeded`. The failure was not an evidence/admission issue and must not cause role substitution or fabricated output. Main now extends bounded same-model token-window recovery to 120 seconds within the existing 180-second overall Boss deadline, while retaining fail-closed behavior beyond that bound; regression coverage includes a 46-second reset retry and a 121-second fail-closed case. Run the exact UI-default body (`targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`) against the latest `main`. Verify persisted source evidence and matching card projection; do not seed data or count an incomplete run as success.


## Canonical live retry after same-capability Boss model fallback — 2026-10-25

The previous UI-default run failed before discovery because the Groq Boss request returned a token-window wait beyond the decision deadline. The latest fix keeps the token-window failure distinct from hard quota, but proceeds to the next configured model within the Boss control-plane capability and then the next configured credential; it never substitutes a different bureau role. The prompt-composition emergency fallback also now retains the mandatory action/output contract without aborting on oversized durable history, and generic case labels are excluded as target anchors. Execute the exact UI-default launch body only: targetCount=3, researchDepth=standard, targetTimeoutMs=420000. Verify the real Boss → Right-hand → Investigator path, actual evidence/card persistence, and same-run API projection retrieval. A run is not successful without a newly admitted, source-bound person card.

## Canonical live retry after Right-hand contract-format recovery — 2026-10-25

The latest canonical run passed Boss and stopped during the independent Right-hand opening review because the model response did not satisfy the task-specific approval contract. The validator remains authoritative: malformed approval, out-of-range confidence, extra fields, or invalid field lengths are still rejected. The Right-hand transport now retries once in JSON-object mode after a schema-valid response fails that contract, then continues only through the existing bounded same-role model fallback. This changes formatting recovery, not approval criteria or bureau role boundaries. Launch with the exact UI-default settings only (targetCount=3, researchDepth=standard, targetTimeoutMs=420000); verify durable source-backed person card and same-run API projection before claiming success.

## Canonical retry with distinct configured Investigator fallback — 2026-10-25

The last canonical run proved the Boss and Right-hand can complete, then the selected Investigator credential returned explicit `upstream_token_quota_exhausted`. The runtime correctly refused to fabricate a finding but could not continue because only one distinct Investigator credential was configured in the workflow. The workflow now exposes a distinct backup credential slot using the configured Boss Groq key only if no dedicated investigator backup secret is set; the bureau still assigns the replacement as an Investigator capability and Boss must explicitly select it. Credential alias detection prevents treating identical keys as independent capacity. The Right-hand contract recovery also retries once in JSON-object mode while preserving its validator. Run the exact UI-default launch (`targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`), and only credit a source-backed card if the same-run API projection returns it with supporting evidence IDs.

## Canonical retry after bounded Right-hand format repair — 2026-10-25

The previous run's Right-hand opening review failed its exact structured approval contract after bounded model attempts. The caller's validator remains authoritative; the retry now explicitly asks the same model to repair format/field bounds and then tries the configured same-role fallback. The next canonical run must also exercise the distinct Investigator fallback credential if the primary Investigator reports explicit tokens-per-day exhaustion. Do not infer success from a green build: use the exact UI-default launch and verify at least one persisted, source-backed person card and retrieval of that same card from the run's API projection.

## Canonical retry after strict Right-hand JSON normalization — 2026-10-25

The prior run still stopped before discovery at the Right-hand opening-review contract. The latest transport normalizes only JSON serialization when the model wraps a JSON object in Markdown fences; the parsed object must still pass the exact approval validator, with no field/value inference or relaxed admission. The same-role format-repair retry remains bounded. Use exact UI defaults and require a persisted source-backed person card plus same-run API projection retrieval.

## Canonical retry after expanding distinct Investigator credential fallbacks — 2026-10-25

The latest real run passed the Boss and Right-hand gates, entered Investigator discovery, and then stopped on explicit tokens-per-day exhaustion for `groq-investigator-1`. The prior fallback wiring did not yield a distinct credential after fingerprint-based alias exclusion. The workflow now offers the configured Right-hand and Boss Groq credentials as fallback credential slots only when dedicated Investigator alternate secrets are absent; the Investigator role and Boss-directed reassignment contract remain unchanged, and duplicate credentials are still excluded. Launch with UI defaults and verify durable card/evidence plus API projection; do not count a provider fallback alone as success.

## Canonical retry after explicit Investigator fallback-slot wiring — 2026-10-25

The last run reached the actual Investigator, which reported explicit tokens-per-day quota exhaustion; the run then stopped without a card. The workflow now declares additional Investigator capability slots directly backed by the configured Right-hand and Boss Groq credentials if separate Investigator alternate secrets are absent. The registry still deduplicates identical credential fingerprints and the Boss must explicitly select a distinct available Investigator capability; this does not change model role, research strategy, or evidence admission. A successful run must show the selected alternate in the trajectory, real searches/fetches, an admitted source-backed person, persisted evidence, and the same card returned by the API projection.

## Canonical retry after workflow credential-slot validation — 2026-10-25

The previous fallback wiring accidentally duplicated two workflow environment keys, causing GitHub to reject the workflow before it could launch Apex. The duplicate mappings have been removed and each Investigator credential slot is now declared exactly once. The next run must verify those slots are actually populated and that credential fingerprinting leaves at least one distinct alternate after an Investigator tokens-per-day failure. Proceed with the exact UI-default launch and count success only when a source-backed person card and linked evidence are persisted and the same card is returned by the API projection.

## Canonical retry with Boss-selected GPT-OSS 20B Investigator capability — 2026-10-25

Repeated canonical launches show that the single configured Groq credential pool has exhausted the 120B model's tokens-per-day budget before any discovery action. The runtime now exposes a distinct, explicit `groq-investigator-20b` capability bound to the configured Investigator credential and routed only to GPT-OSS 20B. Boss must select this capability through the existing durable reassignment decision; the runtime does not silently rotate models. Credential-slot aliases remain deduplicated, while model-scoped token-capacity recovery can choose the other model. Launch with UI defaults and verify real search/fetch actions, a source-bound person candidate, durable card/evidence persistence, and same-run API projection retrieval.

## Canonical retry with explicit model-capacity alternate list — 2026-10-25

The previous run's Boss-directed token-capacity recovery did not choose a valid distinct alternate despite the explicit GPT-OSS 20B model capability being present. The reassignment prompt now includes the runtime-computed allowed alternate list and requires Boss to choose exactly one from it; the 20B capability maps to the same configured Investigator credential but a separate model-specific token budget. The safety contract is unchanged: no silent model rotation, no fabricated evidence, and the alternate is accepted only after Boss selection and runtime validation. Execute UI-default launch and verify a persisted source-backed person card plus its API projection.
