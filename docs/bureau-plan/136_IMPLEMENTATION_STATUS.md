# Volume 136 — Implementation Status (Live Code vs Plan)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Updated with tip that ships this file.**

## Overall completion (honest)

| Area | % | Notes |
|------|---|--------|
| Free dig (ReAct loop) | **90%** | agentic-web-research free llmStep; no force_ in dig module |
| Promote + rehydrate | **85%** | bureau-contact-persist + rehydrate callers present |
| Source lock agentic vs issuer | **80%** | in-house-enricher setPhone guards + promote ranking |
| Outcome honesty org vs direct | **85%** | computeContactOutcome + post-patch force-down |
| Identity collision | **75%** | shared module + tests; expand hosts from scoreboards |
| DigSpan + status budget | **80%** | dig-span, atlas withBudget, recentSpans, UI trajectory |
| Pause / Resume / Stop UI | **85%** | launch-atlas-button controls |
| Depth profiles | **80%** | research-depth.ts wired to maxIterations |
| EDGAR notice vs issuer | **70%** | labels + enricher priority; parser coverage TBD live |
| Boss goals-only / RH purity | **65%** | architecture present; prompt audits ongoing |
| Scoreboard process | **40%** | templates exist; must run on Replit |
| Live scoreboard win | **0–20%** | not proven until COMPARE file after re-cook |
| DigSpan jobId on target agent path | **95%** | jobId now passed into runAgenticWebResearch |

**Weighted product readiness ~74%** (jobId dig wiring + shared source priority helper) for architecture/code path.  
**Scoreboard superiority ~not proven** until Vol 68 runs.

## P0 remaining

1. Live re-cook fixtures on Replit (prove promote)  
2. File COMPARE baseline  
3. Expand collision hosts from any FP  
4. Notice-line parser coverage on sample SC 13D HTML/XML  

## Do not re-implement

- force hop dig controllers  
- Fixed dig step UI  
- Demo seed cards  

## Code map (implemented)

- `lib/agentic-web-research.ts` — free dig  
- `lib/bureau-contact-persist.ts` — promote/rehydrate  
- `lib/in-house-enricher.ts` — setPhone agentic lock  
- `lib/contact-confidence.ts` — outcomes  
- `lib/identity-collision.ts` — gates  
- `lib/dig-span.ts` + `routes/atlas.ts` — observability  
- `components/launch-atlas-button.tsx` — Pause/Stop  
- `components/dig-span-trajectory.tsx` — Live Desk spans  
