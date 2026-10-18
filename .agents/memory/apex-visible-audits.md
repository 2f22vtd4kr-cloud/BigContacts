---
name: Visible Apex audit reports
description: User requirements for sequential Apex run audits and their retained contents.
---

For Apex live runs, keep the sequential audit as a normal visible file under the project's tracked `audits/` directory. Star the filename at the top and append events in chronological order. Do not put the report in a private folder or add it to ignore rules. The user permits public-source search text and contact details in this audit. Preserve prompts actually sent, visible model responses, tool activity/results, decisions, timing, failures, corrections, and the operator's technical notes. Do not include secret values or private chain-of-thought.

**Why:** the user requested a detailed visible record for later diagnostic analysis and improvement.

**How to apply:** before an Apex live run, verify the audit destination is not ignored and enable only the guarded development audit path; keep credential redaction and private-reasoning filtering active, and append rather than replace the report.
