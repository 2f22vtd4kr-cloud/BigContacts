# Boss + Right-hand OSINT discipline (2026-08-09)

## Status on main
- `case-bureau-prompt.ts` — Boss plan: **merged** (primary-source 7-step loop + case context)
- `nvidia-nim-case-reasoning.ts` — right-hand: **merged** (quality bar + case-context advancement)
- `case-bureau.ts` — Boss opening: apply via `node scripts/apply-boss-opening-osint.mjs` (idempotent)

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

## Replit
```bash
git pull
node scripts/apply-boss-opening-osint.mjs   # Boss opening prompt (idempotent)
```

## Verify
- Open a research case and inspect Boss plan + right-hand advice traces.
- Investigator prompts should require primary fetch + structured extraction + case-context updates.
- No synthetic contacts; public evidence only.
