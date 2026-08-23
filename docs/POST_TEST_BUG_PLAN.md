# Post-test bug plan — Apex Atlas (Replit live runs)

**Captured:** 2026-08-23 (S Joseph Moore run + mobile screenshots)  
**Purpose:** Work queue after testing. Do **not** treat this as optional polish — several items make the desk **lie**.

---

## P0 — Desk lies about job state (same screen)

### BUG-01 · Atlas idle **and** researching at once
**Seen:** Header/control = `Atlas researching…` + Pause/Stop; Reactor body = `NOMINAL` / `Atlas idle` / `Standby — launch from header or Overview`.  
**Cause (likely):** Live Activity / Reactor idle banner reads a different signal than Overview header (`atlas-status.active` vs local cache vs telemetry age vs “all desk windows done”).  
**Fix:** Single source of truth: `GET /api/ingest/atlas-status` → `active` / `status`.  
- `status in running|paused` OR `active === true` → **only** researching chrome (no idle copy).  
- `status idle|done|failed` AND not active → **only** idle chrome (no Pause/Stop, no “researching…”).  
**Acceptance:** Impossible to show “Atlas idle” and “Atlas researching…” on the same viewport.

### BUG-02 · LIVE Activity shows “Now” on **done** windows
**Seen:** `Now: working on S Joseph Moore` while card is `DONE` and `Window 4 of 6 · done`; timestamp `6m ago`.  
**Cause:** Stale events kept as “current”; “Now” label not gated on `status === active` / fresh telemetry.  
**Fix:**  
- “Now” only if event is live **and** job is active **and** event age &lt; threshold.  
- If job active but desk events are all done/stale → inject telemetry-derived live card (already partially done; verify).  
- If job idle → no “Now” lines; archive/history only.  
**Acceptance:** Idle job ⇒ no “Now:” rows. Live job ⇒ at most one “Now” matching current target/stage.

### BUG-03 · Fixed “6 steps” / “Done 4/6” / “Window N of 6”
**Seen:** `LIVE ACTIVITY · 6 steps`, `Done 4/6`, `Window 4 of 6 · done`.  
**Cause:** UI carousel `maxScenes` and pipeline phase counters painted as if dig length were predetermined. Free ReAct has **no** fixed step total.  
**Fix (partially shipped `b1f27ca` — verify on Replit after UI rebuild):**  
- Remove “Window X of Y” and “N steps” as plan language.  
- Live: “Happening now — dig is open-ended”.  
- Batch `[n/m]` = **target index in run**, not dig steps (`Target n of m`).  
- Dots = recent tool **history**, not remaining quota.  
**Acceptance:** No copy implies a predetermined dig length.

---

## P0 — Contact quality / agent card

### BUG-04 · Name-collision email promoted to card
**Seen:** `S Joseph Moore` + Nelson Thomas Inc (SC 13D) → card email `joseph.peake@nelson.kyschools.us` from Thomas Nelson **High School** Facebook; `identityCollisionRisk: false`.  
**Cause:** Free dig + promote accepted host/name tokens (“Nelson”) without issuer/person bind.  
**Fix direction (no micro-training playbooks):**  
- Stronger **identity bind** before card promote: evidence must tie to same issuer / filing / person tokens, not token overlap on “Nelson”.  
- Directory/school/high-school hosts → reject or force review, not `direct_contact_candidate`.  
- `identityCollisionRisk` must flip true on weak binds.  
**Acceptance:** School/district mail cannot become primary card email for an SC 13D publishing target without explicit high-confidence bind.

### BUG-05 · Garbage “email” values on evidence
**Seen:** `lg_1@4x.png` stored as email from designworks page.  
**Fix:** Validator: email local/domain must pass real email shape; reject image filenames / asset paths. Fail-closed, not a research playbook.  
**Acceptance:** No `@` values that are clearly static assets on the card or evidence list.

### BUG-06 · `direct_contact_candidate` on weak/org-collision paths
**Seen:** Outcome `direct_contact_candidate` conf 70 with school email + org phone.  
**Fix:** Outcome rules: collision/org-only ⇒ `organization_contact` or `evidence_only`, not direct.  
**Acceptance:** Direct only when person-linked surface is credible.

---

## P1 — Live desk / Reactor UX

### BUG-07 · Empty “Research” body under DONE social step
**Seen:** “Checking social profiles · DONE” with empty panel (“Research” only).  
**Fix:** Every done window needs one-line result or “no public profiles found” — never blank.

### BUG-08 · Sticky LIVE after job ended / host unreachable
**Seen:** Phone shows researching while API later 502 / timeout; or idle banner vs researching header.  
**Fix:** On health/status fetch fail, degrade to “connection lost” — do not keep last “researching” forever. Clear Pause/Stop if status not active.

### BUG-09 · Replit host flaky mid-run
**Seen:** Monitor got timeouts / `repl unreachable` while UI still animated.  
**Ops:** Single Redis, API restart, avoid zombie jobs; status poll should fail job if worker dead.

---

## P1 — Architecture honesty (already intended; verify live)

### BUG-10 · Parallel phases vs free dig messaging
**Intent:** Target contact agent owns dig; card is the answer; no force_* playbooks.  
**Verify on next healthy run:** Reactor shows model `web_search` / `visit` queries; after card filled, parallel AI OSINT skipped; no “Step N of 6” dig plan language after UI pull of `b1f27ca+`.

---

## P2 — Polish

### BUG-11 · Mobile header truncation / Pause-Stop under browser chrome  
### BUG-12 · “5 LIVE” keys vs honest empty providers (regression check)  
### BUG-13 · Network tab blank without error boundary (regression check `f49b7c5`)

---

## Priority order when coding resumes

1. **BUG-01 + BUG-02** — single job truth (idle vs researching vs Now)  
2. **BUG-03** — confirm `b1f27ca` on Replit UI build  
3. **BUG-05** — reject non-email email strings  
4. **BUG-04 + BUG-06** — collision / outcome honesty  
5. **BUG-07 + BUG-08** — empty panels + stale LIVE on disconnect  

---

## Do not

- Add preference playbooks (IR penalty lists, “prefer local-part matches name” dig scripts).  
- “Fix” quality only by more force-hops.  
- Ship UI that shows idle and researching together.

---

## Related tips

| Tip | Note |
|-----|------|
| `ee28ca1` | No micro-training preference playbooks |
| `b1f27ca` | Live Desk labels — open-ended dig (must rebuild UI on Replit) |
| `7efcea8` / agent path | Target contact agent → card |

