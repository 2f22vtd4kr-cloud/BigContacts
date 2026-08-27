# Volume 172 — Scoreboard Punishes Missed Public Routes

## Scoring amendment (clarifies Vol 87 / 150)

If baseline agent recovered **any** attributable public phone or email and Apex card shows **none**, score is **0** (or −1 if wrong person), not a sympathetic “privacy 0.”

If Apex recovered org IR and baseline recovered the same, score **1** is correct and **good**.

If Apex recovered notice/personal and baseline only IR, score **2** is the win condition.

## COMPARE column

Add `missed_public: yes/no` when operator verifies a public page still lists a contact Apex missed.

## Engineering response to missed_public

1. Trajectory — did dig visit the IR page?
2. If not — orientation / SERP ranking / visit rate
3. If yes — extraction / promote / UI hide

