# Apex Atlas Live Run Sequential Audit — 2026-10-27

## Outcome
- Job: `8856638e-ff99-4270-8923-d4ffd9ac3c15`
- Case: `15`
- Terminal job status: `failed/incomplete` after Investigator provider quota exhaustion.
- Card outcome: **successful review-only organization cards were created** during terminal reconciliation.
- Observed cards include: MIDLANDS RENEWABLE ENERGY LTD; UPTIMUM RENEWABLE ENERGY AND RESOURCES LIMITED LTD; EAST MIDLANDS RENEWABLE ENERGY LTD; GREENLIGHT RENEWABLE ENERGY LIMITED; WORCESTERSHIRE CAPITAL LIMITED.
- These are organization review leads only; no person, ownership, wealth, or contact conclusion was fabricated.

## Root cause found and fixed
1. Discovery leads were correctly persisted as `registrySearchOutcomes` in durable `tool_observation` events.
2. Reconciliation ran after the pipeline’s failure branch had cleared the active queue pointer.
3. `reconcileOrganizationReviewCardsForJob` required a live canonical lease and therefore returned zero cards despite exact durable job/case ownership.
4. Fix: terminal reconciliation now permits the narrow case of a terminal job after exact job binding is re-verified per case. Live/superseded/cancelled ownership remains fail-closed.

## Discovery architecture finding
Companies House was not the only configured source. The runtime registry matrix exposes multiple adapters, including SEC EDGAR, Companies House, BRREG, ARES, BODACC, GLEIF, CVR Denmark, Zefix Switzerland, YTJ Finland, Atoka Italy, BORME Spain, KBO Belgium, and optional OpenCorporates/Germany capabilities. Public web search and browser/page-fetch providers are also separate discovery capabilities.

The earlier run appeared Companies-House-heavy because the Boss/Right-hand assignment selected that first lane and the Investigator prompt did not show the live registry inventory. Fix: Investigator guidance now injects the currently available registry IDs as capability telemetry, explicitly stating that the list is not a mandatory sequence and that the model may choose mixed sources based on expected information gain.

## Run trace
- Boss/Right-hand assignment: UK renewable-energy firms in the West Midlands, with PSC/shareholder verification as the intended next evidence gap.
- Investigator provider `groq-investigator-1` hit upstream token quota exhaustion; recovery reassigned to another Investigator capability.
- Investigator executed Companies House registry searches, Serper web searches, official Companies House page visits, and browser-fetch attempts. Some fetches failed at Scrapfly; successful page visits and registry leads remained durable.
- Repeated invalid action contracts were terminalized without inventing actions.
- Provider recovery eventually reached its configured exhaustion threshold, parking the case for review.
- Final route reconciliation then admitted exact organization-name leads as review-only cards using registry/search provenance.

## Validation
- Focused reconciliation and stop-fence tests: 17 passed.
- Full API build/architecture checks: passed.
- The implementation preserves AI-driven source selection; it does not hardcode Companies House as the discovery source.

