# Apex Atlas end-to-end pipeline review — 2026-10-12

## Scope and standard

This review follows the canonical UI entry through discovery, control decisions, source retrieval, candidate admission, target research, contact persistence, and case/card outcomes. It compares source behavior against a human investigator's loop: select a reachable lead; trace ownership and business relationships; seek independent identity/role evidence; test the hypothesis; then investigate a named person's public professional identity and practical contact route.

This is a source-and-CI audit, not a new live investigation. No new provider/model search was launched, and no run outcome was altered.

## Route map

1. **UI launch → canonical Atlas job.** The UI submits the canonical target budget, research depth, and timeout. Canonical job-lock ownership, stale-owner fencing, and cancellation checks protect the current job. HTTP 202 means only that the job was accepted.
2. **Boss / Right-hand opening and pivots.** Boss sets the high-level research question; Right-hand reviews but does not choose tools. A redirect is validated as an objective (not a tool, provider, query, URL, or fixed sequence), then passed to the Investigator context.
3. **Investigator free-ReAct loop.** The model chooses among the currently exposed search, parallel search, visit, browser fetch, registry, domain lookup, and terminal actions. Query validation runs before external search. Repeated/redundant actions can be blocked by the runtime.
4. **Source observation and evidence grounding.** Search results are leads, not admissions. Findings need observed source material and source attribution. A successful wrapper status alone does not prove that the nested page-content fetch succeeded.
5. **Candidate admission.** Discovery candidate admission requires exact person/role attribution, independent claim-grade sources, a credible wealth-potential signal, and a falsification attempt before finalization. No candidate may be manually invented to make a run succeed.
6. **Target-scoped research.** The canonical target Investigator is overseen per act by Right-hand/Boss control. Its objective is built from the bound person/company and accumulated case state.
7. **Contact evidence and card persistence.** The strict persistence route only accepts source-backed facts at appropriate person/organization scope. Card/entity creation and promotion are distinct from the discovery run merely reaching a terminal status.
8. **Alternate continuation.** The case-continuation endpoint is discovery-only; it parks the case for review and does not perform candidate admission or card creation. It must therefore report the overall Atlas outcome as incomplete.

## Findings

### A. Discovery spent its budget before choosing a realistic person (confirmed by the 2026-10-12 audit)

The captured run used broad Fortune 500/Coca-Cola leadership searches, repeated similar queries, generic PR-contact queries, and literal placeholder values (example.com, companywebsite.com, CompanyName). It exhausted the Investigator iteration budget with no model findings, parsed candidates, admissions, or cards. This is a trajectory-quality failure, not proof of provider quota exhaustion.

### B. Existing realism logic was downstream of discovery (source confirmed)

The reachability-realism assessor classifies person-level contact feasibility, but the canonical discovery route did not use it to prevent expensive low-yield destination choices. The realism assessment is now wired into the canonical target Investigator objective using the bound entity's current public contact/profile fields and metadata. Discovery also now has a pre-fetch source-destination gate for well-known ranking destinations and global-household-brand leadership/about pages, with an explicit exception for URLs identifying local operators, bottlers, distributors, franchisees, licensees, concessions, or regional partners. The gate is a narrow quality rail, not a hardcoded research itinerary. Title/leadership-led searches must now include a wealth-relevant ownership/equity/investor/operator/concession/franchise/proprietor hypothesis; localized Slovenian/Croatian/Italian/German ownership terms are recognized.

### C. Search-query policy alone did not cover direct URL visits (source confirmed)

The existing discovery query validator only runs before search actions. A model can search acceptably, then directly visit a poor URL suggested by old context or a result. A separate destination validator is now run before both discovery-mode visit and browser_fetch external calls. It records the block as an observed runtime result without pretending the page was fetched. Target mode is not subject to the discovery-only household-brand gate.

### D. Boss-pivot retention is a critical hand-off contract

The objective formatter appends a marker plus a newline and the selected direction. Compaction must extract the complete trimmed tail after that marker—not only the first line—and reserve room for it in the short objective before historical context. The Investigator prompt now makes the mission/realism policy higher priority than control suggestions: Boss directions are hypotheses, and a direction that points to prestige-only global leadership must be rejected unless it traces to a realistic local ownership/operator/intermediary route. Compatible Boss directions still have to advance the next action, and any deviation needs an evidence/capability/policy reason. The regression suite covers multiline pivots and preserves this hierarchy in the compact prompt.

### E. Discovery-only continuation used to overstate success

The alternate case-continuation route reported outcome="complete" after a discovery pass and then parked the case for human review; it had not performed admission/card creation. It now reports outcome="incomplete" and explains that admission and card creation were not performed. Its contract test asserts the false-complete text is gone.

