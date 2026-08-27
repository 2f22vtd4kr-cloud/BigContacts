# Volume 145 — Failure Taxonomy (L-codes) Expanded

## Codes (scoreboard + logs)

| Code | Meaning | Typical fix |
|------|---------|-------------|
| L-EMPTY | Dig ran or didn’t; card empty | Trajectory check; promote; protect overwrites |
| L-NO-DIG | No web_search/visit spans | Models/keys; free dig regression; integrity critical |
| L-ISSUER | Only low-value issuer line when notice/personal existed in evidence | Notice boost; promote priority |
| L-ORG-AS-DIRECT | Label lies | Outcome honesty gates |
| L-COLLISION | Wrong person risk promoted | Identity collision hosts; graph gate |
| L-SCRIPT | force_* or ladder detected | CI fail; delete scripts |
| L-TIMEOUT | Budget hit with partial findings not promoted | Persist partial; rehydrate after timeout |
| L-PROMOTE | Evidence has values, columns empty | Promote allow rules; rehydrate CTA |
| L-OVERWRITE | Dig win then wiped | Source priority; final-review protect |
| L-UI-HIDE | Backend has contact, UI doesn’t show | Card layout; contacts[] mapping |
| L-BASELINE-BETTER | Chat agent primary strictly better | Free dig quality; search depth; visit rate |

## Logging

Every completed single-target run should attach `lossCodes: string[]` into atlas metadata or COMPARE row for trend analysis.

## Priority order for engineering

L-SCRIPT > L-OVERWRITE > L-PROMOTE > L-NO-DIG > L-UI-HIDE > L-ORG-AS-DIRECT > L-ISSUER > L-TIMEOUT > L-COLLISION > L-BASELINE-BETTER > L-EMPTY

