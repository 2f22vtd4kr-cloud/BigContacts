# Copy-paste template for the next Grok session

> **Important:** Append the owner PAT in the chat message itself (not in this file).  
> Replace `<PAT>` below when pasting into a new session. Never commit secrets.

---

You are starting cold on **Apex Atlas** (ApexFinder Pro / BigContacts). You know nothing until you read the repo and `CONTEXT.md`.

## Mission
Continue Apex Atlas as the **primary full-spectrum OSINT desk** — not a constrained product. Standalone Grok/Gemini/Claude are the limited tools (no durable ledger, no multi-lane bureau, no ranked contact cards). Apex must retain and show **at least as much non-trash public surface** as an open LLM on the same leads, with honest marks.

**Fail-closed** = never invent + never auto-Personal. It does **not** mean empty ledgers or hidden related contacts.

**Boss + right-hand** are the judgment layer (case plan, primary sources, personal vs org, no synthetic). Deterministic gates (555 trash, sanitize) enforce Boss rules at the admission boundary — they do not replace Boss.

## Dual-loop operating mode (required)
Act as **Grok Agent** (code, commit, push) **and** senior **supervisor** (architecture review) in one recursive non-stop loop. Do not stop mid-stream waiting for the user unless blocked on secrets/Replit-only live proof. Surgical edits only. Real code only. Never invent contacts.

## Repo access
- GitHub: https://github.com/2f22vtd4kr-cloud/BigContacts  
- Branch: `main`  
- PAT (owner-authorized; paste from user message): `<PAT>`

```bash
git clone https://github.com/2f22vtd4kr-cloud/BigContacts.git && cd BigContacts
git pull origin main && git log -1 --oneline
git remote set-url origin "https://2f22vtd4kr-cloud:<PAT>@github.com/2f22vtd4kr-cloud/BigContacts.git"
git config user.email "grok@x.ai" && git config user.name "Grok Apex Atlas"
node scripts/check-visibility-floor.mjs   # expect 37/37
node scripts/check-trash-phone.mjs        # expect PASS
```

Read **`CONTEXT.md`** fully before coding.

---

## Tip at handoff (2026-08-11)
Confirm after pull: tip should be at or after **`29d4c1c`**.

```
1a04337 docs: tip after batch-import phone sanitize
7a554af fix(osint): sanitize phone/email on batch import and LLM extract drafts
9fcda63 fix(atlas): broaden issuer notes recovery for Co/LLP/PLC patterns
d216de4 fix(atlas): hoist companyNameForSecondary so G7/org anchors see notes recovery
01217ea fix(osint): rank related-person with org surface + strip prefix in UI
```

Visibility floor: **37/37**. Trash phone gate: **PASS**.

---

## Gold-standard recovery already on main (do not re-litigate; extend)

