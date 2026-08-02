---
name: AI model preference
description: User prefers built-in agent (Fable 5 High effort) over external AI APIs for all AI features
---

## Rule
Do NOT use external AI API integrations (Anthropic, OpenAI, OpenRouter) for AI features in this project. Implement all AI logic (pitch generation, scoring, path analysis) directly in server-side TypeScript code.

**Why:** User explicitly stated they prefer using the built-in Replit agent ("Fable 5 in High effort mode") over external AI APIs. They also declined the Replit AI Integrations upgrade required for Anthropic access.

**How to apply:** For pitch generation and any other LLM-dependent features, implement sophisticated algorithmic/template logic in the server code. The logic should be data-driven (MCTS path, entity graph, asset data) and produce professional, personalized output without calling any external AI API.
