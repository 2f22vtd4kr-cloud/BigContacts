# Apex Atlas architecture

## Canonical control plane

Apex Atlas is a model-led research bureau. Deterministic code enforces safety, provenance, identity, persistence, cancellation, lifecycle, and resource limits; models own research judgment within those boundaries.

Operator/UI -> canonical Atlas job -> Groq Boss -> Groq Right-hand oversight -> Boss-selected Investigator capability from the runtime registry -> model-owned multi-step ReAct episode -> validated capabilities -> observations and source URLs -> evidence graph and attribution -> deterministic promotion -> Right-hand review -> Boss continuation/redirect/stop -> durable terminal state -> UI projection.

## Model roles

- Gemini Boss: case framing, discovery/target control, Investigator selection, continuation.
- Gemini Right-hand: bounded independent oversight of supplied case state; never researches or invents evidence.
- Investigator capability: owns the actual research trajectory and chooses permitted tools. The runtime registry currently exposes only the live Groq adapter; retired providers are not silently substituted.

Investigator selection is Boss-owned. Deterministic code exposes only currently available capability adapters and validates the Boss selection; it never silently substitutes another provider. Resource budgets may bound an episode, but they do not choose its research strategy.

## Current Investigator providers

Groq uses Chat Completions with the current agentic model pool qwen/qwen3.8-27b, openai/gpt-oss-120b, and openai/gpt-oss-20b. Mistral uses Chat Completions and resolves live /v1/models capability data, admitting non-archived, non-fine-tuned chat-capable models. Both use bounded same-role model attempts and JSON action contracts.

## Capabilities

The Investigator may choose among Serper, Tavily, Exa, ordinary public HTTP visits, browser escalation, domain lookup, public registry search, domain harvesting, public email footprinting, and public username footprinting. Tools are capabilities, not mandatory stages.

Public web content is untrusted data. It cannot issue tool commands, override policy, promote itself, or establish identity merely by assertion.

## Network and OSINT safety

Autonomous HTTP access passes through the SSRF-safe boundary: DNS results are checked and the selected address is pinned; redirects are manual; private, loopback, link-local, multicast, reserved, and metadata destinations are blocked; request/response limits and cancellation are enforced. Python-backed network OSINT fails closed when enforceable egress is unavailable.

## Evidence law

Public evidence only. No invented people, contacts, relationships, URLs, or wealth. Organization inboxes remain organization-scoped unless independently attributed. Unknown or insufficient evidence is valid. Provider/tool failures remain failures. Important claims require observed source URLs. Investigator findings pass deterministic validation before promotion. The UI is a projection of durable canonical state.

## Verification law

Static checks are not empirical proof. Release verification requires repository/build/typecheck gates, the five-green complete-codebase audit condition, live provider verification on the canonical launch, durable-state verification, and documentation that matches the actual repository state.

Historical documents may describe retired designs; this file describes the current canonical architecture.
