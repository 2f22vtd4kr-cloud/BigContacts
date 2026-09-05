# Volume 165 — Orchestrator Phase Honesty

## Problem

Multi-phase Atlas can report high progress while the only phase that matters for outreach (target contact agent dig) was skipped, failed closed, or overwritten later.

## Rules

1. Telemetry stages must not claim “complete” for dig if agent returned unavailable with zero findings and zero searches — status should read review/error.
2. When agentCardReady, skipping parallel AI OSINT is correct; UI should say “agent owns card,” not imply more research happened.
3. cookedAt means full-circle finished, not “contacts found.”
4. Job message strings should prefer target-level truth: “Card phone … (agentic-web)” over “Phase 8/10.”

## Operator mental model

Phases are **plumbing**. Dig + promote + card are **product**.

