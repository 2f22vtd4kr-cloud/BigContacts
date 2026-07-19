---
name: Import startup rule
description: What to read and update at the start of every session, especially after a GitHub import.
---

## Rule

At the start of every session (and always after a GitHub import), read both:
1. `replit.md` — architecture, env vars, ingestion endpoints, data integrity rules, user preferences
2. `Context.md` — current environment status, what's pending, iteration log

**Why:** These two files together give the full picture of where the project stands. `replit.md` is stable reference; `Context.md` is the live running state. Without both, you will miss pending secrets, empty-DB conditions, or broken workflows.

## Update rule

Before finishing any turn that makes a meaningful change, update `Context.md`:
- Update the "Current State" section (env vars set/missing, workflow status, DB record counts)
- Append a row to the Iteration Log with today's date and a one-line summary

Also update `replit.md` "Current Data State" table whenever ingestion runs change record counts.

## How to apply

- On import task assignment: read both files before touching anything else.
- After ingestion run: update DB record counts in both files.
- After adding a new secret: update the Environment section in `Context.md`.
- After schema changes: update `replit.md` Database Schema table.
