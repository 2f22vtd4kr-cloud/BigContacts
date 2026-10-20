# Apex Atlas Reliability Review — 2026-10-20

Scope: source-code review and corrective changes for BigContacts. Canonical branch: main. Implementation PR: https://github.com/2f22vtd4kr-cloud/BigContacts/pull/721.

**Live-run status:** this review did not launch or operate Replit. It does not claim a new live research run or visible live card was completed. The current job state must be reconciled in the actual runtime before another launch.

## Executive finding

The zero-card outcomes were not primarily a rendering bug. The captured Standard and Deep runs ended with zero admitted findings, zero entities/cards, and zero research-evidence rows. The structured model schema allowed findings on every action, but the runtime parser only extracted them from the terminal action “done.” Useful findings returned while the Investigator continued searching were discarded. The persistence path also lacked a separate review-card route for source-backed partial leads.

The fix changes the data contract and persistence path, not the research-depth ceiling or model strategy. Partial findings are now carried across non-terminal actions and the one-action Bureau wrapper; findings from an evidence-rejected terminal decision can also be retained for review. Source-grounded partial company and person leads are persisted as explicitly review-only entity/evidence records and shown in a separate “Research leads in review” dashboard section. They do not authorize target research, make an HNWI claim, or promote contact data. Full person admission retains the existing same-run, fetched-source, exact-name/role and ownership/control gates.

No fixed search sequence, deterministic candidate discovery, mandatory identity/company/contact ladder, or model/provider substitution was added. The Investigator still chooses research actions, sources, pivots and stopping points.

## The three latest Replit commits on main

- 1c1b1c526be13e7ace463a26d9a71b01d14a3b17 — “Update configuration and add sequential audit report.” It redirects visible request-audit output to a fresh-run destination. This is useful trace isolation, but not a research-quality fix.
- 68557ffda0162681413196131fb4b0b9795d535b — “Update audit documentation for fresh project run.” It clarifies which audit file is current. Documentation hygiene does not alter the card data flow.
- 99bb5d40f820528aceb391264809e2c595792bb7 — “Implement agentic web research core features and update atlas discovery integration.” The Sunbiz observed-URL identity check and Czech/Moravian/German/Bavarian aliases are narrow, appropriate fixes for false scope/provenance blocks. However, this batch did not preserve partial findings from non-terminal actions or provide a review-card path, so it did not resolve the zero-card failure mode.

The visible audit logger redacts credentials and omits private reasoning, but a run had already produced an audit file larger than 2 MB. Individual request size limits do not cap total file growth; a per-run retention/rotation policy remains recommended.

## Live-run evidence in the captured audit

| Run | Terminal state recorded | Activity | Durable outcome |
|---|---|---|---|
| Standard, job 84547e0e-6b2a-4f51-b9d7-7bd31edf769e | failed/incomplete at 20 Investigator actions | 29 searches, 4 visits | 0 findings, admissions, entities, evidence rows or cards |
| Deep, job ef7a5c9f-b20d-49cf-854d-2422ca944ab5 | failed/incomplete at 32 actions | 13 searches, 4 visits | 0 admitted candidates, cards or evidence rows |
| Later case 3, job 71918e8d-1620-4a8b-90b0-affc464903b4 | terminal outcome not included in the captured section reviewed here | last visible model response was Investigator turn 31 at about 2026-10-20 04:35:53 UTC | must be read-only reconciled in the actual runtime before asserting a terminal result |

The Standard run did not establish quota exhaustion. Deep did have one explicit hard-token quota event and a correct Boss-directed reassignment to groq-investigator-2; the overall run still ended without an admissible source-backed lead. HTTP 400 structured-output errors were sometimes recovered by bounded retries; these are not quota evidence. Fetch errors, weak search results, scope blocks, depth ceilings and typed quota exhaustion must remain separate failure classes.

Other issues evident in the audit:

- Several Texas SOS searches surfaced generic guidance pages rather than a named person with source-backed role and ownership/control. Extra iterations alone will not fix low-information results.
- Scrapfly/ZenRows failures were external page-retrieval failures, not reasons to rotate Investigator credentials.
- The earlier exact-URL rule rejected a Florida Sunbiz detail-page variant that preserved the company's identity parameter; the latest main change correctly added a narrow same-origin/path/identity check.
- Earlier Czech Morava/Jihomoravský and German manufacturing queries were blocked by missing language/region aliases. The aliases now have regression coverage that rejects unrelated regions.
- A valid quota reassignment worked, but the job message kept naming the exhausted Investigator slot. This branch now updates the visible job message and selected-capability projection after the durable Boss assignment.
- HTTP 202, completed searches, green static checks or an audit file are not proof of card creation. Run acceptance requires terminal job state, active-lock state, durable entity/evidence counts and dashboard projection to reconcile.

