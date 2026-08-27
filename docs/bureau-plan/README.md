# Apex Atlas — Master Bureau Plan (multi-volume)

**One plan, many files.** Written into the repository so it can be versioned, reviewed, and executed without chat-length theater.

| Field | Value |
|-------|--------|
| **Product** | Apex Atlas (BigContacts) |
| **Repo** | https://github.com/2f22vtd4kr-cloud/BigContacts |
| **Branch** | `main` |
| **Suite ID** | `APEX_ATLAS_MASTER_BUREAU_PLAN` |
| **Authority** | Product law in `docs/context.md` wins on conflict |

## Thesis (non-negotiable)

Apex is an **AI-driven OSINT bureau**: multi-LLM free research + many non-LLM tools + Boss (Gemini) / right-hand (NVIDIA) / investigators.  
A **scripted, constrained dig pipeline** destroys the superiority claim versus a single capable web agent.  
**Card fields with source URLs** are the product answer — not dig logs alone, not issuer switchboards labeled personal.

## Volumes

| File | Scope |
|------|--------|
| [00_CHARTER_AND_FAILURE_DIAGNOSIS.md](./00_CHARTER_AND_FAILURE_DIAGNOSIS.md) | Charter, failure modes from live runs, root causes |
| [01_PRODUCT_LAW_AND_CONTROL_PLANE.md](./01_PRODUCT_LAW_AND_CONTROL_PLANE.md) | Boss / RH / dig roles, orientation, integrity |
| [02_FREE_REACT_AND_TOOL_SURFACE.md](./02_FREE_REACT_AND_TOOL_SURFACE.md) | Free ReAct, tools, anti-force rules |
| [03_EVIDENCE_PROMOTE_IDENTITY.md](./03_EVIDENCE_PROMOTE_IDENTITY.md) | Evidence bag, promote, org vs personal, collision |
| [04_DISCOVERY_VS_DIG.md](./04_DISCOVERY_VS_DIG.md) | Discovery vs locked-target dig |
| [05_OBSERVABILITY_REACTOR.md](./05_OBSERVABILITY_REACTOR.md) | DigSpan, Live Desk, scheme, honest LIVE |
| [06_EVAL_VS_SINGLE_AGENT.md](./06_EVAL_VS_SINGLE_AGENT.md) | Comparison protocol and acceptance tests |
| [07_REPLIT_OPS_AND_INTEGRITY.md](./07_REPLIT_OPS_AND_INTEGRITY.md) | Redis, Launch, healthz, zombies |
| [08_IMPLEMENTATION_ROADMAP.md](./08_IMPLEMENTATION_ROADMAP.md) | Ordered work packages and done definitions |

## Word-count honesty

This suite is **substantive engineering documentation**, not a claimed 400k-word dump in one shot.  
Each volume is dense normative content. Expanding case-study appendices can grow the corpus; **measured `wc -w` is the only valid count**.

```bash
wc -w docs/bureau-plan/*.md
```

## How to use

1. Read **00** then **01** before changing dig or promote code.  
2. Execute **08** only after operator approval of scope.  
3. After any live run, update **06** scoreboards with same-target independent audit.  
4. Do not reintroduce `force_*` dig controllers or prefer-list micro-training.

## Related existing docs

- `docs/context.md` — living product law  
- `docs/RUN_BUREAU.md` — canonical launch  
- `docs/BUREAU_REACT_ARCHITECTURE.md` — prior architecture notes  
- `docs/PRE_REPLIT_GO.md` — boot gate  

