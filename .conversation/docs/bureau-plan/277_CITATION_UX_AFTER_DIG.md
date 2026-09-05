# Volume 277 — Citation UX After Dig

## Industry parallel

Anthropic’s multi-agent research system separates **research** from a **citation** pass so claims map to sources. Apex already requires `sourceUrls` for promote; the desk must make those URLs **visible and trustworthy** at the chip, not only in evidence JSON.

## Product requirement

Every contact chip on ContactSurface and profile REACH should expose:

1. **Value** (phone / email / url)
2. **Scope label** (personal / organization / notice-class)
3. **Source affordance** — link or panel to at least one http(s) URL that justified the value
4. **Source class** when useful (`agentic-web`, `EDGAR-Notice-Phone`, org vehicle)

## Anti-patterns

- Chip with no way to open provenance.
- “Direct” styling without URL behind it.
- Dumping raw `BUREAU|` logs as the only citation UI.

## Implementation direction (when building)

- Prefer existing evidence rows + `phoneSource` over new dig logic.
- Click chip → evidence drawer filtered to that value.
- Live Desk card panel should list the same URLs the promote path used.

## Non-mapping

Citation UX is **presentation + navigation**, not a second model that re-decides contacts after dig.
