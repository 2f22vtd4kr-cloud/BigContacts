# Apex Atlas architecture

## Packages

| Package | Responsibility |
|---------|----------------|
| `@workspace/apex-finder` | Research desk UI (React, Vite, wouter) |
| `@workspace/api-server` | HTTP API, Redis job queue, Atlas orchestrator, enrichers |
| `@workspace/db` | Drizzle schema (entities, contact evidence, assets, jobs) |
| `@workspace/api-client-react` | Typed React Query client |
| `@workspace/api-zod` | Shared Zod contracts |

## Atlas pipeline (high level)

1. **Pre-run / discovery** — registries, broad discovery, optional FAA/HNWI ingest  
2. **Identity & ownership** — Companies House, OpenOwnership, foundation filings  
3. **Contact evidence** — multi-provider web research + HTML CONTACT FACTS  
4. **Social / messenger / digital footprint**  
5. **Scoring** — contact confidence, reachability, wealth signals  
6. **MCTS / deep research** on hot leads (optional)

## Research providers (Phase 0)

Parallel: **Perplexity Sonar**, **Gemini** (Google Search grounding), **Tavily**, **Exa**.  
Structure extraction via **Groq** (Llama).  
Outputs pass through `contact-validation` and AI placeholder filters before ledger write.

## Fail-closed rules

- No invented emails/phones  
- No org inbox as personal  
- No HQ switchboard as HNWI personal mobile  
- Placeholder locals (`jdoe`, `john.doe`, …) rejected in `ai-extractor`  
- Evidence rows prefer explicit `sourceUrls`

## Jobs

`POST /api/ingest/atlas-run` creates an `atlas-run` job, runs `runAtlasPipeline` in the background, status via job poll endpoints. Requires Redis permanent slots for locks and progress.
