# Volume 185 — Entities List API Contract (Card-Ready Rows)

## Each list row should expose

```
{
  id, name, type,
  contactOutcome,  // honesty-normalized
  phone, phoneSource,
  email,
  linkedinUrl,
  presentedContacts: ContactRoute[],  // full surface
  evidenceCount?: number,
  cookedAt?
}
```

## Client rules

- Render `presentedContacts` if non-empty; else fall back to phone/email columns
- Never assume phone alone is the full story
- tel: from route.href only

## Performance

Present helper must be batch-safe (load evidence for page of ids, not N+1). Cache invalidation on promote already required.

## Acceptance

Network tab on Entities page shows presentedContacts including org mark for org-only fixture.

