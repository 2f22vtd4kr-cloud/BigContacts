# Volume 102 — Researcher-Parity Prompting (Not Micro-Training)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Goal

Dig system prompts should sound like: “You are researching this person with these tools. Be accurate. Cite URLs. Stop when enough.”

They should **not** sound like: “Step 1 search X. Step 2 visit Y. Step 3 registry Z.”

## Allowed orientation content

- Product goal: attributable contacts, no invention  
- Architecture one-liner: you choose tools; runtime executes  
- Tool list matching live schema  
- FINDINGS SO FAR bag  
- Soft stagnation hint if same query twice  

## Forbidden orientation content

- Numbered mandatory surface list for every target  
- “Grok is the floor”  
- force hop names  
- Prefer domains to visit  

## Parity with chat research

A single chat agent invents the next query from the last page. Apex dig must retain that freedom while adding **more tools** and **bureau roles** — advantage is tools + roles + free judgment, not a longer script.
