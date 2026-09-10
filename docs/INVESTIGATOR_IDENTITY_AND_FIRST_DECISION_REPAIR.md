# Investigator identity + first-decision repair packet

**Status:** implementation guidance for the remaining canonical ReAct defects. No runtime success is implied.

## Purpose

The canonical Investigator must receive institutional orientation + role purpose + durable case context before it chooses its first action. It must also reason about person attribution itself. Deterministic extraction can expose facts and provenance, but it must not attach the input target name to those facts and thereby manufacture identity claims.

## #120 — remove the forced first action

In `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`, remove the two known forced-search seeds:

```text
Begin. Choose an initial web_search query — do not wait for instructions.
(none — begin with web_search)
```

The replacement state should be neutral context, for example:

```text
No tool observation yet. Review the institutional mission, role purpose, durable case context, objective, capabilities, and trajectory. Choose the next permitted action based on your own reasoning.
```

The exact wording may differ. The invariant is that the harness must not name `web_search` (or any other tool) as the first action. Do not replace one forced tool with another.

The existing `parseAction` rule that requires an explicit provider for `web_search` should remain: provider selection is part of the model's action, not a hidden fallback order.

## #136 — make deterministic observations identity-neutral

The current deterministic extraction paths must stop inheriting the input target name into person-scoped findings.

Affected patterns include:

- `findingsFromProxyPage(...)`: do not assign `personName: targetName` merely because the page contains target-derived context. Preserve the observed fact and exact source URL; leave identity unresolved unless the model explicitly authors it.
- `findingsFromContactFacts(...)`: do not assign `personName: targetName` to generic address/role/contact facts. Related-person parsing may expose a raw named person as an observation, but must not silently turn it into a candidate admission.
- `footprint_email` / `footprint_username` branches: do not construct candidate findings with `personName: name`. Return the footprint result and observed URLs as neutral evidence for the model to interpret.
- Any similar deterministic branch discovered by the identity-boundary guard must follow the same rule.

A safe observation shape is:

```text
fact/value + scope=unknown|organization + exact observed source URL + provenance note
```

The model then explicitly emits:

```text
personName + scope=candidate + sourceUrls + promotionDecision=promote|reject + promotionReason
```

Only that model-authored finding may enter the existing `modelFindings` persistence boundary.

## What must not change

- Do not weaken `modelFindings`-only persistence.
- Do not add automatic promotion as a substitute for model attribution.
- Do not infer identity from target/company names, URL slugs, titles, authors, organizations, or directory records.
- Do not introduce a deterministic first search.
- Do not move identity reasoning into a regex/extractor and call it a model decision.
- Do not use transport/provider fallback to choose a research action.

## Verification contract

After the source repair:

1. `check:mission-bootstrap` must pass, including the #120 opening checks.
2. `check:investigator-identity-boundary` must pass.
3. `check:unified-investigator` must still pass.
4. `check:free-react` and the remaining `check:bureau` suite must pass.
5. A runtime smoke must demonstrate that the first Investigator action can be something other than `web_search`, and that a person-scoped promotion is explicitly emitted by the Investigator rather than inherited from deterministic findings.

Until those checks and runtime observations exist, do not call the architecture fully repaired.
