# Volume 210 — Sanitize vs Recall Balance

## Tension

Aggressive sanitize drops good international numbers and edge formats; weak sanitize admits trash.

## Rules

- Prefer E.164 normalization when possible
- Do not drop numbers solely for spaces/dashes
- Drop obvious fake patterns (0000000, 1234567890) if already in trash rules
- Never “sanitize away” the only IR line on the page

## Test

Corpus of real IR and notice numbers from public pages must pass sanitizePublicPhone.

