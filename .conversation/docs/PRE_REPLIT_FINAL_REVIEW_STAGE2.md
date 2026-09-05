# Apex Atlas — Pre-Replit Final Review · Stage 2

**Depends on:** Stage 1 (`docs/PRE_REPLIT_FINAL_REVIEW.md`) — env up, healthz green, P0 UI screenshot pack started or done.  
**Stage 2 focus:** *behavior under real load* — pipeline honesty, contact quality, ledger mutations, reactor truthfulness, natural Grok comparison, ops edge cases, Replit dry-run acceptance.  
**Still forbidden:** fabricated screenshots, seeded “demo HNWI”, vanity domains, one-line fake fix cycles.

Record at start:
- `main` SHA: ________
- Reviewer notes file: `docs/PRE_REPLIT_REVIEW_LOG.md`

---

## Stage 2 map

| Block | Name | Exit of block |
|-------|------|----------------|
| S2-A | Live atlas-run telemetry | Launch → events → Stop with screenshots |
| S2-B | Contact quality & trash gates | No jdoe/555/org-as-personal in ledger |
| S2-C | Ledger mutation suite | Delete / bulk / purge verified |
| S2-D | Reactor method chrome truth | Chrome matches actual tool kind |
| S2-E | Natural comparison protocol | Apex vs Grok Agent, fair rules |
| S2-F | Failure & offline modes | API down, Redis down, missing keys |
| S2-G | Security & secret hygiene | No key leakage in UI/logs/git |
| S2-H | Performance & density | Mobile reactor usable mid-run |
| S2-I | Replit dry-run checklist | Prompt + boot sequence frozen |
| S2-J | Go / no-go gate | Signed exit to Replit |

---

## S2-A — Live atlas-run telemetry

### A1 Preconditions
- [ ] `ENABLE_AUTO_PIPELINE=false`
- [ ] At least one search key + one LLM key active in healthz
- [ ] Ledger may be empty (preferred for clean run)

### A2 Procedure
1. Screenshot Overview idle (D+M).
2. `POST /api/ingest/atlas-run` via **Launch Apex Atlas** in UI (not only curl).
3. Confirm UI switches Launch → **Stop** / running state within poll window (~4s).
4. Open `/reactor` — capture:
   - Arming / powering lanes
   - First live step
   - ≥3 distinct method scenes if run produces them (Search / Fetch / Extract…)
5. Confirm step strip scroll + **Live** jump lands on current step.
6. Press **Stop** — job stops; UI returns to launchable state; no ghost double Launch.
7. `GET /api/ingest/atlas-status` (or jobs page) reflects terminal state.

### A3 Pass / fail
| Pass | Fail |
|------|------|
| Events are real tool narratives | Idle forever with “healthy” keys |
| Stop works once | Launch stays clickable while job active |
| No `andrew*.com`-style invented URL | URL bar shows unverified vanity host |

**Screenshots:** `s2-a-idle`, `s2-a-running`, `s2-a-reactor-live`, `s2-a-stopped` (D+M where relevant).

---

## S2-B — Contact quality & trash gates

### B1 Automated
```bash
# from repo root, with API deps available
pnpm exec # or node path as in repo
node scripts/check-trash-phone.mjs          # if present
# unit tests if wired:
# pnpm --filter api-server test -- contact-quality
```

### B2 Manual ledger inspection (after any research run)
For each new person/company row:
- [ ] Email: not `jdoe@`, `john.doe@`, role-only invent
- [ ] Phone: not `555`, sequential, all-zero
- [ ] Org shared inbox not marked as personal / “Verified direct” without evidence
- [ ] `contactOutcome` consistent with vectors shown on card
- [ ] Source / evidence path exists or UI says unknown — never silent invention

### B3 Write-path grep (code review, once)
Confirm still imported on ingest / cases / enrich paths:
- `isTrashPhone`
- `isPlaceholderEmail`
- `isTrashContactValue`
- bag-attach org phones only as **organization** routes

