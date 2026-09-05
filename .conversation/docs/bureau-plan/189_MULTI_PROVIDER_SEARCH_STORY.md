# Volume 189 — Multi-Provider Search Story

## Intent

Apex’s search stack (Serper / Tavily / Exa / Perplexity class — as configured) exists so **one quota failure does not zero the dig**.

## Operator visible truth

- healthz counts active search providers
- Dig observation may say provider failed and retry happened (optional)
- integrity critical when zero search providers

## Model visible truth

Tool still named `web_search`. Model should not be asked to pick vendors.

## Failure handling

1. Try next provider
2. Return error observation if all fail
3. Model may change query or done
4. Never invent SERP rows

## Scoreboard validity

COMPARE runs with integrity critical are marked invalid.

