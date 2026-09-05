# Volume 32 — Orientation Injection Specification

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Module:** `apex-bureau-orientation.ts`

## Why

LLMs have no cross-run memory. Every call starts cold. Without orientation they behave as generic assistants.

## Required payload sections

1. **Identity:** Apex Atlas public-records OSINT bureau
2. **Goal:** real attributable contacts with source URLs; never invent
3. **Architecture:** models decide; tools execute; scripts only if all dig LLMs fail
4. **Role:** one of boss | right_hand | investigator | dig_agent
5. **Tools:** live capability list matching parseAction schema

## Injection points (must remain complete)

- Boss plan / discovery / adaptive / final review
- NVIDIA free assign + final review advice
- Dig buildStepPrompt
- Investigator guide
- Mistral specialist / extractors that speak as bureau agents

## Regression

Add path without orientation → fail review. Grep call sites for orientation helper import.