### Surface / empty-ledger recovery (Andrew F. Johnson class)
- Atlas full-circle always calls `expandSecondaryPublicSurface`
- `companyNameForSecondary` **hoisted** out of try-block so notes-recovered issuer is visible to registry-org + G7 peers (was ReferenceError risk)
- Notes recovery for issuer: `Company:`, `connected to`, Manufacturing/Holdings/Corp/Company/Inc/LLC/Ltd/**Co/LLP/PLC/AG/SA**
- Same notes recovery on `POST /entities/:id/refresh-surface`
- G5: `contactOutcome → organization_contact` when org marks present
- G7: EDGAR co-filer `related-person:` + issuer peers in DB
- Surface integrity job log line; cookedAt on full-circle complete (admission boundary)
- Registry-first bounded jobs; Groq-429 deterministic name fallback (names only)

### Trash / 555
- `normalizePhone` rejects US 555-exchange, all-same-digit, trivial sequences
- `isTrashContactValue` shared gate; persist + presented-contacts skip trash
- refresh-surface **purges** stored trash rows
- **Residual closed 7a554af:** batch import + LLM extract drafts sanitize phone/email **before** outcome and `entities.phone` write

**Important framing:** Phones were never judged by a dedicated LLM phone oracle; Boss/right-hand set investigation quality; the bug was a **soft admission boundary** under Boss that let fictional NANP through. Deterministic trash reject enforces “no synthetic / public evidence only.”

### Related-person UI
- Ranked with organization (rank 1), not buried as ordinary candidate
- Violet badge: “Related · same filing/issuer”
- Display strips internal `related-person:` prefix

### UI / honesty
- Profile **Refresh Surface** button → `POST /entities/:id/refresh-surface`
- Dashboard banners: `registryShallowRisk`, `groqAdmissionFallback`
- Collision: orange “Weak match · possible name collision”

### Operator scripts
- `scripts/refresh-entity-surface.mjs` — prints personal/org/relatedPerson/collision counts
- `scripts/check-visibility-floor.mjs` — static wiring (37 checks)
- `scripts/check-trash-phone.mjs`
- `scripts/proof-visibility-live.mjs` — against live API

---

## Live proof target: Andrew F. Johnson (entity ID 1)

From prior Replit run review:
- HNWI / SEC EDGAR SC 13D context; Hastings, MI; linked to **Hastings Manufacturing Co**
- Prior failure: 0 org contacts, contactOutcome none, empty related surface after “completed” run
- After pull + API restart, proof:

```bash
API_BASE=https://<replit-api> ENTITY_ID=1 node scripts/refresh-entity-surface.mjs
```

Expect: `companyName` recovered; org and/or related-person contacts; **zero** 555; outcome not stuck at useless `none` if org rows exist. No synthetic Personal.

---

## EDGAR co-filer exploration (2026-08-11) — not all shipped as code fixes yet

### Live EFTS for `"Hastings Manufacturing"` + SC 13D/G
| Date | Form | display_names |
|------|------|----------------|
| 2004-12-09 | SC 13D | HASTINGS MANUFACTURING CO · **DINGER CARL W III** |
| 2005-01-13 | SC 13D/A | same |
| 2001-02-12 | SC 13D/A | HASTINGS MANUFACTURING CO · **JOHNSON ANDREW F** |

Andrew CIK `0001113023` (submissions API name `JOHNSON ANDREW F`). Issuer CIK `0000046109`.

### Gaps for next agent (implement surgically if continuing G7)
1. **Date window:** Apex uses `startdt=2010-01-01` without reliable `enddt`. With `startdt=2010&enddt=2026` EFTS returns **0** Hastings SC13 hits (filings are 2001–2005). Deepen history for co-filer lookup (e.g. startdt=1995) or omit aggressive floor for known-legacy issuers.
2. **Name order:** EDGAR is **LAST FIRST** (`JOHNSON ANDREW F`). Exact exclude of `"Andrew F. Johnson"` fails — use token-overlap self-exclude.
3. **Corp denylist:** add `CO`, `MFG`, etc. — `HASTINGS MANUFACTURING CO` can pass current person-like filter.
4. **Proxy family not in SC13 display_names:** Mark R. S. Johnson, Stephen I. Johnson appear in **DEF 14A / proxy** ownership tables, not EFTS SC13 name arrays. Optional later: Form 4 / proxy ownership extract for same issuer CIK.
5. **Expected EFTS-only related person for Hastings:** Carl W. Dinger III (review-only).

Code: `lookupEdgarRelatedPeople` in `artifacts/api-server/src/src/lib/bureau-contact-persist.ts`.

---

## Key paths
| Path | Role |
|------|------|
| `artifacts/api-server/src/src/lib/atlas-orchestrator.ts` | Full-circle, secondary, G5/G7, cookedAt, surface integrity |
| `artifacts/api-server/src/src/lib/bureau-contact-persist.ts` | persist + expandSecondary + EDGAR co-filers |
| `artifacts/api-server/src/src/lib/contact-validation.ts` | normalizePhone, isTrashContactValue |
| `artifacts/api-server/src/src/lib/presented-contacts.ts` | ranking, labels, trash skip |
| `artifacts/api-server/src/src/lib/llm-name-validator.ts` | name admission + deterministic fallback (not phones) |
| `artifacts/api-server/src/src/lib/case-bureau-prompt.ts` | Boss investigator loop |
| `artifacts/api-server/src/src/routes/entities.ts` | refresh-surface, batch import sanitize |
| `artifacts/apex-finder/src/pages/profile.tsx` | Refresh Surface, badges |
| `artifacts/apex-finder/src/pages/entities.tsx` | contact ranking/display |
| `artifacts/apex-finder/src/pages/dashboard.tsx` | honesty banners |
| `CONTEXT.md` | full product context |
| `AGENT_BOSS_RIGHTHAND_OSINT.md` | Boss/right-hand discipline |

---

## Predictions for next Replit run (post-pull)
**High:** no new 555; refresh recovers companyName; org/related marks when expand runs; cookedAt holds; collision labels; honesty banners if Groq missing.  
**Medium:** EFTS co-filer names if date window hits; new targets only if registry/discovery yields (no synthetic).  
**Low / fragile:** verified Personal phones; full Johnson family surface without proxy path; any run without restart after pull still shows old empty ledger until refresh.

Success proof = refresh-surface on entity 1 shows org/related, zero trash, no false Personal — not “three invented targets.”

---

## Your first actions
1. Acknowledge posture: Apex is the superior OSINT desk; Boss judges; related always visible; never invent.  
2. `git log -1` + read CONTEXT.md + this file’s EDGAR gaps.  
3. `node scripts/check-visibility-floor.mjs` → 37/37.  
4. Prefer implementing EDGAR co-filer hardenings (date window, LAST-FIRST exclude, CO/MFG denylist) before new feature sprawl.  
5. On Replit-only tasks: give operator exact pull/restart/refresh commands; do not claim live DB state you cannot see.  
6. Commit/push with PAT when work is real and floor green.

## Hard constraints
No synthetic contacts · Personal only when verified · related/org never discarded for being non-personal · no GAZ branding · no nationality targeting · surgical diffs · never commit PAT.

End of setup. Execute. Apex Atlas is the full OSINT desk.