### B4 Pass / fail
Any trash row in ledger after a production-style run = **P0**, fix before Replit.

---

## S2-C — Ledger mutation suite

| Test | Steps | Expected |
|------|-------|----------|
| C1 Single delete (desktop) | Row trash → confirm | 204; row gone; list refresh |
| C2 Single delete (mobile) | Expand card → Delete → confirm | Same |
| C3 Bulk delete | Select 2+ → Delete → confirm | `POST /entities/bulk-delete`; selection cleared |
| C4 Purge all | Clear ledger → type `DELETE ALL ENTITIES` | `POST /entities/purge-all`; count message; empty desk |
| C5 Purge abort | Open modal → wrong phrase / Cancel | No deletes |
| C6 Star / hide | Toggle on mobile + desktop | Persists after refresh |

**Screenshots:** mobile expanded actions; bulk bar; purge modal (empty phrase + ready phrase).

**Safety:** Prefer a disposable DB or empty ledger for C4. Never purge a valued production DB in this test without backup.

---

## S2-D — Reactor method chrome truth

For each live/history scene during S2-A (or replay history):

| Observed tool / provider | Expected chrome method |
|--------------------------|------------------------|
| Tavily / Exa / Serp / Google | Search (serp/google) |
| Scrapfly / Zenrows / page fetch | Fetch (browser) |
| Groq / Gemini / extract | Extract (prompt) |
| RDAP / WhoisJSON | Domain |
| holehe / maigret / sherlock | Footprint |
| Other bureau step | Bureau |

### Fail conditions
- [ ] Any remaining `#FF5F57` / `#FEBC2E` / `#28C840` traffic lights
- [ ] Browser chrome on pure LLM extract steps
- [ ] “Public page” URL bar filled without extracted URL

**Screenshot matrix:** one frame per method that actually fires in the run.

---

## S2-E — Natural comparison protocol (Apex vs Grok Agent)

**Purpose:** Prove Apex is not behind a cold general agent on attributable contacts. Any strong-agent edge on the same public surface = severe pipeline bug.

### E1 Fair rules (non-negotiable)
1. **Same target string only** — company or person name shared; no pasting Apex results into Grok.
2. **Independent runs** — Apex via Launch/desk; Grok Agent via separate clean prompt:  
   *“Find important related people and how to contact them for {TARGET}. Public sources only. No invented emails/phones.”*
3. **No handicapping** — do not starve Apex keys; do not tell Grok to be shallow.
4. **Score only attributable contacts** — name + role + vector (email/phone/profile) with public rationale.
5. **Trash does not count** for either side.

### E2 Target selection
- Prefer **new** mid-market company not used in prior session holdouts.
- Avoid ultra-famous corps where both systems saturate on press pages.

### E3 Scoreboard template
| Dimension | Apex | Grok Agent |
|-----------|------|------------|
| Named principals | | |
| Direct/personal vectors | | |
| Org-only vectors (labeled correctly) | | |
| Invented / trash | | |
| Provenance clarity | | |

### E4 Outcome
- Apex ≥ Grok on personal/attributable vectors → pass Stage 2 research bar  
- Grok ahead on real contacts → **P0** investigation (search prompts, CONTACT FACTS, validation over-blocking, provider failures)

Log raw notes in `docs/PRE_REPLIT_REVIEW_LOG.md` (redact secrets).

---

## S2-F — Failure & offline modes

| Scenario | How to simulate | UI must |
|----------|-----------------|--------|
| API killed | Stop API process | Offline/unavailable banners; no white crash |
| Bad `/api` proxy | Point UI at closed port | Same |
| Redis missing | Unset REDIS_URL_* | healthz degraded; Launch fails clearly |
| No search keys | Unset Tavily/Serp/Exa | Status shows missing; no silent empty success |
| `?mock=1` | Open routes with mock | Empty scaffolds only — **zero** people |

**Screenshots:** status degraded; ledger unavailable; mock empty overview/ledger.

