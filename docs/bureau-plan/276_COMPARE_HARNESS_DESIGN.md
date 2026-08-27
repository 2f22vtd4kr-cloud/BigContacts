# Volume 276 — COMPARE Harness Design

## Purpose

A **COMPARE** artifact is a time-boxed, same-target comparison between Apex card outcomes and an independent open-web (or single-agent) pass. It is the external honesty layer the scoreboard snapshot cannot supply alone.

## Protocol (normative)

1. **Freeze targets** — list entity ids + display names before either side runs.
2. **Apex pass** — integrity ok; single-target dig (or batch with known ids); record tip SHA, depth, jobId, DigSpan presence.
3. **Baseline pass** — same names, public sources only; no private DBs; do not count paywalled personal emails as wins unless primary URL is public.
4. **Scoreboard** — apply vol 87 rubric (−1…2) per target for both sides where applicable; Apex side uses card fields + `phoneSource` / outcome.
5. **L-codes** — tag failures (L-EMPTY, L-ISSUER, L-ORG-AS-DIRECT, L-COLLISION, L-NO-DIG, L-OVERWRITE, L-SCRIPT).
6. **Archive** — `docs/comparisons/COMPARE_YYYY-MM-DD_<label>.md` with SHA, integrity, table, verdict.

## What counts as an Apex win on a target

- Equal or better **primary** public route (notice line, firm HQ, named IR, personal with URL) **on the card**.
- Honest org labeling when only org surface exists.
- No wrong-person bind.

## What does not count

- Longer dig logs without card fields.
- Issuer switchboard labeled personal.
- “We visited the page” without promote.

## Relation to free dig

COMPARE must never motivate reintroducing force-hops. If Apex loses, fix **promote, observation quality, or identity**—or accept the public surface is thin—not a playlist.

## Automation boundary

Scripts may emit scoreboard shells and templates (`compare-template.mjs`, `scoreboard:shell`). Human or separate agent baseline remains outside the dig controller.
