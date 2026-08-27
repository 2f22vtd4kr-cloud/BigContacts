# Volume 155 — Provider Incident Runbook

## Symptoms

- Dig spans show only llm_step parse failures
- web_search returns empty for all queries
- bureauIntegrity critical

## Checks

1. `/api/healthz` → webSearchActive, agentic LLM slots, reasons[]
2. Env secrets present after last restart (restart required after secret change)
3. DigSpan for a smoke single-target: any tool spans?
4. Provider-specific: Serper/Tavily/Exa/Perplexity quotas

## Actions

- Failover order already in code — verify not short-circuited
- Temporary depth fast for smoke; standard for proof
- Do not “fix” by adding force queries

## Post-incident

COMPARE run only when integrity ok; otherwise annotate COMPARE as invalid.

