# Boss + Right-hand OSINT discipline (2026-08-09)

## What changed
Hardened Case Bureau next-action quality so Boss and right-hand force primary-source OSINT style on every investigation step.

### Files
- `artifacts/api-server/src/src/lib/case-bureau-prompt.ts` — `buildApexAtlasBossPlanPrompt`
- `artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts` — right-hand advisor prompt
- `artifacts/api-server/src/src/lib/case-bureau.ts` — `buildBossOpeningPrompt`

### Required investigation loop (enforced in prompts)
1. Flag high-interest link to case / pending vectors
2. Plan multi-angle public searches (broad then precise)
3. Triage and select primary sources
4. Fetch primary pages/filings (not snippets only)
5. Structured extraction (entities, contacts, relationships, source URLs)
6. Update living case context (entity registry, contact vectors, relationship map, research log, open questions)
7. Surface next leads / exhausted vectors

### Case context document
Investigators must return findings in a form that appends to the living case file — not free-text-only discoveries.

### Decision roles
- **Right-hand**: recommends one queued action; reason must cite pending vectors + named leads + case-context advancement.
- **Boss**: final next-action decision; writes investigatorPrompt that embeds the full primary-source loop; may override right-hand with explicit reason.

### Depth
Still respects RESEARCH_DEPTH (fast default on Replit). Thoroughness is required *within* the selected action budget — no unbounded new work.

## Verify
- Open a research case and inspect Boss plan + right-hand advice traces.
- Investigator prompts should explicitly require primary fetch + structured extraction + case-context updates.
- No synthetic contacts; public evidence only.
