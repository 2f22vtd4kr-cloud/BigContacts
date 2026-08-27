# Volume 146 — Live Desk Information Architecture

## Zones

1. **Integrity strip** (bureauIntegrity, webSearchActive, agentic LLM slots)
2. **Launch controls** (Atlas run, stop, single-target id, depth)
3. **Active target header** (name, type, phase story)
4. **DigSpan trajectory** (primary proof of research)
5. **Card preview** (ContactSurface component)
6. **Bureau live log** (search/page-fetch events)
7. **Scoreboard snapshot widget** (mean, milestonePass)

## Priority when space is tight (mobile)

1. Card preview REACH
2. DigSpan (last 5)
3. Integrity (icon only if ok)
4. Log collapsed

## Copy for empty dig

If status complete and spans length 0:

**“No dig spans recorded — research may have skipped agent or failed closed. Check healthz and re-run single-target.”**

Never celebrate completion without spans on a research-intended job.

## Interaction

- Click span → side panel with inputSummary / resultSummary / modelId
- Click promote span → scroll to card phone
- Stop → immediate span clear + cancelled message

