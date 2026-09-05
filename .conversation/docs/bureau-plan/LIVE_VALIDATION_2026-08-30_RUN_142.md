# Live validation 142 — free-ReAct 10-target audit

## Purpose

This document records the validation protocol for the first live run after the current identity/provenance hardening merge. It is intentionally an evidence log, not a claim that the run succeeded before its artifacts are available.

## Commit under test

`329ecd491766acbf955b2d23f1b68f1d512caf86`

## Runtime contract under test

- `discoveryFirst=true` must enter `runModelSelectedDiscoveryBureau` and never enter the legacy Phase 0/template slate.
- Discovery slots are independent model-driven ReAct sessions. The controller only bounds the batch, deduplicates exact names, and applies identity/provenance safety validation.
- The model chooses queries, page visits, browser escalation, registries, domain tools, username/email footprint tools, candidate order, pivots, and stopping point.
- A candidate requires a person-shaped identity plus exact HTTP(S) source provenance and non-list-only provenance.
- Forbes/Bloomberg richest-person pages may be incidental evidence but must not become the discovery strategy.
- Agentic contact evidence without an exact source URL is discarded before Bureau persistence.
- Organization/unknown contact scope cannot inherit the target person's name.
- Live CI performs a real generation preflight before spending a 10-target research batch.
- SEC/DEF-14A proxy auto-extracted `related-person` findings with `role=proxy_table` are not admissible discovery candidates; only an explicitly model-selected candidate finding may cross the discovery boundary.

## Batch launch

The current smoke workflow intentionally uses a bounded proof before scaling:

`targetCount=3`, `researchLimit=3`, `researchDepth=standard`, `runResearch=true`, `skipFaa=true`, `targetTimeoutMs=300000`.

## Required evidence before calling the run a success

1. Build succeeds from the exact committed SHA.
2. Static autonomy, trajectory, discovery-quality, comparison-contract, and agentic-runtime checks pass.
3. At least one configured LLM completes a real generation preflight.
4. The live discovery trajectory contains model decisions and actual web tooling.
5. No legacy Phase 0/template marker appears in the free-ReAct run.
6. No malformed targets such as `com EMAIL`, `President PERSON`, `State St`, `Operational Enablement`, `Product Comparisons Sage Products`, `security issues`, or sector/title labels are admitted.
7. No deterministic proxy/filing name extractor may supply a discovery candidate; the model must explicitly emit the person finding after observing its source.
8. No contact evidence uses a synthetic search URL as if it were the source of the claim.
9. Final card outcomes distinguish personal/direct routes from organization routes.
10. The independent comparison uses the exact same admitted names and does not see Apex results before producing its baseline.

## Batch 24 forensic result — Run 33420624242

The bounded 3-target smoke completed successfully as a workflow, but **failed the research-quality gate**. It admitted 3 entities and produced 0 contacts / 0 direct routes. The three names were `Inclusion Recap`, `Inclusion A Business Case`, and `Equity Interview Series Learn`, each persisted from the same Detroit Chamber source with `role=proxy_table`.

Trajectory evidence showed genuine model-selected discovery web actions, including searches and visits, but the proxy-page deterministic extractor in `agentic-web-research.ts` also generated `related-person:` findings by regex-scanning capitalized names in proxy/filing text. Those findings could then satisfy the downstream discovery identity gate despite not being selected by the model. This was a real architecture defect, not a reason to add a scripted discovery path.

Permanent source fix:
- `discovery-agent.ts` rejects `proxy_table` findings before admission.
- Discovery slot target labels are now source-level `Discovery slot N` rather than depending on a build-time rewrite.
- `discovery-agent-parse.test.ts` contains a regression test for visited proxy page + `proxy_table` finding => zero candidate.

The next run must verify that this closes the false-admit path and still allows an explicitly model-selected, visited-source person through.

## Important interpretation rule

A provider outage is not a research-quality failure. A malformed model-produced identity is a research-agent failure even if later filtering catches it. A source-backed organization route is useful evidence but is not a personal-contact win. A green workflow with no actual model decision is not a research success.

## Follow-up

After the next run completes, append the actual target names, provider/model trajectory, source-backed findings, failures, and independent baseline comparison. If Apex loses on any target, convert the causal failure into a regression test or implementation change rather than adding a deterministic search playlist.
