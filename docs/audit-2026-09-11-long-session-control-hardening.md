# Apex / BigContacts — Long-session control hardening

**Date:** 2026-09-11
**Mode:** pre-run source engineering; runtime/provider success intentionally not claimed.

## Completed in this pass

### Target control plane

The canonical target runner now gives one Investigator ReAct action a turn before another action is permitted. After each completed action, the system:

1. anchors the action/observation to an immutable `research_case_events` row;
2. constructs source-attributed evidence graphs anchored to that observation event;
3. sends the completed act to the DeepSeek/NVIDIA Right Hand;
4. refuses continuation if Right Hand advice is unavailable or invalid;
5. sends the Right Hand advice and act to Gemini Boss;
6. accepts only `continue`, `redirect`, or `stop` from Gemini;
7. feeds a redirect back only as a research objective, never as a tool/provider/query/URL command;
8. persists the control decision with a deterministic case/turn correlation key.

Both target and agentic wrappers fail closed when the durable target control case cannot be mounted.

### Deadline correctness

Target investigations now establish one global deadline. The runner refuses to start another act when less than the Investigator wrapper's 30-second minimum remains, preventing a per-act timeout from silently extending the global investigation deadline. Cancellation and final job/case status are preserved explicitly.

### Discovery control context

Discovery transition decisions now pass through `compactInvestigationContext` instead of repeatedly dumping raw trajectory slices into Right Hand/Boss prompts. The compact state includes objective, status, admitted candidates, finding summaries, prior control state, structured Investigator observations and evidence-attribution pointers. Discovery transition control is also fail-closed if Right Hand is unavailable.

### Evidence graph foundations

`EvidenceObservation` now supports an immutable `research_case_events` event ID. Canonical target-act graphs require that anchor. Legacy in-memory graph callers can still use the primitive without falsely claiming synthetic observations are immutable event records.

### Build/source discipline

API build/test hooks no longer execute source-mutating `apply-*.mjs` migrations. A source-mutation guard and source-migration parity gate are wired into the bureau/API checks. This prevents a green build from masking an incorrect checked-in source tree.

### Python OSINT

The canonical Python OSINT boundary remains fail-closed until a real sandbox/egress attestation exists. No package-install or environment-variable shortcut was introduced.

## Still open — deliberately not approximated

### Registry cancellation source migration

`artifacts/api-server/src/src/lib/registry-client.ts` remains the main source-native blocker. Its actual registry fetches still use local `AbortSignal.timeout(...)` instead of receiving the caller's `runController.signal` through `searchRegistry(..., signal)` and composing that signal with each registry-local timeout.

The intended chain remains:

```text
runController.signal
  -> registry_search action
  -> searchRegistry(..., signal)
  -> registry-specific function(..., signal)
  -> fetch(..., composed signal)
```

Do not replace this with `Promise.race`, global fetch interception, AsyncLocalStorage, duplicate implementations, or a build-time mutator. The existing migration scripts are no longer part of build/test execution and should be deleted only after the direct source migration is complete.

### Discovery durable case projection

Discovery model-facing control context is now semantically compacted, but the durable `bureau-agentic-pass.ts` projection still stores bounded trajectory arrays and a bounded context document. The remaining improvement is to make that persisted discovery context itself use the same semantic compaction policy while retaining the complete event ledger.

### Promotion/evidence graph admission

Canonical target-act graphs are now durable and event-anchored, but the existing contact promotion boundary still has its own conservative observation-material validation. The next increment should connect the event-anchored graph directly to promotion validation without weakening wrong-person or unsupported-contact checks.

## Architecture invariant

There are exactly two AI control layers:

- Gemini Boss — case direction, Investigator assignment, continuation/redirect/stop.
- DeepSeek/NVIDIA Right Hand — advisory challenge/oversight; never Investigator and never browser/tool operator.

Groq/Mistral remain Investigator capabilities. They own the research trajectory and choose tools based on information gain. Deterministic code enforces safety, provenance, scope, budgets, cancellation, identity integrity and lifecycle; it does not encode a hidden research strategy.
