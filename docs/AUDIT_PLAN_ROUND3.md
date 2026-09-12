# Apex Atlas / BigContacts — Complete Audit & Hardening Plan (Round 3)

## Objective
Perform a repository-wide audit of the canonical Apex/Bureau system and its compatibility/legacy surfaces, then implement and ship every warranted fix. The audit covers correctness, security, agent-control integrity, provenance/evidence, persistence, concurrency, cancellation, resource bounds, API boundaries, configuration, CI/supply-chain, tests/guards, and operational/recovery behavior.

## Phases
1. **Baseline & inventory** — pin main; inventory tracked source/config/tests/workflows; map canonical vs compatibility trees, runtime entry points, routes, jobs, queues, providers, tools, persistence writers, and build-time mutators.
2. **Trust & role integrity** — verify Gemini/Boss, DeepSeek/Right Hand, Groq/Mistral/Investigator boundaries; durable case/entity/job binding; no caller/model override; no hidden deterministic research strategy; server-side authorization.
3. **Agent/tool security** — audit every model-to-tool dispatch, SSRF/egress path (HTTP, browser, proxy, registry, redirects, DNS/IPv4/IPv6, metadata/local targets), Python/command execution, fallback paths, and prompt-injection handling.
4. **Cancellation, limits & concurrency** — trace AbortSignal end-to-end; audit deadlines, iterations, observations, trajectories, bytes, provider quotas, retries, transactions, isolation, locks, idempotency, cancellation fences, cleanup, and fire-and-forget persistence.
5. **Evidence, identity & persistence** — audit observation→claim→attribution→promotion; integrate multi-source evidence where needed; verify immutable IDs/digests, provenance, identity/scope, overwrite prevention, manual/legacy writers, append-only events, and replay.
6. **Legacy/compatibility retirement** — finish registry cancellation migration, target event-ledger migration, secondary-surface retirement, canonical discovery cancellation migration, and duplicate-tree reachability analysis; delete mutators only after source-native migration.
7. **API/data/operations** — audit all HTTP routes for auth, schemas, error leakage, methods, CSRF/CORS where relevant, rate/resource limits, redirects; audit DB constraints/indexes/migrations, Redis/jobs, configuration/secrets, logs, and recovery semantics.
8. **Supply chain & CI** — audit workflow permissions/triggers/forks/secrets/action pinning, dependencies/lockfiles/build hooks, generated code, and static guards for source truth.
9. **Verification & shipping** — focused regressions; complete static/security suite; production boot/auth/workflow checks; strict typecheck/build; final diff review; merge; verify main CI; document any genuinely unresolved items.

## Evidence standard
Classify each finding as **confirmed defect**, **hardening opportunity**, **already protected**, or **not applicable**. Never weaken a guard to make CI green, never treat a stale static pattern as proof of a product defect, and never claim runtime/provider success without evidence.

## Known priorities to re-check first
- registry cancellation source migration
- target investigation event-ledger source migration
- secondary-surface retirement
- multi-source evidence-graph integration
- Python sandbox/egress boundary
- duplicate-tree and legacy-writer reachability
- identity-review/manual entity writers
- context/trajectory compaction
