# Volume 200 — Search Query Diversity (Soft)

## Goal

Avoid dig loops on one failed query without forcing a playlist.

## Soft mechanisms allowed

- Observation: “Same query repeated; try issuer+IR or site:sec.gov”
- History compression noting prior queries
- Provider failover (invisible)

## Hard mechanisms forbidden

- Rotating fixed query templates every step
- Blocking done until N distinct queries

## Metrics

Unique query ratio per dig; correlate with visit rate and scoreboard.

