# Volume 142 — Card Layout Spec (Outreach-First)

## Visual hierarchy (desktop)

```
[Name] [Type] [Hot?] [Outcome badge]
[Role / headline]
[Primary REACH: phone · source] [email] [LinkedIn]
[Chip row: org phones, socials, domains]
[Related people strip]
[Notes / LLM summary — collapsible]
[Evidence (N) — drawer]
```

## Visual hierarchy (mobile)

```
[Name + outcome]
[Primary tel: button] [mailto:] [LinkedIn]
[Horizontal chip scroll]
[Trajectory mini-strip if live]
[Evidence link]
```

## Color / semantics

| Mark | Color intent |
|------|----------------|
| personal | cool blue / default REACH |
| organization | purple / violet (already used for org outcome) |
| social | slate |
| related | amber subtle |
| collision / rejected | muted + strike or hide from primary |

## Copy patterns

- Personal: `Phone +1… (agentic-web). Validate before outreach.`
- Notice: `SEC notice-line … Validate before outreach.`
- Org: `Registrant / office … Organization route.`

Never: “Verified personal” without operator action.

## Empty vs evidence-rich empty

If `evidenceCount > 0` && no primary:

Show: **“Routes in evidence — promote to card”** + button calling rehydrate API.

This single pattern fixes the most common “Apex looks worse than chat” screenshot.

