# Apex Atlas — Replit Fresh Run 01 Post-Run Analysis

**Date:** 17 October 2026  
**Repository:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Source snapshot recorded by Replit:** `a5e7ca5987058968539f53c0545fe60d46d14af3`  
**Sequential audit supplied:** `★ STARRED — Apex Atlas Sequential Audit — Replit Fresh Run 01.md`

This analysis is separate from the chronological audit; it does not rewrite or replace the operator's audit log.

## Executive finding

**No card was created because neither attempt produced an admitted, source-backed person. The audit does not demonstrate a card-rendering defect.** The first attempt ended after a confirmed Groq tokens-per-day quota failure. The second attempt ended after the scope guard blocked every action before outbound execution. Its terminal state had zero executed searches, zero visits, zero findings, zero candidates, zero result URLs, and zero inserted cards.

The fresh project setup was properly reconciled before launch: the active lane was idle, its development database baseline was empty, schema initialization and preflight passed, audit routing was checked, and the run used the CTA-equivalent request `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000` without selecting a target or scripting a search sequence.

## Attempt 1 — confirmed daily-token quota failure

Job: `328feb72-7e0c-4670-b3a9-32b771cd94e3`.

The run produced model-selected searches and one page visit, but the visited page was unrelated to a useful target and no person findings or candidates were produced. Groq returned explicit `tokens per day (TPD)` limit errors: a 200,000-token daily limit was essentially exhausted, with more than the remaining allowance requested. Right-hand and Boss stopped rather than silently changing credentials.

The audit correctly distinguishes TPD exhaustion from an invalid key and from a short TPM burst. The local classifier patch extended bounded provider-message inspection so TPD language is classified as a hard quota, while TPM remains transient. Focused tests passed during the Replit session. The second attempt did not itself re-exercise TPD reassignment; no TPD event occurred during it.

## Attempt 2 — fail-closed scope guard, no outbound research

Job: `df700205-6577-4ca7-bcf9-d15a9cca8ec3`.

The first direction originally approved was concrete (Illinois manufacturing businesses around Chicago via the Illinois Secretary of State). After unsuccessful access to the registry, the Right-hand/Boss control loop accepted this pivot:

> Shift to a sector-specific, geography-focused discovery approach (e.g., identify private mid-size firms in a chosen region and locate their registered owners via public corporate registries).

This direction did not specify an actual sector or geography; those appeared only as placeholders. The Investigator then chose Austin/manufacturing but repeatedly omitted the pivot's required public-registry source class. Those actions should not have been sent outbound. The guard was right to block query variants that omitted a required source class, and the repeat guard correctly stopped repetition.

However, the scope parser treated procedural words in the vague direction—including “shift,” “sector-specific,” “geography-focused,” “discovery approach,” and “chosen”—as required subject anchors. This produced false subject mismatches instead of clearly identifying that the pivot itself was underspecified. The prompt/validation contract also allowed the vague pivot to become active. Once six actions were blocked, Right-hand and Boss stopped; that was a reasonable safety response, but the pivot quality and parser behavior made the outcome avoidably unproductive.

The later `texas_sos` registry ID was unsupported by the registry catalog; no request reached an external provider. This is not a missing card/rendering issue.

## Changes made to current GitHub `main`

This remediation preserves outbound scope protection and does not choose a target, fixed sector, fixed geography, provider, query or tool sequence.

1. **Reject unresolved pivot placeholders.** The shared objective validator now rejects directions such as “a chosen region” rather than persisting them as active scope. This also protects restored persisted pivots.
2. **Separate procedural language from subject anchors.** Scope parsing ignores control/procedure terms that are not industry or entity subjects.
3. **Keep explicit restrictions active on subject-open pivots.** If no substantive subject can be extracted, the guard still enforces explicit geography, source classes, and exclusions instead of bypassing the check entirely.
4. **Recognize ordinary registry wording.** “Registration” and “business/company registration” can satisfy a registry/database source-class constraint; subject and geography restrictions remain in force when those are explicitly present.
5. **Improve Boss and Right-hand pivot instructions.** Each control role is told to put a concrete subject/sector, actual geography/jurisdiction, and public-source class in the direction field itself—not only in its rationale or in a parenthetical example.
6. **Add regression tests** for the exact vague-pivot pattern, false subject-anchor behavior, retained source-class enforcement, repeated-block handling, and both ongoing control prompts.

The fixes are on GitHub `main`; this does **not** prove that the current Replit workspace has imported them. The Replit audit records the older imported source snapshot. Sync/import the resulting main revision and confirm the running source revision before any future operator-launched run.

## Review verdict

The project boot, active-job lock checks, audit-file routing, preflight and static gates were handled carefully. The live launch was one-at-a-time and model-owned, with no forced target or manual key rotation. The investigation did the right thing by failing closed rather than inventing a person or inserting a card.

The failure is nevertheless meaningful: the control loop still allowed an abstract pivot, and the deterministic guard converted that into repeated blocked actions instead of useful scope feedback. The provider classifier repair is narrow and supported by regression evidence; the scope remediation addresses the separate failure. Cards should remain absent on these runs because the evidence/admission gates were never crossed.

No live Apex/Replit run was started or replayed during this remediation. Review the CI checks associated with the remediation commit before considering another operator-launched test.
