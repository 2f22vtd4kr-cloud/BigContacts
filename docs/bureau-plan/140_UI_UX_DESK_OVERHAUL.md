# Volume 140 — UI/UX Desk Overhaul (Live Desk, Entities, Reactor)

## Observed failure modes (from Live Desk / Reactor / Entities sessions)

These are product bugs, not “operator taste”:

1. **Empty primary** while evidence had phones — card looks dead; chat agent looks alive.
2. **No phoneSource** next to numbers — operator cannot trust or debug overwrite.
3. **Trajectory invisible** — progress % without DigSpan feels like a batch job, not a research agent.
4. **Outcome badge lies** — “direct” on issuer 1-800 destroys trust in one glance.
5. **Secondary contacts buried** — org/related only in evidence drawer nobody opens.
6. **Mobile Reactor** denser than useful — scheme nodes light up from spans but primary REACH still empty.
7. **Launch friction** — depth not obvious; single-target re-cook not first-class.
8. **Stale atlas-status** after stop — spans/messages linger (clear on stop is mandatory).

## Design principles

1. **Card is the product.** Everything else is instrumentation.
2. **One glance trust:** number + source + outcome badge + mark (personal/org).
3. **Trajectory is the proof of free dig** — if no web_search/visit spans, UI should say “dig did not run,” not “100% complete.”
4. **Density with hierarchy** — primary, then chip row, then related, then evidence.
5. **Mobile-first REACH** — tel: and mailto: must work; never break href with source text inside the link.

## Entities list / detail

| Element | Spec |
|---------|------|
| Phone cell | `+E.164` · muted `phoneSource` · org tint if organization mark |
| Outcome chip | Honest colors; org never green “verified personal” |
| REACH row | Chips: personal / org / social with icons; overflow “+N evidence” |
| Empty state | If evidence count > 0 but columns empty: CTA “Rehydrate card” not “No contacts” |
| Filter | hasPhone, contactOutcome, phoneSource contains agentic |

## Live Desk / Reactor

| Element | Spec |
|---------|------|
| DigSpan strip | Newest-first; agentName; llm vs tool vs promote; click expands input/result summary |
| Stage gates | target_contact_agent_start → tools → promote → done |
| Honesty banner | If bureauIntegrity critical: red “Do not compare quality” |
| Scoreboard link | One click to snapshot mean / milestonePass |
| Stop | Clears spans; status message honest “cancelled” |

## Contact presentation component (shared)

```
ContactSurface
  primary: { value, kind, source, outcome }
  routes: Array<{ value, mark, href, title }>
  related: Array<{ name, role }>
  evidenceCount: number
```

All pages use this — no one-off string concat that breaks tel: links.

## UX anti-patterns ban list

- Putting `phoneSource` inside `tel:` href.
- Showing only LinkedIn when phone exists.
- Green “verified” without human action.
- Hiding org phone because personal preferred (preferred ≠ exclusive).
- Progress 100% with zero dig spans on a research job.

## Batch acceptance (UI)

Screenshot/checklist per build:

- [ ] Fixture with notice phone shows source label.
- [ ] Fixture with only org phone shows org mark, not empty.
- [ ] Dig run shows ≥1 web_search span in strip.
- [ ] Stop clears active strip.
- [ ] Mobile REACH dial works.

