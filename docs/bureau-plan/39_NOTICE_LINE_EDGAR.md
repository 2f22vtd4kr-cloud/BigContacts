# Volume 39 — EDGAR Notice-Line vs Issuer Phone

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Problem

`queryEDGAR` historically took person search hits, loaded **issuer** submissions, and stored `facts.phone` (company switchboard) on the person card. Independent audits (Gund 609…, Feinberg 203… class) beat Apex when cards showed issuer lines.

## Correct extraction order

1. Prefer SC 13D/G and Form 3/4 **for the reporting person**
2. Parse **notices and communications** / reporting person address blocks from filing text
3. Label `EDGAR-Notice-Phone` when phone sits in person notice context
4. Issuer CIK main line → `EDGAR-Phone` → **organization_contact only**
5. Never overwrite `agentic-web*` with `EDGAR-Phone`

## DEF 14A

Early identity boost: role lines, proxy mailing, related officer names — person-like tokens only, chrome blocklist on.

## Acceptance

Re-cook Feinberg/Gund-class targets: notice or dig firm line preferred; outcome honesty preserved.
