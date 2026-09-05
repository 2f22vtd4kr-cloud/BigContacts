# Volume 74 — Depth Profile Wiring Checklist

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code:** agentic `maxIterations` / `hardTimeoutMs` inputs; env RESEARCH_DEPTH

## Required wiring

| RESEARCH_DEPTH | maxIterations | hardTimeoutMs (dig) | adaptive caps |
|----------------|---------------|---------------------|---------------|
| fast | ~10 | shorter | low |
| standard | ~16–20 | ~210s | mid |
| deep | ~20–24 | higher | absolute max |

## Verify

Caller of `runAgenticWebResearch` must pass profile-derived maxIterations.  
If all depths pass the same constant, **deep is a lie** — fix caller.

## Scoreboard rule

Comparisons use standard or deep only.
