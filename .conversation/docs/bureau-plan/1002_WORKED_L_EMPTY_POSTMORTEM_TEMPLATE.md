# Volume 1002 — Worked L-EMPTY Postmortem Template

## Header
- Date, tip SHA, entity id, name, jobId
- Integrity during run
- Depth tier

## Evidence
- DigSpan excerpt (search/visit present?)
- Evidence row count and sample values
- Card fields before/after rehydrate
- phoneSource if any

## Root cause (pick one)
- Promote not called
- Final review null
- Enricher overwrite
- Present layer missing
- Cache stale
- Identity gate blocked personal and no org promote either

## Fix
Single PR description + tests

## Re-cook
Same entity id score before/after
