# Apex Atlas — 2026-08-10 Visibility Floor Session

## Posture (locked)
- Apex Atlas is the primary full-spectrum OSINT desk.
- Related / org / candidate contacts must always be visible.
- Fail-closed = never invent; never mark Personal without strong verified evidence.
- Empty entity ledger after candidate-producing runs = bug.

## Floor commit
c4fc077 feat(bureau): contact refresh on read, job registry-shallow honesty, person-first mixer

## Phase A shipped
- `materializeDiscoveryReviewCandidates` in `research/cases.ts`
  - On discovery completion and verification completion, non-trash named review candidates are written to entities (reviewOnly, contactOutcome=evidence_only) + contact_evidence.
  - Source profile URLs persisted as website/linkedin candidate vectors.
  - No target promotion. No Personal mark.
- Discovery + verification job messages now report `ledgerMaterialized`.
- Case file `admittedEntityId` set so admit path remains idempotent.

## Ranking / labels
- `presented-contacts.ts`: rank Personal → organization → candidate.
- Labels: "Looks personal" / "Company · related" / "Still a lead".

## Phase D (partial)
- `GET /api/ingest/job/active/:type` returns 200 with `{ active: false, jobId: null }` when idle (no more 404 that breaks multi-case queues).
- Terminal statuses remain done | failed | cancelled.

## Still open
- Phase B secondary expansion (LinkedIn, Signal, aggregator claims as leads on person-shaped retention).
- Full proof run against quiet officer / Trace-Cohen-class lead.
- Healthz honesty surface polish.

## Phase B shipped (4880308)
- `expandSecondaryPublicSurface` in bureau-contact-persist.ts
- On materialize: up to 5 person-shaped candidates get free OSINT LinkedIn/email/phone/website as candidate leads only
- UI labels aligned: Looks personal / Company · related / Still a lead

## Commits
- 22ac95e Phase A visibility + active-job 200-when-idle
- 4880308 Phase B secondary expansion
