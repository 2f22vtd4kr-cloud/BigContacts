# Volume 253 — Rehydrate Contract

## Definition

**Rehydrate** = promote durable `contact_evidence` rows onto entity card columns
and presented contacts **without** starting a new dig.

## API

`POST /api/entities/rehydrate-contacts`

- Body `{ entityId }` → one entity
- Body `{ limit }` → batch thin cards (default ≤80)

Implementation: `rehydrateEntityCardFromEvidence` → `promoteBureauContactsToEntityCard`.

## When the desk calls it

| Trigger | Why |
|---------|-----|
| Profile dig idle | Catch lag between persist and card columns |
| Entities dig idle | Same |
| Dig selected per id | Same |
| Manual “Rehydrate cards from evidence” | Operator recovery |
| Profile ContactSurface empty CTA | Operator recovery |

## Cache

Promote clears `entities:list:*`, `dashboard:*`, `scoreboard:*` patterns.

## Non-goals

- Rehydrate does not invent Personal contacts.
- Rehydrate does not replace free dig; it only surfaces what dig already bagged.
