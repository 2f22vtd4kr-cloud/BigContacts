# Boss + Right-hand OSINT discipline (2026-08-09)

## Status on main
- `case-bureau-prompt.ts` — Boss plan: **merged** (primary-source 7-step loop + case context)
- `nvidia-nim-case-reasoning.ts` — right-hand: **merged** (quality bar + case-context advancement)
- `case-bureau.ts` / `cases.ts` — apply via `node scripts/apply-workflow-fixes.mjs` + `apply-boss-opening-osint.mjs` (idempotent)
- `post-merge.sh` runs both apply scripts on cold path

## Full investigation workflow (target path)

1. **Pickup**
   - Discovery case (`POST /research/bureau/cases`) → run-discovery (right-hand → Mistral → Gemini Boss → broad web + registries) → review_only candidates.
   - Human promotes (`promote-target`) → `buildInitialCaseFile(entity)`.
   - Or direct open (`POST /research/cases` with entityId) → `buildInitialCaseFile`.

2. **Initial case file**
   - Seeds evidenceSummary + contactRoutes from entity metadata.
   - Builds actionQueue from gaps (discover-people, resolve domains, map ownership, expand-contact, digital-footprint, challenge).

3. **Advance loop** (`POST /research/cases/:entityId/advance`)
   - Load caseFile.
   - **Refresh** living context from current entity metadata (`refreshCaseEvidenceFromEntity`).
   - **Attach** investigationProgress (pending vectors, coverage).
   - Right-hand (NVIDIA NIM / GLM) recommends one queued action.
   - Boss (Gemini) writes final plan + investigatorPrompt (7-step primary-source OSINT loop).
   - Activate chosen action; **complete prior active** actions.
   - Persist + event log.
   - **Execute**: for contact / footprint / web / structure actions, call `startContactResearch`.

4. **Enrichment feedback**
   - Contact-research writes structured routes into entity metadata.
   - Next advance re-syncs them into caseFile before Boss decides again.

## Required investigation loop (enforced in Boss investigatorPrompt)
1. Flag high-interest link to case / pending vectors
2. Plan multi-angle public searches (broad then precise)
3. Triage and select primary sources
4. Fetch primary pages/filings (not snippets only)
5. Structured extraction (entities, contacts, relationships, source URLs)
6. Update living case context (entity registry, contact vectors, relationship map, research log, open questions)
7. Surface next leads / exhausted vectors

## Decision roles
- **Right-hand**: recommends one queued action; reason must cite pending vectors + named leads + case-context advancement.
- **Boss**: final next-action decision; writes investigatorPrompt that embeds the full primary-source loop; may override right-hand with explicit reason.

## Weak points closed
- Action status never transitioned to `complete` → prior actives completed on each activation
- Case file did not absorb entity enrichment → `refreshCaseEvidenceFromEntity` on every advance
- Only 3 action IDs triggered tools → expanded to structure/domain + contact/footprint/web specialists
- Discovery opening prompt lacked OSINT discipline → strengthened in `buildBossOpeningPrompt`

## Replit
```bash
git pull
bash scripts/post-merge.sh
# or surgical:
node scripts/apply-boss-opening-osint.mjs
node scripts/apply-workflow-fixes.mjs
```

## Verify
- Open a research case and inspect Boss plan + right-hand advice traces.
- Investigator prompts require primary fetch + structured extraction + case-context updates.
- Advance re-syncs contactRoutes from entity and marks prior actions complete.
- Contact-research launches for structure/domain as well as contact/footprint actions.
- No synthetic contacts; public evidence only.
