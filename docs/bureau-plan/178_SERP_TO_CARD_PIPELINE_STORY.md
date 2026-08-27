# Volume 178 — SERP → Visit → Finding → Evidence → Promote → Card (Happy Path)

## Story

1. **Launch** single-target, depth standard, integrity ok.
2. **Target agent** starts; DigSpan stage active.
3. **Model** chooses `web_search` with a person+company oriented query (its choice).
4. **Observation** returns ranked results including sec.gov and company IR URLs.
5. **Model** chooses `visit` on an IR or filing URL.
6. **Observation** includes tel/mailto candidates and page URL.
7. **Model** emits `done` findings with vectorType phone/email, value, sourceUrls.
8. **Persist** writes contact_evidence rows.
9. **Promote** selects best personal/notice for columns; org values remain presentable.
10. **Card** shows primary + chips; cache invalidated.
11. **Final review** cannot null protected phones.
12. **Scoreboard** scores 1 or 2.

## Break points (debug map)

| Step | Break | L-code |
|------|-------|--------|
| 1 | integrity critical | L-NO-DIG |
| 3 | no search spans | L-NO-DIG / L-SCRIPT |
| 5 | never visits | quality / orientation |
| 7 | findings without URLs | Article IV |
| 8 | persist fail | infra |
| 9 | promote skip | L-PROMOTE |
| 10 | UI hide | L-UI-HIDE |
| 11 | wipe | L-OVERWRITE |

## Teaching use

New implementers walk this story before adding phases. If a change does not strengthen a step on this path, question it.

