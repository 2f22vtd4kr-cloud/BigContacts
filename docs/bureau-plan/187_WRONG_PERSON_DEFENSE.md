# Volume 187 — Wrong-Person Defense Without Contact Elimination

## Tension

Collision controls exist to prevent −1 scoreboard events (wrong person). Over-aggressive collision **eliminates** valid contacts — another way to lose to chat.

## Balance rules

1. Collision **demotes to evidence / orgish**, does not delete the value from the bag
2. Host blocklist triggers risk on **promote-as-personal**, not on storing evidence
3. Same-issuer company token overlap **reduces** false collision
4. Operator can still see the value in evidence and decide
5. Never use collision as a blanket “drop all phones for common names”

## UI

Evidence rows with identityCollisionRisk show a warning icon but remain openable.

## Tests

- Common name + wrong host → not personal primary
- Common name + matching issuer host → allow org or personal per scores
- Value always still in evidence when extracted with URL

