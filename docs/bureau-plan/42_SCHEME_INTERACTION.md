# Volume 42 — Scheme Interaction Spec

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Canvas
Large fixed topology inside scroll viewport (e.g. 1600×842).

## Interactions
| Input | Behavior |
|-------|----------|
| Scrollbars | Pan x/y |
| Drag | Pan |
| Zoom controls | 55%–140% |
| Minimap click | Jump region |
| Minimap rect | Tracks viewport |
| Live tools toggle | Hide/dim unused from DigSpans |
| Minimap dots | Active tools while LIVE |

## Data
schemeNodesFromSpans(recentSpans) maps tools to node ids.

## Idle
Clear activity lights; no fake LIVE.
