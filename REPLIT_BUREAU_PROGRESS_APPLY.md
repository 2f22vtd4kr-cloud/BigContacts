# Replit: finish Bureau sentient progress wiring

Branch: `bureau-sentient-progress-20260809`
PR: https://github.com/2f22vtd4kr-cloud/BigContacts/pull/17

## Already committed on this branch

1. `artifacts/api-server/src/src/lib/investigation-progress.ts`
   - Standard vectors: email, phone, LinkedIn, Instagram, Twitter/X, Telegram, TikTok, website, registries, username footprint
   - Statuses: pending | attempted | found | verified_personal | organization_only | negative
   - `classifyRouteMarker` for UI badges

2. `artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts`
   - Right-hand advisor uses Apex Atlas goal + investigation_progress when recommending the next action

3. `artifacts/api-server/src/src/lib/case-bureau-prompt.ts`
   - `buildApexAtlasBossPlanPrompt` — crystal-clear Apex Atlas goals, pending-vector control, human-like investigator prompts, return ALL public contacts

## One-line wire-up for Replit Agent (paste as task)

```
In artifacts/api-server/src/src/lib/case-bureau.ts:
1. Import computeInvestigationProgress, formatProgressForPrompt, classifyRouteMarker, InvestigationProgress from ./investigation-progress
2. Import buildApexAtlasBossPlanPrompt from ./case-bureau-prompt and use it inside runGeminiBossPlan instead of buildGeminiBossPlanPrompt (or replace buildGeminiBossPlanPrompt body to call buildApexAtlasBossPlanPrompt)
3. Add to BureauContactRoute: marker and markerLabel fields; set them in normalizeRoutes via classifyRouteMarker
4. Add investigationProgress: InvestigationProgress to ResearchCaseFile
5. In buildInitialCaseFile: compute investigationProgress from contactRoutes + evidenceSummary and include on the case file
6. In buildActions: raise priority of expand-contact-routes and run-digital-footprint when pendingVectors includes social/phone/email/username_footprint; raise map-ownership when registries pending; list pending vectors in rationale
7. In parseCaseFile: backfill investigationProgress and route markers for older case JSON

In artifacts/apex-finder/src/pages/research.tsx:
1. Extend BureauContactRoute type with optional marker/markerLabel
2. Add investigationProgress to BureauCaseFile type
3. In BureauCasePanel: show coverage chips + vector status grid; show ALL contact routes (up to 40); badge verified_personal in emerald, personal_review in sky, organization in amber
4. Never hide non-verified routes — only mark them

Rules: real public data only; no synthetic contacts; Replit-safe TypeScript only; keep adaptive gap-driven design (not a rigid ordered pipeline).
```

## Design intent

- Bureau is **sentient** about progress (vector coverage map on every case).
- Research stays **adaptive / creative**, not a fixed checklist order.
- **All** contacts display; verified personal get UI markers.
- Boss + right-hand share **crystal-clear Apex Atlas goals**.