## Continued session — button-equivalent acceptance run
- User acceptance condition: do not stop at a build, accepted launch, lead, or provider attempt; continue until a new genuine card is verified from a canonical UI-equivalent launch at any configured research depth.
- Screenshots supplied by the operator define the intended live reactor UX: timestamped compact action rows, semantic icons, plain-language progress narratives, visible run ID, visible polling state, and a clear active/stop affordance. The current API emits `BUREAU|` envelopes and durable log entries, but the audit must separately verify that the frontend consumes them in real time rather than only showing delayed polling snapshots.
- The patched API was restarted and launched through the canonical route with the button-default-equivalent request: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`.
- Job: `26f1d1ad-5eac-4c7e-ac24-fc7d0a92a1ff`.
- Initial durable poll: job running, phase `1/4`, `inserted=0`, `skipped=0`, `errors=0`; Boss/Right-hand completed and Investigator was running free-ReAct discovery. The live log showed duplicate-action guarding (`repeat_action_guard`) rather than silently issuing a duplicate outbound request.
- This run reached terminal `failed/incomplete`: `inserted=0`, `skipped=0`, `errors=0`, phase `3/4`. Discovery health: `searches=0`, `visits=0`, `successfulFetchedPages=0`, `unfetchedSearchLeadUrls=13`, `admittedCandidates=0`, `actionContractFailures=1`; provider recovery exhausted after two unavailable episodes. This is a genuine provider/contract failure, not evidence that the source universe lacks candidates.
- Reactor observation: the persisted live stream clearly surfaced `llm_wait`, `page-fetch`, `repeat_action_guard`, `parse_failure_terminal`, and `provider_error` events with timestamps and provider labels. It did not reach card admission. The UI must make those states visually distinct and must not present `llm_wait` as productive progress indefinitely.
- The exact button-equivalent job was `26f1d1ad-5eac-4c7e-ac24-fc7d0a92a1ff`; no second job was started while it owned the canonical lane. Acceptance remains unconfirmed until a post-launch card/entity delta is tied to a canonical job and retrievable through the ordinary API/UI path.
- A subsequent canonical fast-depth launch was also executed: job `9d4d5ecc-47f3-4481-9c01-4dcb3955756b`. It stopped at phase `3/4` with `inserted=0`, `findings=0`, `searches=0`, `visits=0`, and two consecutive `upstream_token_quota_exhausted` provider failures across the primary and 20B fallback capabilities. This confirms the current blocker is Investigator provider capacity before source execution, not Companies House exclusivity or registry coverage.
- Runtime configuration inspection found three distinct Investigator credential slots configured (`GROQ_INVESTIGATOR_API_KEY`, `_1`, `_2`), while the recovery policy selected only the model-scoped 20B fallback after the first capability failure and then stopped. Senior-review recommendation: evaluate whether the one-reassignment policy should permit another distinct credential capability when the first fallback is also unavailable, while retaining credential-alias exclusion and a bounded per-job ceiling.
- Operator supplied `GROQ_INVESTIGATOR_API_KEY_3`, `_4`, and `_5`. Recovery was expanded from one reassignment to a bounded maximum of five distinct capability rotations. Focused recovery tests passed 8/8 and the full build checks passed.
- New canonical standard-depth job `69904b9c-ceb4-4fa6-be55-8172c4b24c77` proved the change: after `groq-investigator-1` and `groq-investigator-20b` quota failures, Boss selected `groq-investigator-3`; the Investigator executed a real Companies House registry search and generated multiple browser-fetch actions. At the latest checkpoint the job remained running with `inserted=0`; page fetches failed through Scrapfly and duplicate fetches were correctly blocked by `repeat_action_guard`. Continue this exact job until terminal reconciliation/card admission; do not count the registry lead as a card.

## Reactor UX critique for follow-up implementation
- Positive: durable `BUREAU|` envelopes provide a structured foundation for live activity rendering and prevent arbitrary source text from masquerading as reactor events.
- Concern: the current visible contract appears more like a developer work log than a bureau reactor unless events are mapped to stable visual categories (search, model reasoning, source/document, database/card, warning/error) with human-readable summaries and progress states.
- Required follow-up: expose event timestamps, actor/provider role, action title, status (`running`, `complete`, `blocked`, `retrying`), source count, evidence count, admission count, and card delta as first-class reactor fields. Never expose hidden chain-of-thought; display observable action intent, purpose, expected information gain, tool result, and provenance instead.
- Required acceptance evidence: screenshot or browser snapshot of the running reactor, followed by a card view/API response showing the newly created card, plus terminal job state and released lock.

## Note on model reasoning
The audit retains model assignments, structured decisions, prompts/contracts where the existing audit pipeline permits, provider events, tool actions, raw observed source values, URLs, failures, and handoffs. It does not persist hidden private chain-of-thought; observable decisions and evidence are recorded instead.
