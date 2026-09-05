# Volume 38 — Sanitizers Specification

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Purpose

Deterministic filters protect the ledger from trash without becoming dig playbooks. Sanitizers gate **admission**; they do not invent research steps.

## Phone sanitizer

Reject or flag:
- 555 exchange fictional patterns used in historical soft-admit bugs
- All-zeros / repeated digit garbage
- Numbers shorter than plausible E.164 national length after normalize
- Extension-only fragments without base number

Normalize:
- Prefer E.164 when country context known
- Store display form separately if needed

## Email sanitizer

Reject:
- filename-like local parts tied to assets (bundle.js@…)
- known placeholder domains
- registrar privacy buckets when marked non-person
- naked `example.com` / `test.com` class

Allow with org scope:
- info@ contact@ office@ team@ careers@ press@ ir@ investor@ when host is org-like

## Host / URL sanitizer

Reject evidence sourceUrls that are:
- javascript: void
- chrome SEC nav paths mistaken as people
- data: URIs

## Related-name sanitizer

Reject tokens matching UI chrome: Home, Skip, Menu, Close, Search, Next, Previous, Login, Cookie, Accept, Privacy Policy (case-insensitive whole token rules).

Accept person-like: capitalized multi-token names, optional middle initials, suffixes Jr/Sr/III.

## Interaction with promote

Sanitizer runs **before** collision assess and outcome. Failed sanitize → no card promote (evidence optional with reason).
