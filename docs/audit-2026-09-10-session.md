# Forensic audit — 2026-09-10

## Session progress

- Retired the known legacy deterministic enrichment mutation routes at the API boundary. They now return HTTP 410 rather than entering alternate research lanes.
- Kept the generic `/enrich/*` compatibility surface scope-checked for explicitly non-Apex maintenance until each endpoint is separately retired.
- Fixed the canonical agentic source-parity gate: after the SSRF wrapper/core split, the gate was still reading the wrapper file and therefore failed before build/typecheck. It now inspects `agentic-web-research-core.ts` and verifies the wrapper mounts that core.
- Moved the legacy Apex mutation guard immediately after the public health router so it wraps both `ingestRouter` and `extendedOsintRouter`. Previously `/enrich/*` extended-OSINT routes were mounted after the guard and could bypass it.
- Strengthened the legacy mutation static gate to require that global placement.
- Added a frontend API-auth audit artifact and a non-wired regression probe. The shared client exposes `setAuthTokenGetter`, but no application registration was found; the server bearer secret must never be shipped in a browser bundle.
- Corrected architecture checks to inspect canonical source after the duplicate-tree/wrapper split and added explicit free-ReAct/Target-Investigator context assertions to the unified gate.
- Hardened the Target Investigator leaf: `runTargetContactAgent` now refuses context-free execution. Legacy/internal callers without a mounted durable `contextDocument` fail closed instead of starting a second context-free research control plane.
- Added `scripts/check-target-agent-context-boundary.mjs` and wired it into the root Bureau check. The unified Investigator gate independently verifies the canonical single-target runner mounts the context.
- Traced the remaining direct `runTargetContactAgent` callers: canonical single-target passes durable context; the legacy Atlas orchestrator does not and will now fail closed at the Target Investigator boundary. This is intentional containment while legacy Atlas reachability is retired.
- Audited the canonical Atlas batch discovery path and confirmed a separate context-continuity defect: `runCanonicalAtlasPipeline()` invokes its initial `Discovery slot` Investigator without a `caseId`, unlike the canonical case-discovery route. Issue #130 tracks creation/reuse of a durable discovery case and persistence of that discovery trajectory before target cases exist.
- Confirmed the current canonical provider boundary is already explicit: missing `web_search.provider` is rejected/visible rather than silently mapped to a provider. The remaining #120 autonomy defect is the forced initial `web_search` observation, not the provider omission path.
- Audited the single-port Replit deployment contract: `src/src/app.ts` serves the built Apex Finder directly while `apiAuth` protects `/api/*`. The Vite development proxy is not the production browser contract. Frontend launch/status/stop/pause/resume calls do not register a browser-safe auth mechanism. Issue #131 tracks the required session/authorization design.

## Newly confirmed blockers