## What the repair changes

Partial model findings are preserved separately from terminal/promoted findings across the core Investigator loop, dynamic one-action wrapper and Bureau result. The non-terminal parser strips promotion decisions; it accepts only appropriately scoped source-groundable lead forms. Search snippets and unvisited result URLs remain leads only.

Partial person cards are created only when a successfully fetched claim-grade source co-binds the exact full name and page-stated role and the same observation contains an ownership/control clue. They are PersonCandidate review records with low initial score, evidence-only contact outcome, review-status evidence, manual-review session state, and explicit limitations: wealth/materiality/counter-evidence/contact route are unverified. Company-only cards require the exact organization name in a successfully fetched claim-grade source and are Corporation review records with explicit no-ownership/no-person/no-wealth wording. Neither type invents contacts or triggers target research.

The existing full-admission path is unchanged in substance: it still requires the explicit Investigator candidate promotion, same-run fetched-source binding and ownership/control evidence. A partial card is not a completed run or verified HNWI.

The dashboard reads real persisted review-only entities through a separate endpoint and presents them in “Research leads in review,” separate from the HNWI “Priority profiles” list. It is not an optimistic UI count.

The source-span regression was also fixed: the exact binding of “25%” immediately adjacent to a CJK subject such as “公司25%的股份” had been rejected because the numeric value was treated as a continuation of the subject token. The patch permits a self-delimited numeric-symbol value next to a CJK subject while preserving rejection of Latin partial tokens such as “Apex25%”.

## Non-AI tools: SpiderFoot and the Bureau tool layer

**SpiderFoot was not present in the captured Investigator action list.** It exists in source and is marked non-selectable by default. Worker-backed actions are added dynamically only when a signed Python worker attestation proves tool readiness. The worker trust contract requires sandbox URL/token, pinned SHA-256 worker and egress-proxy image digests, a short-lived signed attestation, the approved network namespace, a dedicated public-egress broker, and limits for destination access, redirects, output, replay and cancellation. Source code alone does not prove a tool is live in the current runtime.

Available source-level capability families:

- Serper, Tavily and Exa search: model-selected discovery; snippets/results are leads, not proof.
- visit: public page/text fetch and bounded text-bearing PDF extraction; OCR is not available for scanned pages.
- browser_fetch: escalated retrieval through configured providers such as Scrapfly or ZenRows, subject to provider readiness and page/challenge failures.
- integrated registry search: runtime-exposed registry IDs such as SEC EDGAR, Companies House, BRREG, ARES Czechia, BODACC, GLEIF and other registered adapters. Texas SOS and Florida Sunbiz were not native registry IDs in the captured prompt, so the Investigator had to use general web search/pages.
- RDAP/WhoisJSON: domain-registration signals where public; privacy services may conceal registrant identity.
- SpiderFoot, Maigret, Sherlock, Holehe and theHarvester: implemented behind the attested Python worker; not usable as model-selectable actions without live worker attestation and per-tool readiness. SpiderFoot output is exploratory leads and correlated modules are not independent evidence.
- domain harvest: public organization-domain surfaces, gated by a grounded domain and the worker contract; output needs independent attribution.

Recommended tool-layer work: attest and pin the remote worker and egress-proxy images in a real environment where network policies can be verified; only expose tools whose attestation and readiness succeeded; show unavailable reasons to the Investigator without supplying a scripted research plan; and track source lineage so correlated SpiderFoot events are not counted as independent corroboration. For this captured run, SpiderFoot should be reported as implemented in code but not shown as available to the model.

## Validation and acceptance boundary

The PR includes regression tests for non-terminal partial findings, stripping pre-terminal promotion decisions, the prompt contract, and CJK numeric span binding. Architecture guards were updated for the new typed partial-finding path and for truthful job status after quota reassignment. API typecheck/build, frontend contracts, research-quality checks, worker checks and full-code audit workflows run on the pull request; the linked PR is the source of exact final check results.

No new Replit job was launched in this review. Before a new live acceptance run, reconcile job 71918e8d-1620-4a8b-90b0-affc464903b4 and the shared Atlas active pointer read-only in the actual runtime, verify the running commit, then run a single UI-equivalent attempt. Acceptance requires the real terminal state, durable review-lead/evidence rows and visible dashboard cards to agree. A source-backed partial lead should appear in “Research leads in review” even when the run overall ends incomplete; full HNWI acceptance remains subject to the stricter target-research gate.
