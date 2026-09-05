# Volume 281 — Trajectory as Debugger of Record

## Claim

When Apex loses a COMPARE or a card stays empty after a dig, the **first** artifact to open is the dig trajectory (DigSpan + bureau live events)—not a new system-prompt essay and not a new force-hop design.

## Industry method (ReAct debugging)

Production agent debugging treats the loop as data:

`Thought → tool call → observation → … → done / timeout`

Modern stacks use native tool calls; the debug object is still the ordered trajectory. Honeycomb Agent Timeline and LangSmith-style views emphasize **which agent**, **which tool**, **where it failed**.

### Capture (Apex)

Step index, tool name, args (redacted), observation summary, errors, timing, stop reason (`done` / timeout / maxIter / cancel), under a **jobId** / conversation id. DigSpan `agentName` (investigator / discovery) binds the lane.

### Procedure

1. Confirm dig ran (`web_search` / `visit` / tool spans). If none → **L-NO-DIG** (launch path or integrity).
2. Locate the **first bad step**: useless query, empty observation treated as success, parse-fail loop, early `done` with empty bag.
3. Check whether CONTACT FACTS or evidence rows appeared after visits.
4. Check promote / rehydrate / final-review overwrite (protected phone sources).
5. Assign **L-code**; ship **one** fix; re-cook the same target.

## Product surfaces

Reactor DigSpan strip, Live Desk, `recentSpans` on `atlas-status`, job log `BUREAU|` lines, discovery spans with `agentName: discovery`.

## Non-goals

- Lighting the entire tool catalog as a poster.
- Replacing trajectory readouts with phase poetry (`Window 6 of 6` plan language—retired).
- Using trajectory as a script to force the next hop.

## Planning rule

Any proposal that adds dig behavior without explaining how it appears in DigSpan is incomplete.
