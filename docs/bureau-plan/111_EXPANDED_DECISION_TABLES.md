# Volume 111 — Expanded Decision Tables

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Table: After dig completes

| evidence? | collision? | source class | Action |
|-----------|------------|--------------|--------|
| no | — | — | leave card; evidence_only if notes only |
| yes | yes | any personal | block personal promote; keep evidence |
| yes | no | agentic-web | promote; outcome per bind |
| yes | no | agentic-web-org | promote; organization_contact |
| yes | no | EDGAR-Phone | promote only as org; never over agentic |

## Table: Launch

| integrity | already running | Result |
|-----------|-----------------|--------|
| critical | — | refuse research claim; show fix keys |
| ok | yes | 409 |
| ok | no | 202 jobId |

## Table: Model role

| Need | Call |
|------|------|
| Dig step | Investigator capacity chain |
| Batch objective | Boss |
| Narration | RH non-blocking |
| Final card pick from candidates | Boss then RH then capacity then deterministic adjudicator |