---

## S2-G — Security & secret hygiene

- [ ] No API keys in client bundle (`rg` build output / network responses)
- [ ] No keys in README, commits, screenshot EXIF text
- [ ] Purge / delete confirmations required (no single-click wipe)
- [ ] Replit prompt lists **names only**, never pasted secret values
- [ ] PAT used only for git; not embedded in frontend

---

## S2-H — Performance & density (mid-run)

During an active run on mobile 390×844:
- [ ] Reactor remains scrollable; chrome not covering all content
- [ ] Step chips usable (tap switches scene)
- [ ] No multi-second UI freeze on each event poll
- [ ] Header keys chip row scrolls horizontally if overflow
- [ ] After 6+ steps, density still readable (Stage 1 density pass holds)

Mark **P1** if usable but ugly; **P0** if unusable.

---

## S2-I — Replit dry-run checklist (document only until Stage 2 pass)

Freeze these facts into the eventual Replit prompt:

1. Import `https://github.com/2f22vtd4kr-cloud/BigContacts` branch `main` @ SHA ______
2. Required root files present (not sparse)
3. Secret **names**: `REDIS_URL_1`…`_5`, `EXA_1`, `EXA_2`, plus full provider list (no GOOGLE, no WHOXY required)
4. `ENABLE_AUTO_PIPELINE=false`
5. Ports: API `8080`, UI `23695`; Vite `/api` proxy; API serves SPA for public URL
6. `pnpm install` → schema push → Python tools script **required** (not “optional warning”)
7. Smoke: healthz, Launch 202, cancel lock, empty ledger on fresh DB

Do **not** burn a Replit quota until S2-J is green.

---

## S2-J — Go / no-go

### Go to Replit only if
- [ ] S2-A Launch/Stop + live reactor screenshots exist
- [ ] S2-B no trash in sampled ledger
- [ ] S2-C delete + purge path verified (or purge tested on empty DB)
- [ ] S2-D no traffic lights; methods coherent
- [ ] S2-E comparison logged (Apex not clearly behind)
- [ ] S2-F offline/mock don’t crash the desk
- [ ] S2-G no secret leakage found
- [ ] Stage 1 P0 UI items closed or waived with reason

### No-go
Any P0 open → fix on `main`, re-run the failed block, new screenshots, then re-evaluate.

---

## Stage 2 screenshot index

```
screenshots/final-review/stage2/
  s2-a-idle-d.png
  s2-a-running-d.png
  s2-a-reactor-live-m.png
  s2-a-stopped-d.png
  s2-c-mobile-delete.png
  s2-c-purge-modal.png
  s2-d-method-search.png
  s2-d-method-fetch.png
  s2-d-method-extract.png
  s2-f-status-degraded.png
  s2-f-mock-empty.png
  s2-h-reactor-dense-m.png
```

---

## Relationship to Stage 1

| Stage 1 | Stage 2 |
|---------|---------|
| Does the desk *look* and *route* correctly? | Does the desk *research and mutate data* correctly? |
| Static + light interaction | Full job lifecycle + quality gates |
| All routes screenshot | Deep on reactor, ledger, status, comparison |
| Design system | Truthfulness under live providers |

Execute Stage 2 only after Stage 1 setup (Phase 0) works. You may interleave Stage 1 P1 routes with S2-A if time-boxed, but **do not skip S2-B/E before Replit**.

---

## After Stage 2 passes

1. Append results to `docs/PRE_REPLIT_REVIEW_LOG.md`
2. Tag or note SHA: `pre-replit-stage2-pass`
3. Generate ultimate Replit Agent prompt from S2-I frozen facts
4. Deploy once — no mid-boot redesign

---

## Next: Stage 3

Hosted acceptance, observability, rollback, post-deploy floor: [`docs/PRE_REPLIT_FINAL_REVIEW_STAGE3.md`](./PRE_REPLIT_FINAL_REVIEW_STAGE3.md)
