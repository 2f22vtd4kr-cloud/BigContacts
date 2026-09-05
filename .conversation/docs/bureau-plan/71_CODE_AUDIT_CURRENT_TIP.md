# Volume 71 — Code Audit of Current Dig/Promote Stack

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Scope:** `artifacts/api-server/src/src` as of tip when this file was written. Re-run symbols after pull.

## 1. Free dig loop — PRESENT

File: `lib/agentic-web-research.ts` (~2500 lines)

| Feature | Status in code |
|---------|----------------|
| `llmStep` multi-provider | Present |
| `parseAction` free tools including done | Present |
| maxIter default 20, hard cap 24 | Present |
| hardTimeoutMs default 210_000 | Present |
| `yieldEventLoop` via setImmediate each iter after first | Present |
| done soft-reject only pure no-op | Present |
| FINDINGS SO FAR bag + HTML CONTACT FACTS merge | Present |
| Heavy OSINT soft budget (not force order) | Present |
| force_* controller in this file | **Not found** in grep of this module |

**Implication:** Dig freedom on the main agentic path is largely restored. Scoreboard losses are less likely “scripted dig” and more **promote / identity / notice-line / ops**.

## 2. Promote path — PRESENT BUT MUST BE PROVEN LIVE

File: `lib/bureau-contact-persist.ts` (~1200 lines)

Observed behaviors in source:

- Empty vector list still runs promotion from durable `contact_evidence` (rehydrate path)
- Explicit intent that free agentic findings not stay stranded as evidence_only while EDGAR-Phone remains
- `phoneSource` can become `agentic-web` or `agentic-web-org`
- Outcome forced to `organization_contact` when sources are agentic-web-org / *-org
- `rehydrateEntityCardFromEvidence` / `rehydrateAllEntityCardsFromEvidence` exist

**Still required for scoreboard:** live singleTargetId re-cook proof on Icahn/Feinberg/Gund/Czirr classes after tip deploy. Code present ≠ card proved on Replit.

## 3. Identity collision — PRESENT

File: `lib/identity-collision.ts`

- Tokenization with stopwords
- COLLISION_HOSTS includes wealth channels, people-search, majesco, bbgi, merceradvisors, …
- assessIdentityCollision pure function
- Graph name-pair helpers (module purpose in header)

**Gap:** expand hosts from every new false positive on scoreboard; ensure all promote entrypoints call it (not only one path).

## 4. DigSpan — PRESENT

File: `lib/dig-span.ts`

- Types: llm | tool | promote | error | stage
- In-memory ring cap 80
- Honeycomb/OTel-inspired comments in header
- Status plane must stay fast — Redis mirror not required for spans

## 5. Status plane — PRESENT

File: `routes/atlas.ts`

- `withBudget` on Redis reads
- `normalizeAtlasStatusMessage`
- `recentSpans` on status responses

## 6. Residual risk inventory

| Risk | Where to watch |
|------|----------------|
| apex-runtime divergence | Separate tree may still have old patterns |
| Enricher passes after dig | Must not re-apply EDGAR-Phone over agentic |
| jobId missing on secondary pass | Spans invisible in Reactor |
| Collision list incomplete | Wrong-family directs |
| Depth profile not wired to maxIterations caller | deep not actually deeper |
| UI build not deployed | Operator sees old of-6 chrome |

## 7. Audit commands (operator)

```bash
rg -n "force_" artifacts/api-server/src/src/lib/agentic-web-research.ts
rg -n "agentic-web-org" artifacts/api-server/src/src/lib/bureau-contact-persist.ts
rg -n "yieldEventLoop|withBudget" artifacts/api-server/src/src
git log -1 --oneline
```

## 8. Conclusion for strategy

**Do not spend the next week deleting force-hops that are already gone on the main dig file.**  
**Do spend it on live promote proof, enricher overwrite tests, collision expansion, notice-line, and Vol 68 scoreboards.**
