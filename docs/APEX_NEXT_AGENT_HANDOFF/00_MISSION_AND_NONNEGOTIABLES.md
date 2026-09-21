# Apex Atlas — Next-Agent Handoff: Mission and Non-Negotiables

Repository: 2f22vtd4kr-cloud/BigContacts
Authoritative branch: audit/genuine-five-green-final
Known checkpoint: 96362ce4f30a114cb293c0ab2cc277de002f1c45
Canonical API port: 8080

## Mission

Apex Atlas is an AI-powered public-web investigation bureau. Its core purpose is to investigate people, executives, founders, owners, investors, decision-makers and organizations, resolve the correct identity, discover legitimate public professional contact paths or routes that can lead to a target, and preserve the evidence that justifies every material conclusion.

The goal is not to build another search box or deterministic enrichment pipeline.

The intended loop is:

case objective -> Gemini Boss oversight -> Gemini Right-hand oversight -> Groq/Mistral Investigator -> Investigator chooses the next research action -> validated tool execution -> raw observation + provenance -> claims / identity hypotheses / contradictions / contact state -> durable case state + evidence graph + event ledger -> oversight -> next Investigator decision -> honest stop.

The Investigator owns research strategy. Deterministic runtime code owns safety, authorization, budgets, lifecycle, cancellation, schema and evidence-promotion integrity. Runtime code must not secretly replace the Investigator with a fixed search recipe.

## Model-role law

Gemini Boss is oversight/control. It may select an Investigator, clarify research purpose, and decide continue/redirect/stop. It must not browse, invent evidence or prescribe a fixed provider/tool/query/URL sequence.

Gemini Right-hand is an independent bounded review layer. It reviews completed Investigator work, evidence gaps and contradictions. It must not browse, choose tools or invent evidence. If its dedicated credential is unavailable where required, fail closed.

The active Investigator pool is exactly Groq and Mistral. Gemini is never an Investigator fallback. DeepSeek and NVIDIA are not active Apex execution paths.

Right-hand credential: GEMINI_RIGHT_HAND_API_KEY. Boss credential: GEMINI_API_KEY. Never silently fall back from the Right-hand credential to the Boss credential.

## Central memory invariant

The most important architecture rule is:

Durable research history and model working context are different things.

The database/event ledger/evidence graph must retain complete observations, provenance, claims, hypotheses, contradictions, contacts and trajectory records.

The LLM prompt must contain only a bounded, high-signal working representation.

Never solve context pressure by deleting durable history. Never solve it by allowing an unbounded prompt.

Current Phase 1 implementation intends a configurable Investigator context budget with an 18,000-character default and an allowed range of 8,000–32,000. The emergency request-size reducer defaults to 12,000 characters and is used only after a provider request-size rejection.

## Evidence law

Search results are leads, not proof. LLM prose is not proof. A contact-looking string is not a verified contact.

Material claims and promoted identities/contacts must connect to actual observed evidence, source URLs, provenance and scope.

Identity/contact states are explicit and may include DISCOVERED, OBSERVED, ATTRIBUTED, CORROBORATED, VERIFIED, STALE, CONTRADICTED and REJECTED.

A company switchboard is not automatically a person's direct phone. A company email is not automatically the person's direct email. Multiple websites repeating copied data are not automatically independent corroboration.

## Safety law

Preserve existing ceilings including MAX_ITER=64, MAX_OBS=16_000 and MAX_TRAJECTORY_RECORDS=512, plus bounded HTTP responses, outbound timeouts, SSRF protections, cancellation and capability validation.

Python-backed network OSINT remains fail-closed until enforceable egress isolation exists.

## Retired capabilities

WHOIS is retired. Never request or reintroduce WHOISJSON_API_KEY, WHOXY credentials, DeepSeek credentials or NVIDIA credentials.

If an active README, guard or prompt still contains retired-provider references, treat it as migration debt and reconcile it. Do not resurrect the provider merely to satisfy a stale assertion.

## What “done” means

Apex is not done because dependencies install, TypeScript passes, architecture checks pass, the frontend builds, or an empty-target case correctly abstains.

The meaningful milestone is one complete truthful research loop:

case creation -> Boss opening -> real Groq/Mistral Investigator -> actual Investigator-selected search/tool action -> actual observation -> provenance -> durable evidence -> identity reasoning -> contact/route reasoning when applicable -> Right-hand review -> Boss disposition -> next act or honest stop -> durable final state -> job/case terminal-state agreement.

A real result may be “unknown”, “insufficient evidence”, “only organization route found”, or “public contact not found”. The system must never force a contact.

## Do not repeat the previous failure pattern

Do not weaken guards to get green. Do not add providers merely to hide failures. Do not use Gemini as an Investigator fallback. Do not hard-code search sequences. Do not seed expected URLs or contacts into live research tests. Do not fabricate contacts. Do not delete durable trajectory to make prompts fit. Do not make the frontend the source of truth. Do not run the full empirical campaign before the canonical single-case loop works.

Source changes belong in GitHub. Replit is for import/configuration/runtime validation, not an alternate source-control authority.

## Read first

Before modifying code, read completely:

- docs/context.md
- docs/BUREAU_REACT_ARCHITECTURE.md
- docs/APEX_RESEARCH_ROADMAP_V3.md
- docs/APEX_RESEARCH_PHASE_PLANS_V3.md
- docs/APEX_RESEARCH_GAUNTLET_V1.md
- docs/REPLIT_NEW_ACCOUNT_SETUP.md
- every file in docs/APEX_NEXT_AGENT_HANDOFF/

This document supplements those sources; inspect actual code when contracts conflict.
