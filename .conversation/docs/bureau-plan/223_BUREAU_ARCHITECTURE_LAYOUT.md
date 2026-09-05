# Volume 223 — Bureau Architecture Layout (Boss, Right-Hand, Investigators, Tools)

## Purpose

One clear map of **who decides**, **who researches**, **who executes tools**, and **what owns the card**. Confusion here recreates scripts, double digs, and empty REACH.

## One diagram (logical)

```
                    ┌─────────────────────────────────────┐
                    │           OPERATOR / DESK            │
                    │  Launch · Stop · Review · Outreach   │
                    └───────────────┬─────────────────────┘
                                    │
                    ┌───────────────▼─────────────────────┐
                    │         ATLAS ORCHESTRATOR           │
                    │  Job lifecycle · phases · budgets    │
                    │  Does NOT invent contacts            │
                    └───────────────┬─────────────────────┘
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
   ┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
   │  DISCOVERY    │      │  CASE BUREAU     │      │ TARGET CONTACT  │
   │  AGENT        │      │  (optional path) │      │ AGENT (DIG)     │
   │  who to admit │      │  Boss + RH +     │      │  how to reach   │
   └───────┬───────┘      │  investigators   │      └────────┬────────┘
           │              └────────┬─────────┘               │
           │                       │                         │
           │                       ▼                         ▼
           │              ┌─────────────────┐      ┌─────────────────┐
           │              │ INVESTIGATOR(S) │      │  DIG LLM LOOP   │
           │              │ case research   │      │  free ReAct     │
           │              └────────┬────────┘      └────────┬────────┘
           │                       │                         │
           └───────────────────────┴────────────┬────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │      TOOLS POOL        │
                                    │  model-chosen only     │
                                    └───────────┬───────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │ EVIDENCE → PROMOTE →  │
                                    │ CARD (ContactSurface) │
                                    └───────────────────────┘
```

## Role table (binding)

| Role | Decides | Researches | Calls tools | Writes card |
|------|---------|------------|-------------|-------------|
| **Operator** | Run/stop, accept outreach | No | No | Can rehydrate |
| **Orchestrator** | Phase order, budgets, skip parallel when agent owns card | No | Schedules agents | No (delegates) |
| **Boss** | Next *case* action; investigator brief | No web tools | No | No |
| **Right-hand** | Advises Boss (accept/override) | No web tools | No | No |
| **Case investigator** | How to run *this* case action | Yes (prompted) | Via tool bridge if enabled | Evidence only |
| **Discovery agent** | Who to propose for ledger | Yes | Yes (search/visit/registry) | No — candidates only |
| **Target contact agent / dig** | How to recover routes for *one entity* | Yes | Yes | Via promote |
| **Tools pool** | Nothing | N/A | Execute only | No |
| **Promote / present** | Ranking rules only | No | No | Yes |

## Hard ownership rules

1. **One contact owner per target pass:** Target Contact Agent (dig). When `agentCardReady`, parallel enrichers do not re-own phones/emails.
2. **Boss does not dig.** Boss never emits phone numbers as facts; Boss emits *decisions and briefs*.
3. **Right-hand does not dig.** Text-only advisor on the case file.
4. **Tools never self-trigger.** No background “always run Maigret.” Tools run because a research agent chose them.
5. **Discovery does not promote contacts.** Discovery admits *people*; dig fills *routes*.