1. `agentic-web-research-core.ts` still contains the forced initial observation `Begin. Choose an initial web_search query — do not wait for instructions.`. Free-ReAct is therefore not yet clean. This remains issue #120. A stronger unified guard now explicitly blocks this string, so the build cannot silently regress while the source fix is pending.
2. The canonical `src/src/lib/ai-extractor.ts` still exposes Groq as a final card reviewer. The corrected architecture gate now catches this real role-boundary violation; issue #128 tracks the implementation fix.
3. `expandSecondaryPublicSurface()` is still a deterministic research playbook reachable from canonical research (issue #125) and contains website fetches that bypass the canonical SSRF boundary (issue #126).
4. `startup.ts` still contains scheduled legacy research calls, including deep-web OSINT and Hybrid Research bulk passes. The API boundary now blocks the retired deep-web endpoint, but the scheduler itself remains stale and should be retired rather than repeatedly attempting a 410 route.
5. `jobs.tsx` still advertises retired legacy tasks such as `sync-hot-flags`, `deep-web-osint`, and `bulk-hybrid-research`; UI cleanup is required so the operator surface cannot launch retired control planes.
6. The duplicate legacy/canonical API-server source trees need reachability tracing and quarantine; issue #129 tracks this. The audit has now also established that legacy Atlas still directly invokes the Target Investigator without durable context, so the new leaf boundary contains that legacy path rather than allowing it to run silently.
7. Canonical Atlas batch discovery does not yet mount a durable discovery case context before its first Investigator pass; issue #130. This is a state/forensic-integrity defect, not a research-strategy defect.
8. Frontend API authorization/session integration still needs a safe product-level solution; issue #131. Do not put `APEX_API_AUTH_TOKEN` into a Vite/browser bundle and do not broadly weaken API auth to make the desk appear functional.

## ReAct autonomy assessment

The canonical web-search adapter currently requires an explicit provider selection. When the Investigator omits the provider, action parsing rejects the action rather than silently choosing Serper/Tavily/Exa. Provider-specific retries visible in the implementation are credential/transport availability retries inside the provider the model selected; they are not a research-strategy sequence. This distinction must remain explicit in future changes.

The remaining concrete autonomy defect in the ReAct core is the initial observation that instructs the Investigator to choose a `web_search`. The correct repair is a neutral first-turn observation containing the durable objective/context and telling the Investigator to choose any valid action. It must not be replaced by another deterministic first tool.

The Atlas batch-discovery context defect is orthogonal: it does not constrain tool choice, but it deprives the Investigator and later oversight layers of durable forensic state for that initial discovery run. Context must remain memory/state, not a script.

## Architecture law reaffirmed

Apex has exactly two oversight/intelligence layers: Gemini Boss and DeepSeek/NVIDIA Right-hand. Groq and Mistral are Investigator LLMs. Investigator research strategy is model-owned free-ReAct: reason, choose a capability, observe, reason again, pivot, and decide sufficiency. Deterministic code may enforce safety, authorization, validation, schemas, provenance, persistence, quotas, timeouts, transport, telemetry, deduplication, and explicit boundaries. It must not silently choose research strategy, provider sequence, research hops, or completion. Evidence crosses into a card only through an explicit model promotion decision plus deterministic provenance/identity validation.

Durable case context is memory/state, not a research script. The Target Investigator now enforces that invariant at its own leaf rather than trusting every caller to remember it. The same invariant must be applied to Atlas batch discovery.

## Verification status

Repository writes completed this continuation include:

- Target Investigator context-boundary implementation and static guard.
- Unified architecture guard strengthened for canonical source paths, free-ReAct opening, Investigator propagation, and context boundaries.
- Legacy Apex mutation guard moved ahead of all legacy enrichment routers, including extended OSINT.
- Frontend API-auth audit/probe artifacts added without exposing any server secret.
- Atlas discovery context continuity audit documented as issue #130.
- Frontend single-port auth contract blocker documented as issue #131.
- This living forensic session record extended with the above findings.

These are source-level repairs/guards only. No runtime/Replit verification has been claimed. No green build has been claimed. The latest observed GitHub Actions audit workflow remains failed; its available job listing did not provide enough information to attribute that failure beyond the repository's currently known architecture blockers.

## Next hunt

1. Repair canonical `ai-extractor.ts` Groq final-review fallback without weakening the architecture gate.
2. Remove the forced initial web-search observation from the canonical ReAct core using the smallest safe source change.
3. Give canonical Atlas batch discovery a durable discovery case and persist its actual trajectory.
4. Retire automatic `expandSecondaryPublicSurface()` invocation from canonical research; preserve useful capabilities only through explicit Investigator-selected tools.
5. Close the secondary-surface SSRF gap or eliminate the lane.
6. Remove stale startup/UI research callers.
7. Trace and quarantine duplicate legacy `src/lib` control-plane copies.
8. Solve frontend authentication as a real session/authorization design, never by shipping the server bearer secret.
9. Continue the performance audit in issue #51: distinguish transport retries from semantic retries and measure cost per useful finding without reducing Investigator autonomy.
10. Only after static blockers are exhausted: boot Replit, verify real providers/Redis/DB/API, run a bounded discovery-first smoke, and inspect the actual Investigator trajectory and evidence/card boundary.

**STATUS: PRE-DEPLOYMENT / STATIC AUDIT CONTINUING / LIVE RESEARCH PROOF STILL REQUIRED**