### F. Target research needed person-level feasibility and human-like pivots

The target Investigator now receives the assessment's reachability directive and compact, model-owned research guidance: follow verified roles, aliases/transliterations and jurisdiction into public director/beneficial-owner records, filings, investments/deals/assets, local-language reporting and English corroboration; seek publicly attributed professional/business social profiles; and identify direct or documented intermediary routes. It explicitly rejects guessed usernames, private accounts, inferred phone/WhatsApp/Telegram identity, and speculative family/associate relationships. These restrictions protect identity attribution; they do not prescribe a fixed source order.

### G. Boss opening suggestions could override the actual targetability mission

The opening Boss and Right-hand prompts checked public-source plausibility, but did not put the under-the-radar/realistic-person objective ahead of a prestige-style company suggestion strongly enough. The Investigator was also told to treat Boss direction as the goal without first checking compatibility with the mission. The control prompts now state that the human mission and realistic-targetability policy outrank Boss/Right-hand suggestions, and that Boss directions are hypotheses, not mandates. They explicitly prioritize private/regional/family-business owners, operators, investors, beneficial owners, and concession/franchise/license holders where a plausible public/intermediary route exists. Source text still has to establish identity, role and wealth potential; these prompt changes do not themselves prove a candidate.

### H. Duplicate-search protection did not match how models vary rationale

The previous redundant-action guard caught repeated page fetches and exact action/rationale repeats, but the same discovery query could be sent to the same provider and market again by changing its hypothesis/purpose. A new dispatch-level guard keys the normalized query, provider, locale and market for both single and batched searches. It blocks repeating the same request unless a newly fetched, previously unobserved public source has advanced the case since; changing rationale alone is not new evidence. Cross-provider and multilingual/market variants remain available. This addresses the repeated-query pattern recorded in the audit without mandating a fixed search itinerary.

### I. OSINT tool availability was misleading/incomplete

The canonical capability registry exposes a limited set of model-selectable actions. Maigret, Sherlock, SpiderFoot and related Python wrappers do not yet have an implemented trusted, network-restricted execution backend; wrapper functions are fail-closed stubs. They must not be presented to the Investigator as working actions merely because sibling/manual routes or package references exist. Availability now requires both an attested network_osint sandbox and an implemented executor. A real implementation needs isolation, egress policy, cancellation/resource limits, and source/provenance output before it can be added to the selectable action schema.

## Expected human-investigator comparison

| Stage | Human-quality behavior | Required Atlas invariant |
|---|---|---|
| Lead selection | Prefer a low-noise regional/private business where ownership is traceable and at least one owner/principal may have a realistic approach path | Do not optimize for company fame, executive prestige, or search-result volume |
| Anchor development | Verify the business exists and identify its jurisdiction, legal entities, ownership and operating/concession relationships | Every pivot stays tied to the chosen business or records why it is infeasible |
| Person discovery | Locate exact names and roles in official filings/registries and independent business reporting | Snippets alone cannot create candidates; require exact identity/role binding |
| Hypothesis testing | Try to disprove the identity, role or ownership hypothesis and resolve name collisions | Keep the falsification requirement and source independence gate |
| Reachability | Distinguish direct personal route, documented intermediary, professional-social route and research-only result | Apply reachability realism to the canonical target path; fame/wealth is not access |
| Enrichment | Check public, professionally attributable profiles and aliases across useful languages; follow documented corporate/transactional ties and explicitly sourced family/associate links where relevant | Never guess private account identifiers or infer family/associate ties from surnames, follows or social-graph proximity |
| Contact facts | Record who the fact belongs to, where it was observed, and whether it is a personal or organization route | Preserve scope; never label a generic company inbox as a personal contact |
| Outcome | A successful run yields auditable findings and a real candidate/card, or an honest incomplete/failed state | Job termination or HTTP 202 never means successful research |

## Verification and remaining boundary

- Added unit/static regression coverage for discovery query/destination gates (including title-led routes and localized terms), local-operator exceptions, same-provider duplicate-search blocking with evidence-based exceptions, mission-first Boss/Right-hand/Investigator prompts, the compact objective contract, target-objective research guidance, truthful Python tool availability, and incomplete discovery-only continuation.
- The repository CI suite is running against the branch. Merge remains withheld until the current head has the required green checks and the full-code audit completes.
- No live target research, live social-profile enumeration, or successful end-to-end card creation has been verified by this source audit. That still requires one explicitly authorized run after merge/deploy; do not use this document as proof of runtime success.
- The current OSINT stubs are a real capability gap, not a prompt gap. A secure executor is a separate engineering task and should not be simulated by exposing legacy child_process paths.
