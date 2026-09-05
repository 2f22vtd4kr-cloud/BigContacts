# Volume 33 — Research Depth Profiles

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Profile | Use | Agentic iters (indicative) | Adaptive actions | Timeout bias |
|---------|-----|----------------------------|------------------|--------------|
| fast | bulk | ~10 | lower | shorter |
| standard | default / parity | ~16 | mid | 210s class dig |
| deep | head-to-head | ~20 | up to absolute cap | longer |

## Rules

1. Absolute adaptive cap must not clip deep below profile intent
2. Parity comparisons use standard or deep
3. Env `RESEARCH_DEPTH` read at pass start
4. Document actual numbers from code when they drift — code wins, update this table
