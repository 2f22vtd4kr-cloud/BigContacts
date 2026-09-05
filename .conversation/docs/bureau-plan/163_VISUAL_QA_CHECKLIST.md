# Volume 163 — Visual QA Checklist (Every Desk Build)

Run on desktop ≥1280px and mobile 390px width.

## Live Desk

- [ ] Integrity strip readable; critical state is obvious (color + text)
- [ ] Launch controls not clipped
- [ ] DigSpan strip shows at least stage chips during dig
- [ ] Card preview primary not truncated mid-number
- [ ] Stop returns UI to idle without stale “running” forever
- [ ] No horizontal scroll unless intentional chip row

## Entities

- [ ] Phone source visible at list density
- [ ] Org vs personal distinguishable without reading source string only
- [ ] REACH tel: opens dialer on mobile
- [ ] Empty+evidence CTA visible
- [ ] Filters don’t hide all honest org contacts when “hasPhone” on

## Reactor / scheme

- [ ] Nodes reflect spans actually run (not a fantasy full graph)
- [ ] Mobile stack order: card → spans → log

## Accessibility

- [ ] Focus order logical
- [ ] Contrast on muted source text ≥ readable gray on dark/light theme as applicable
- [ ] Buttons have names for screen readers (“Rehydrate card”, “Stop Atlas”)

## Regression screenshots

Store under `docs/scoreboard/ui-shots/` with tip SHA in filename when fixing L-UI-HIDE class bugs.

