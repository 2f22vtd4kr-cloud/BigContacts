# Apex Atlas Frontend — 40,000-Word Master Implementation Plan

**Status:** Living engineering specification
**Date:** 31 August 2026
**Scope:** Standalone Apex Atlas web application, desktop and mobile responsive views
**Primary surface:** Bureau / Reactor live experience
**Principle:** The interface must make autonomous research legible without turning autonomous research into a scripted workflow.

> This document is intentionally maintained as an implementation specification rather than a design essay. Each section defines product intent, interaction contracts, visual behavior, implementation direction, and validation criteria. As the frontend evolves, observed failures and rendered evidence supersede assumptions in this document.

## 0. Executive direction

Apex Atlas should look and feel like a premium research instrument, not a generic SaaS dashboard and not an AI chat wrapper. The visual language already present in the product should be preserved and refined: dark, restrained, information-dense, technical, high-contrast, with restrained accent illumination reserved for active intelligence. The target is a product whose perceived quality is consistent with a serious, high-value intelligence/research platform rather than a hobby dashboard.

The central frontend problem is not simply aesthetics. Apex performs autonomous work that is otherwise invisible: discovering people, opening sources, reading pages, comparing evidence, resolving identities, following organizational relationships, checking contact routes, and deciding when evidence is sufficient. The UI therefore has a unique responsibility: expose the *observable consequences of research* in real time without fabricating internal cognition, leaking secrets, or pretending that a deterministic sequence exists when the agent is actually choosing its next action.

The product should communicate three simultaneous truths:

1. Apex is working autonomously.
2. Apex is operating on evidence and sources, not magic.
3. Apex may be uncertain, may pivot, and may reject its own hypotheses.

The frontend should consequently be organized around **mission state, live evidence, action context, entity state, and provenance**, rather than around a conventional chat transcript.

## 1. Product principles

### 1.1 Preserve the existing design language

Do not replace the current visual identity with a fashionable template. The existing dark bureau/research-console aesthetic is the foundation. Improvements should come through hierarchy, spacing, motion, typography, information architecture, richer states, and better visualization rather than a wholesale reskin.

### 1.2 Make the invisible visible

When a live run is researching a person, the user should be able to understand what Apex is doing by looking at the screen for five seconds. The user should see an active research surface, the current action, the source being investigated, evidence being accumulated, and the effect of that action on the emerging entity card.

### 1.3 Never fake activity

A visual browser, typing effect, graph pulse, or telemetry row must be driven by actual backend events or clearly labeled simulation/demo data. The UI must never invent a search query, source visit, evidence claim, or completed action merely to make the product appear busy.

### 1.4 Do not expose private chain-of-thought

The UI should expose safe operational telemetry: action type, tool, query, URL, source title, evidence excerpt, status, duration, confidence, rejection, and resulting state changes. It should not expose hidden reasoning traces or private model deliberation. “What Apex did and what evidence it found” is the product; raw internal chain-of-thought is not.

### 1.5 Mobile is a first-class research surface

Mobile should not be a compressed desktop. A researcher should be able to monitor a live run, inspect a source, open a person card, understand evidence quality, pause/cancel when permitted, and review findings comfortably on a phone.

### 1.6 Premium does not mean decorative

A $300k–$500k-class application should communicate craftsmanship through consistency, responsiveness, performance, typography, interaction quality, state completeness, and trustworthy data presentation. It should not rely on gradients, glow, particle effects, or gratuitous animation to signal value.

## 2. Current frontend baseline and audit implications

The current frontend already contains a strong basis: a routed React/Vite application, desktop navigation, mobile drawer behavior, responsive overflow protection, Reactor live surfaces, graph interaction, live telemetry concepts, and safe-area handling. The responsive contract work should remain as a regression layer rather than being replaced.

The next stage is to turn these foundations into a coherent product system. In particular, the Reactor should evolve from a graph plus feed into a **live research theatre**: a visual representation of actual observable research actions. The graph remains useful, but it should not dominate every moment. The most important information during active research is often the current source and evidence transition.

The existing mobile phase-rail concept should be treated cautiously. A fixed seven-stage presentation can visually imply a deterministic research pipeline even when the backend is deliberately model-selected. Mobile should therefore display **observed action history and current activity**, not a prescribed sequence of stages.

## 3. Information architecture

The frontend should converge on a small set of durable mental models:

- **Bureau:** active missions and their state.
- **Reactor:** live execution and observable research activity.
- **People / Entities:** discovered and researched entities.
- **Evidence:** source-backed claims and provenance.
- **Network:** relationships among people, organizations, vehicles, assets, intermediaries, and routes.
- **Jobs / History:** completed, failed, paused, and resumable research sessions.
- **Settings / Diagnostics:** system configuration and health, primarily for standalone/operator use during development.

The public-facing future product can hide operator diagnostics without changing the underlying architecture.

## 4. Global shell

### 4.1 Desktop shell

Desktop should use a stable left navigation rail, a contextual top bar, and a flexible content canvas. The navigation must communicate where the user is without becoming visually dominant.

Recommended hierarchy:

- compact Apex Atlas mark;
- current bureau/workspace indicator;
- primary navigation;
- active mission count;
- system status indicator;
- user/profile affordance when authentication is eventually introduced.

The shell should support a collapsible rail. Collapsing should preserve icons and provide accessible labels/tooltips. Content must never become unnecessarily narrow because the rail is expanded.

### 4.2 Mobile shell

Mobile should use a compact header with:

- menu button;
- Apex mark;
- current surface title;
- run/status indicator when relevant;
- contextual action menu.

The navigation drawer should be modal/overlay based, with a clear escape target and correct safe-area behavior. Do not permanently consume a third of the mobile viewport with navigation.

### 4.3 Command surface

A global command palette should eventually allow navigation and mission actions without introducing a chat-centric product model. Example commands: open Reactor, inspect last run, find person, open evidence, resume mission, compare sources, view network.

## 5. Design tokens

Create a frontend token layer for:

- background levels;
- surface levels;
- border levels;
- text hierarchy;
- muted text;
- accent/intelligence state;
- success/verified;
- warning/uncertain;
- error/rejected;
- source/provider categories;
- spacing scale;
- radii;
- typography scale;
- motion durations;
- z-index layers.

Do not hard-code visual decisions repeatedly across components. The product needs one visual grammar so that Reactor, cards, evidence panels, network maps, and settings feel like one application.

## 6. Typography

Typography should optimize for dense research interfaces. Use a high-quality sans-serif for general UI and optionally a restrained monospace for telemetry, URLs, queries, timestamps, tool identifiers, and technical metadata. Avoid making the entire application monospace.

Headings should be compact and confident. Body text should be optimized for evidence reading. Source excerpts should have generous line height and clear distinction between metadata and content.

## 7. Motion system

Motion should communicate state transitions, not decorate them.

Recommended classes:

- 100–160ms: hover/focus and microstate changes;
- 180–260ms: panels and drawers;
- 300–500ms: entity/evidence transitions;
- continuous but restrained: active research indicators.

Respect `prefers-reduced-motion`. When reduced motion is enabled, state changes must remain understandable through color, iconography, text, and layout.

Avoid constant pulsing across the entire screen. A single active source, action, or node may illuminate; everything else should remain calm.

## 8. Reactor: product definition

Reactor is the signature interface of Apex Atlas. It should answer four questions simultaneously:

1. What mission is Apex pursuing?
2. What is Apex doing right now?
3. What source/evidence is it interacting with?
4. What has changed in the resulting research state?

The desktop Reactor should therefore be a coordinated multi-pane workspace rather than a single graph.

Recommended desktop composition:

- **Mission header:** target, objective, elapsed time, status, budget, confidence summary.
- **Live research canvas:** browser/source simulation or source viewer, depending on action type.
- **Research graph:** people, organizations, domains, documents, routes, and relationships.
- **Under-the-hood activity feed:** chronological observable actions.
- **Evidence/inspector drawer:** selected source, claim, contact route, or entity.

The proportions should be adaptive rather than fixed. On a large desktop, the source viewer can receive the dominant width during browser research; when graph activity becomes more important, the graph can expand.

## 9. Reactor desktop schema

The canonical desktop schema should be:

`Mission header → active research workspace → evidence/action inspector`

with the graph and activity feed acting as persistent contextual surfaces.

The active workspace should be capable of switching representation based on actual action type:

- browser/search action → browser-like source viewport;
- document/PDF action → document reader;
- registry lookup → structured registry table;
- domain/WHOIS action → domain intelligence panel;
- corporate records → corporate filing/registry viewer;
- map/geographic action → map surface;
- relationship discovery → network graph;
- model-only planning/state transition → concise “research decision” activity card, without pretending a web page was opened.

This is the key design direction: **the UI should render the semantics of the action that actually occurred.**

## 10. Browser-like research viewport

When Apex performs web search or page research, the Reactor should show a convincing but clearly product-owned browser surface. It should not impersonate a real Google session in a deceptive way. The visual metaphor can resemble a browser/search engine while using Apex branding and explicit “Apex research view” labeling.

The surface should show:

- query bar containing the actual submitted query;
- search result cards from the tool response;
- source title/domain;
- selected result state;
- page loading/read state;
- extracted evidence highlights;
- timestamps/duration;
- blocked/CAPTCHA/error states when applicable.

If the tool returns snippets only, display snippets as snippets. If the tool returns full page text, indicate that. Never imply that Apex read content it did not receive.

## 11. Live query rendering

The user specifically wants the research prompt/query to appear as if it is being written. Implement this as a **telemetry playback layer**, not as fake generation.

When an action begins, the UI can reveal the actual query character-by-character at a controlled pace, with a subtle caret. The full query should already exist in the backend event. The animation is merely presentation.

If the action is too fast, the UI may animate over a short fixed minimum duration. If the action takes longer, it should not loop fake typing. It should remain in a “searching” state.

When the result arrives, the UI should stop the typing animation immediately and render the actual result.

## 12. Live page-reading representation

For page inspection, the browser-like viewport should show the page title, domain, relevant content blocks, and highlighted evidence spans. A side rail can show “Evidence captured” entries as they appear.

Evidence should visually transition from:

`observed source → candidate claim → corroborated claim → accepted fact`

without implying that the frontend itself performed semantic validation. The status should come from backend state.

## 13. Research activity feed

The under-the-hood feed should be redesigned as a first-class audit surface.

Each event should have:

- timestamp;
- event type;
- actor/model/tool category;
- concise human-readable description;
- target/source;
- status;
- duration;
- evidence delta if applicable;
- expandable technical metadata for operator mode.

Example visible events:

`Search · “…”`
`Opened · example.com/person`
`Found evidence · board appointment`
`Rejected hypothesis · namesake mismatch`
`Compared sources · 3 sources`
`Contact route · organization-mediated`
`Pivoted · family office relationship`

Do not expose raw chain-of-thought. The feed should communicate action and evidence.

## 14. Activity feed grouping

Group repetitive low-value events when appropriate. For example, multiple result fetches can be grouped into a “Search batch” while retaining individual URLs. The user can expand the group.

High-value events such as identity rejection, contradiction, verified contact route, and major pivot should receive stronger visual treatment.

## 15. Research decision cards

When the agent changes direction, show a concise decision card:

- what changed;
- why the previous route was insufficient, expressed as an outcome/evidence statement rather than hidden reasoning;
- what new research action was selected.

Example: “Primary company page confirmed the role, but no direct route was published. Apex is checking the related investment vehicle for a public intermediary route.”

This gives users the feeling of intelligent adaptation without exposing private reasoning.

## 16. Live graph

The graph should represent **observed entities and relationships**, not imagined possibilities.

Node categories:

- person;
- organization;
- domain;
- document/source;
- investment vehicle;
- intermediary;
- location;
- asset/holding when evidence supports it.

Edges should be typed and provenance-aware.

New nodes should enter with a brief visual arrival animation. Rejected nodes should not simply disappear without explanation; they can become faded or move into a rejected/evidence-history layer.

## 17. Graph desktop interaction

Support:

- pan;
- zoom;
- fit-to-research;
- focus selected entity;
- isolate neighborhood;
- show provenance;
- filter by entity type;
- filter by confidence/evidence status;
- time playback for long runs.

The graph should not require a user to understand graph theory. Hover/focus should expose plain-language relationships.

## 18. Reactor responsive transformation

At medium widths, collapse the persistent right inspector into a drawer. At mobile widths, the graph, source viewer, and feed become tabs or vertically stacked surfaces with a persistent current-action header.

Do not attempt to fit graph + browser + feed + inspector simultaneously onto a phone.

## 19. Mobile Reactor

The mobile experience should prioritize:

1. current action;
2. source/evidence;
3. mission status;
4. activity history;
5. graph/network when requested.

A bottom navigation or segmented control can switch between `Live`, `Evidence`, `Network`, and `History`.

The active action should occupy the upper portion of the screen. A compact timeline should remain available below.

## 20. Mobile browser research

The browser-like research surface should become nearly full-screen. Query text should remain readable. Search results should be cards, not tiny desktop rows. Source domain and provenance should be prominent.

Evidence highlights should be tappable. Tapping opens a bottom sheet containing the claim, excerpt, URL, source type, and confidence/status.

## 21. Mobile activity feed

Use vertically stacked event cards with compact metadata. Avoid horizontal tables. Technical metadata belongs behind an expansion control.

Important state changes should be accessible without scrolling through every telemetry event.

## 22. Person/entity cards

Cards are the durable output of research and should feel substantially more sophisticated than ordinary CRM records.

The card hierarchy should be:

- identity;
- confidence/verification status;
- role and organizations;
- why the person matters;
- evidence-backed biography;
- relationship/network summary;
- contact routes;
- organizations/vehicles;
- geography;
- wealth/asset estimates where defensible;
- evidence ledger;
- research history.

The user should understand the person within seconds and be able to inspect every important claim.

## 23. Card language

Generated copy should be written in plain, useful language. Avoid jargon where a normal phrase works.

Instead of “organization_contact”, display “Company route”. Instead of “source_type: registry”, display “Corporate registry”.

The system should distinguish:

- Direct public contact;
- Organization route;
- Intermediary route;
- Public professional profile;
- Unknown/not established.

Never label a generic organization address as a personal email.

## 24. Evidence ledger

Every major card claim should have an adjacent evidence affordance. Clicking it opens the supporting source(s).

Use source strength indicators such as:

- Primary;
- Official;
- Registry;
- Reputable secondary;
- Discovery-only.

Do not use a single simplistic numeric score to replace provenance.

## 25. Confidence visualization

Confidence should be shown at the claim level where useful. Avoid a single “92% confidence” badge that hides contradictory evidence.

Use states such as:

- Verified;
- Strongly supported;
- Supported;
- Unresolved;
- Contradicted;
- Rejected.

## 26. Contact route UX

Contact routes should be presented as actionable but honest cards.

Each route shows:

- route type;
- value;
- evidence source;
- relationship to person;
- verification status;
- last observed date.

Examples:

`Direct public email`
`Company switchboard`
`Executive office`
`Investment firm contact`
`Public professional profile`
`Intermediary`

The UI should make the distinction between direct and indirect routes unmistakable.

## 27. Wealth visualization

Apex may eventually visualize estimated wealth, holdings, or asset exposure, but this must be presented as estimates, not facts.

Use a range or scenario representation rather than false precision. Example: `$80–120M estimated exposure`, with a clear methodology/evidence link.

The visualization can include:

- company ownership;
- disclosed stakes;
- known investment vehicles;
- property/asset evidence where public and relevant;
- estimated value ranges.

Do not show a precise dollar number unless the underlying source supports it.

## 28. Asset map

For people with meaningful geographic footprints, provide a map view showing evidence-backed locations such as:

- company headquarters;
- registered entities;
- publicly reported residences only when appropriate and safe;
- investment locations;
- property/asset locations when sourced.

Map markers should have provenance. Avoid exposing sensitive private-location information unnecessarily.

## 29. Network visualization

The network surface should provide a human-readable relationship map.

Use progressive disclosure. Start with the person and first-degree relationships. Allow expansion to organizations, vehicles, board positions, and intermediaries.

Edges should explain themselves: `Founder of`, `Director of`, `Partner at`, `Invested in`, `Contact route via`, etc.

## 30. Search/discovery interface

Search should feel like an intelligence query surface rather than a CRM filter form.

Users should be able to state an objective naturally, while advanced filters remain available.

Example:

“Find family-business principals in Western Europe with a public route through their investment office.”

The system should display the interpreted objective, constraints, and live research status without forcing the user to define a fixed sequence.

## 31. Mission launch

The mission launch screen should let users specify:

- objective;
- target or target class;
- geography;
- optional constraints;
- desired depth;
- time/budget preference.

Avoid asking users to select providers/models in the primary flow. Those are implementation details.

## 32. Mission status

Use a clear state machine:

`Preparing → Researching → Verifying → Synthesizing → Complete`

plus:

`Paused`, `Waiting`, `Failed`, `Cancelled`, `Needs review`.

These labels describe observable system state, not a fixed research methodology.

## 33. Jobs/history

History should show mission outcome quality rather than just timestamps.

Each run should expose:

- target;
- outcome;
- evidence count;
- contact route quality;
- unresolved issues;
- duration;
- model/provider telemetry in operator mode.

The user should be able to resume a research session without losing state.

## 34. Evidence comparison mode

Introduce side-by-side source comparison for conflicting claims. This is especially important for namesake resolution.

The comparison should highlight:

- identity;
- role;
- organization;
- geography;
- chronology;
- contact details;
- conflicting statements.

The user should be able to mark a source as supporting, contradicting, or insufficient only where the backend model supports such state.

## 35. Research replay

A completed mission should be replayable as a timeline. The user can scrub through the run and see:

- active action;
- source;
- graph change;
- evidence captured;
- rejected candidate;
- final card change.

Replay should be derived from persisted telemetry, not re-run the LLM.

## 36. Live feed performance

The telemetry stream should be virtualized or grouped for long runs. The UI must remain responsive with thousands of events.

Only render rich browser previews for the currently selected/high-value event. Do not render every page snapshot simultaneously.

## 37. Quota-aware frontend behavior

The frontend must not encourage unnecessary provider calls. “Refresh”, “rerun”, “deepen research”, and “verify again” actions should clearly communicate that they initiate new backend work.

A mission budget indicator should be informational and derived from actual backend telemetry. Avoid displaying speculative cost if no reliable cost data exists.

## 38. Provider transparency

Operator mode may show which model/provider handled an action, but normal users do not need provider names for every event. If shown, display them as telemetry rather than as a quality guarantee.

Fallback events should be visible to operators because model degradation is an important diagnostic signal.

## 39. Empty states

Every surface needs a designed empty state. Examples:

- no active missions;
- no evidence yet;
- no contact route found;
- no network relationships established;
- no wealth evidence;
- no saved people.

Empty states should explain what is absent without implying failure.

## 40. Error states

Errors must be human-readable and actionable. Distinguish:

- source unavailable;
- tool quota;
- provider unavailable;
- page blocked;
- malformed source;
- backend failure;
- research contradiction.

A source failure should not make the entire Reactor look broken.

## 41. Accessibility

Implement keyboard navigation, visible focus, semantic landmarks, screen-reader labels, sufficient contrast, reduced motion, and touch targets appropriate for mobile.

Interactive graph elements require keyboard-accessible alternatives. Every visual relationship should have a textual representation.

## 42. Responsive breakpoints

Validate at minimum:

- 320×568;
- 360×800;
- 390×844;
- 430×932;
- 768×1024;
- 1024×768;
- 1280×800;
- 1440×900;
- 1920×1080.

The actual browser rendering, not CSS inspection alone, is the acceptance criterion.

## 43. Browser-level visual regression

Introduce Playwright or the repository's established browser test mechanism if already present. Capture deterministic screenshots for stable states:

- empty Bureau;
- active Reactor;
- browser research action;
- evidence inspector;
- person card;
- network;
- mobile drawer;
- mobile Reactor;
- error state.

Dynamic timestamps and live typing should be mocked in screenshot tests while preserving a separate real-stream integration test.

## 44. Interaction testing

Test:

- navigation;
- drawer opening/closing;
- graph pan/zoom;
- event selection;
- evidence inspection;
- source opening;
- mission pause/cancel where supported;
- responsive transitions;
- keyboard navigation.

## 45. Visual QA methodology

For every major UI change:

1. inspect desktop;
2. inspect mobile;
3. inspect narrow desktop/tablet;
4. inspect long-content states;
5. inspect loading/error/empty states;
6. inspect reduced-motion mode;
7. inspect keyboard behavior.

Do not accept a feature because the happy-path screenshot looks good.

## 46. Inspiration research: current product patterns

Current 2026 agent UX research emphasizes that agent interfaces are becoming control planes for goals, context, approvals, auditability, and intervention rather than simple chat boxes. citeturn0search2turn0search3

Apollo's current product direction is particularly relevant for information architecture: its AI is embedded directly into core workflows rather than isolated as a separate assistant, and its contact profiles combine professional details, ownership, enrichment, communication history, and customizable layouts. citeturn0search12turn0search14turn0search15

Apollo's workflow UI also emphasizes visual branching and a complete end-to-end view, which is a useful pattern for future Apex mission/network visualization, although Apex must not turn its autonomous research into a fixed workflow editor. citeturn0search10

The important lesson from these references is not to copy Apollo. It is to combine its information density and action orientation with Apex's evidence-first research model.

## 47. Agent observability pattern

Open-source agent interfaces are converging on live viewport + activity feed patterns. Vercel's agent-browser, for example, provides browser viewport streaming alongside command activity, which closely matches the desired conceptual model for Apex's browser-research surface. citeturn0search11turn0search18

Apex should implement the same class of experience using its own research telemetry: live action context, source viewport, and event stream.

## 48. Live “under the hood” feed architecture

The frontend should consume a normalized event contract. Suggested event categories:

`mission.started`
`mission.status`
`agent.action`
`tool.started`
`tool.result`
`source.opened`
`source.blocked`
`evidence.observed`
`hypothesis.created`
`hypothesis.rejected`
`identity.updated`
`relationship.discovered`
`contact_route.updated`
`entity.updated`
`mission.completed`
`mission.failed`

The UI must not infer events from arbitrary model prose. Backend telemetry should emit structured events.

## 49. Action renderer registry

Implement a frontend action renderer registry keyed by semantic action type. This allows new tools to gain appropriate visualizations without modifying the whole Reactor.

Example:

`web.search → SearchRenderer`
`web.open → BrowserRenderer`
`document.read → DocumentRenderer`
`registry.lookup → RegistryRenderer`
`whois.lookup → DomainRenderer`
`company.lookup → CorporateRenderer`
`map.lookup → MapRenderer`
`graph.update → GraphRenderer`
`agent.status → StatusRenderer`

This preserves LLM freedom because the renderer responds to what actually happened rather than telling the model what to do next.

## 50. Source authenticity indicators

Every source preview should expose its domain and provenance status. The UI should make it easy to distinguish:

- original/primary source;
- official organization page;
- registry;
- news/secondary source;
- search result snippet;
- user-provided source.

Never imply source quality solely through visual polish.

## 51. Search-result renderer

Search results should support compact cards with title, URL/domain, snippet, date if supplied, source type, and selection state. The user can inspect why the result mattered without needing to open every page.

## 52. Browser source renderer

The browser renderer should have a browser chrome metaphor but Apex-owned styling. It should support:

- URL bar;
- loading state;
- source title;
- content;
- evidence highlights;
- source metadata;
- blocked state;
- extracted-content state.

## 53. Document renderer

For PDFs and long documents, use a document viewer with page count, page navigation, evidence markers, and source metadata. Avoid loading an entire document into the DOM when only a few pages are needed.

## 54. Registry renderer

Registry research should appear as structured records. Fields should be grouped into identity, officers, dates, addresses, ownership/filing information, and source metadata. This is more intuitive than rendering registry text as a generic webpage.

## 55. Corporate relationship renderer

When a company relationship is discovered, visually connect the company to the person and show the relationship label plus source. This should update the graph and entity card simultaneously.

## 56. Map renderer

Maps should be lazy-loaded and only activated when geographic evidence exists. This avoids unnecessary network and rendering cost.

## 57. Wealth renderer

Wealth visualizations should include an “evidence basis” drawer. A user can inspect which ownership stakes, disclosures, transactions, or estimates support a range.

## 58. Timeline renderer

Person/entity timelines should show dated evidence events: founding, appointment, investment, acquisition, board role, public announcement, etc. Chronology is valuable for namesake resolution.

## 59. Contact route renderer

Contact routes should be represented as paths rather than isolated fields. Example:

`Person → Investment firm → Public office → contact route`

The UI should make the route relationship explicit.

## 60. Network map modes

Provide modes:

- Identity;
- Organizations;
- Investment;
- Contact route;
- Geography;
- Evidence.

Each mode should filter the same underlying evidence-backed graph.

## 61. Research quality dashboard

For completed missions, show a compact quality summary:

- identity confidence;
- evidence coverage;
- primary-source coverage;
- contact-route quality;
- unresolved conflicts;
- research completeness.

This should reflect backend evaluation data, not a frontend score invented for appearance.

## 62. User-facing explanation language

The product should explain uncertainty plainly. Examples:

“Identity supported by two independent sources.”
“Role confirmed; direct contact not established.”
“Company route found; this is not a personal email.”
“Two people share this name; Apex has not merged them.”

These statements are substantially more trustworthy than generic confidence badges.

## 63. Future subscription architecture

Do not build billing/auth into the current standalone work unless needed, but keep the UI architecture compatible with future accounts/workspaces.

Future concepts:

- workspace;
- saved research;
- shared entity collections;
- permissions;
- usage/budget;
- team activity.

Avoid prematurely adding these surfaces to the standalone app.

## 64. Public-product readiness without public launch work

The current objective is a standalone application. However, all major UI choices should avoid dead ends for future public use. In particular, don't make operator-only concepts unavoidable for normal users.

## 65. Performance budget

Target:

- fast initial shell render;
- lazy-load heavy graph/map/browser components;
- virtualize long feeds;
- avoid unnecessary rerenders from telemetry;
- throttle high-frequency graph updates;
- batch low-value telemetry updates;
- use memoization where profiling proves value.

Do not optimize prematurely; profile real renders.

## 66. Telemetry rendering budget

The backend may emit many events. The frontend should distinguish:

- critical events: immediate;
- ordinary events: normal stream;
- diagnostic events: collapsed/operator-only.

This prevents the “everything is screaming at once” problem.

## 67. Quota-safe animation

Visual richness must never trigger provider calls. Browser typing, graph animation, evidence transitions, map movement, and replay are client-side presentation of existing events.

## 68. Offline/history behavior

Completed research should remain readable even if live providers are unavailable. The frontend should render persisted cards, evidence, graphs, and timelines independently of live provider connectivity.

## 69. Stale/live state

The UI must clearly distinguish live from historical state. If a live stream disconnects, display `Connection interrupted` rather than freezing a spinner indefinitely. Reconnection should reconcile state from persisted mission state.

## 70. Mission interruption

If the backend supports pause/cancel, the UI should clearly distinguish “request sent” from “stopped.” Never display a mission as stopped before the backend confirms the state transition.

## 71. Notifications

Use restrained toast notifications for system events. Research findings belong in the research surface, not toasts.

## 72. Keyboard and power-user workflow

Desktop users should be able to:

- open Reactor;
- jump to active source;
- inspect selected evidence;
- focus entity;
- search history;
- open command palette.

Keyboard shortcuts should never conflict with normal text entry.

## 73. Touch behavior

All graph interactions need mobile alternatives. Do not require hover. Long press can expose metadata, but essential information must be available through taps.

## 74. Responsive tables

Tables should collapse into cards or horizontal scroll with sticky identifiers. Do not force unreadable six-column layouts onto phones.

## 75. Responsive evidence panels

Evidence panels become bottom sheets on mobile and side drawers on desktop. They should preserve source metadata and action controls.

## 76. Responsive network

On mobile, show a simplified first-degree network and allow progressive expansion. A full desktop graph is not a mobile requirement.

## 77. Responsive card layouts

Person cards should stack into sections on mobile. Contact routes should remain near the top because they are often the user's immediate objective.

## 78. Visual hierarchy rules

At any moment, only one or two things should be visually dominant:

- current research action;
- important evidence/result.

The graph, telemetry, status, and navigation should remain supportive.

## 79. Avoid dashboard overload

A premium intelligence application can become unusable if every metric is visible simultaneously. Use progressive disclosure and strong default views.

## 80. Information density modes

Consider two desktop density modes:

- Focused: fewer telemetry details, larger evidence.
- Analyst: denser feed, graph, metadata.

Persist the user's choice locally.

## 81. Operator mode

A hidden/explicit operator mode may expose:

- provider/model;
- tool arguments;
- event IDs;
- latency;
- token/cost metadata where available;
- fallback reasons;
- raw source metadata.

This is valuable for development without contaminating the normal user experience.

## 82. Research-source authenticity

The UI must never fabricate a browser screenshot from a source that was not actually returned. For demos, fixtures must be clearly marked as demo data in the code and never accidentally mixed with live mode.

## 83. Demo mode

Create a deterministic demo mission with a realistic but fictional target and fixture events. This enables visual QA, sales-style demos, screenshot testing, and frontend development without spending provider quotas.

The demo must be visually indistinguishable in mechanics but clearly marked as `Demo` to avoid confusion.

## 84. Frontend test fixtures

Maintain fixtures for:

- search;
- browser page;
- registry;
- blocked page;
- identity collision;
- verified contact route;
- contradiction;
- network expansion;
- wealth estimate;
- long-running mission;
- failed provider;
- disconnected stream.

## 85. Visual regression states

Each fixture should have a stable viewport snapshot. Use those snapshots as the baseline for future design work.

## 86. Design-review checklist

Every major frontend PR should answer:

- Does it preserve the existing design language?
- Does it work at desktop and mobile widths?
- Does it expose real state rather than invented activity?
- Does it preserve provenance?
- Does it avoid implying a fixed research sequence?
- Does it handle loading/error/empty states?
- Does it respect reduced motion?
- Does it remain performant under long telemetry streams?

## 87. Browser research safety

A browser-like renderer should not accidentally encourage users to believe Apex is literally controlling their personal browser. It is an observation surface for the research system. Labeling should be subtle but clear.

## 88. Source opening behavior

Opening a source externally should preserve the source URL exactly as returned by the backend. The frontend should not rewrite domains or fabricate URLs.

## 89. Evidence selection

Clicking a claim should highlight the source excerpt that supports it. If multiple sources support the claim, show them as a small evidence stack.

## 90. Contradiction visualization

Contradictory sources should not be hidden. Use a visible but calm contradiction marker. The user can inspect both sources and see the unresolved state.

## 91. Rejected identity visualization

When Apex rejects a candidate, the activity feed can show a rejected hypothesis card. The graph should not treat the rejected candidate as an accepted person node.

## 92. Namesake resolution UX

Provide an identity comparison view showing candidate A/B with organization, geography, role, chronology, and sources. The interface should make it clear why they are distinct or unresolved.

## 93. Organization/person separation

Use different visual shapes and labels for people and organizations. Contact route cards should inherit the entity type they belong to.

## 94. Contact provenance UX

A route is not “verified” because a string looks like an email address. The UI should display verification status only when backend evidence supports it.

## 95. Evidence age

Display retrieval or publication dates where available. This is especially useful for contact routes and roles.

## 96. Historical card evolution

Allow users to inspect how a card changed during research. This reinforces that the final card is the result of evidence accumulation, not an opaque generated paragraph.

## 97. Research summary

The final summary should be short and useful. It should answer:

- Who is this?
- Why is this person relevant?
- What did Apex establish?
- How can they realistically be reached?
- What remains uncertain?

## 98. Long-form evidence

Do not bury evidence under generated prose. The evidence ledger should be one click away and should preserve source context.

## 99. Internationalization readiness

Design for long names, non-English scripts, long organization names, right-to-left possibilities, and locale-aware dates. Do not assume two-word Western names.

## 100. Localization-safe layout

Avoid fixed-width text assumptions. Buttons should accommodate longer translations.

## 101. Data formatting

Use locale-aware dates and numbers. Wealth ranges should respect currency and locale. URLs should remain monospaced or otherwise visually distinct.

## 102. Privacy and sensitive data presentation

Sensitive information should not be unnecessarily surfaced in previews. Use progressive disclosure and clear provenance. Public availability does not mean every detail should be maximally prominent.

## 103. Map privacy

Do not display precise sensitive residences merely because an upstream source contains them. The frontend should follow backend policy for sensitive location data.

## 104. Security UX

Errors should not expose provider secrets, connection strings, internal tokens, or raw credentials. Operator telemetry must redact secrets before rendering.

## 105. Authentication future-proofing

Keep session state separate from research state. A future account should own missions, saved entities, preferences, and permissions without changing the core research event schema.

## 106. Collaboration future-proofing

Future shared missions should distinguish:

- Apex event;
- user annotation;
- user decision;
- user override.

Never mix human annotations with machine evidence.

## 107. User annotations

Allow a future analyst to add notes to a person or evidence item. Notes must be visually distinct from verified facts.

## 108. Export

Completed cards should eventually support clean exports. The export UI should preserve provenance and distinguish direct/indirect contact routes.

## 109. Shareable research view

Future sharing should support a read-only evidence-backed view. It should not require exposing operator telemetry.

## 110. Print/PDF

Design a printable research brief layout with identity, key findings, routes, network summary, and evidence appendix. This should be separate from the live Reactor layout.

## 111. Executive summary mode

A user should be able to collapse technical detail and receive a clean executive brief. The underlying evidence remains available.

## 112. Analyst mode

Analysts should be able to expand evidence, source metadata, event timeline, and graph relationships.

## 113. Reactor split-pane persistence

On desktop, remember pane sizes locally. Provide reset-to-default. Do not persist absurdly narrow panes.

## 114. Responsive persistence

Desktop pane preferences should not leak into mobile layout. Use breakpoint-specific layout state.

## 115. Source preview caching

Cache only data already provided by the backend. Avoid duplicating network fetching in the frontend when backend tools already own source retrieval.

## 116. Avoid duplicate research

A frontend “open source” interaction should inspect existing evidence where possible. It should not silently trigger a second provider request merely to populate the UI.

## 117. Explicit user-triggered deepening

If the user asks to research further, show that it starts a new mission/action and may consume quota. Do not make every click an implicit research request.

## 118. Agent intervention

Future users may be allowed to send a high-level intervention such as “prioritize the investment route.” This should become a new mission instruction, not an injection into private model reasoning.

## 119. Approval patterns

If future actions have external side effects, the UI should show what will happen before requesting approval. Research-only actions generally do not need approval.

## 120. Live cost display

Where reliable provider cost telemetry exists, show cumulative mission cost in operator mode. For normal users, consider a resource budget indicator rather than raw provider billing.

## 121. Latency visualization

Display tool/action duration in the feed when useful. Use it diagnostically, not as a gamified metric.

## 122. Model fallback visualization

When fallback occurs, show an operator badge such as `Fallback model used` with reason. Do not claim a quality downgrade unless evaluation supports it.

## 123. Stream resilience

On reconnect, the frontend should reconcile by event ID or persisted sequence rather than replaying the entire stream blindly. Duplicate events must not duplicate graph nodes or feed cards.

## 124. Event ordering

Backend event sequence numbers should be respected. The UI must not assume arrival order equals causal order when events can arrive concurrently.

## 125. Parallel research visualization

If multiple independent research branches genuinely run in parallel, display them as concurrent lanes or graph branches. Do not collapse them into a fake linear timeline.

## 126. Parallelism without chaos

Limit simultaneous visual emphasis. The user should see that several branches exist while one branch is currently active.

## 127. Boss/right-hand visualization

The UI may show high-level role indicators such as `Bureau strategy` and `Research execution`, but should not imply that every backend turn is a meaningful dialogue between two personalities. Show roles when they explain observable orchestration.

## 128. Model identities

Provider/model names can be shown in operator mode. Avoid making the user think the product is simply a wrapper around Gemini/NVIDIA/etc. The product identity is Apex Atlas.

## 129. Tool identity

Tool badges should use human language: `Web search`, `Company registry`, `Domain intelligence`, `Document reader`, rather than raw function names.

## 130. Search query history

Allow users to inspect previous queries for a mission. Group them by purpose and result rather than dumping a raw list.

## 131. Search quality indicators

A query card may show whether it produced useful evidence, no useful result, or caused a pivot. This helps users understand research progress.

## 132. Result selection

When a result is selected, the UI should show why it was opened through observable metadata: title, query, rank, source type. Do not expose hidden chain-of-thought.

## 133. Research pivot visualization

A pivot is a high-value event. Use a distinct timeline marker and concise explanation based on observable evidence gaps.

## 134. Stopping visualization

When Apex stops, show a completion rationale in terms of evidence state: “Identity established; primary route found; remaining uncertainty is X.” This is more useful than “agent decided to stop.”

## 135. Insufficient-evidence state

If Apex completes with unresolved identity/contact issues, the UI should say so clearly. Completion is not synonymous with success.

## 136. Research scorecards

Avoid vanity scores. If a score is displayed, it must be tied to an explicit backend evaluation contract. Prefer factual status labels over arbitrary “AI confidence” numbers.

## 137. Evidence density visualization

A compact evidence coverage visualization can show which card sections have strong support: identity, role, organization, route, network, wealth estimate.

## 138. Card completeness

Completeness should never pressure the backend to invent missing fields. Empty fields should be meaningful states.

## 139. Missing data language

Use “Not established” rather than “Unknown” when research was attempted. Use “Not researched” when a section was intentionally outside scope.

## 140. Research scope

The card should retain the mission scope so users understand why some fields are absent.

## 141. Mission templates

Future templates can exist for common objectives, but they must set goals/constraints rather than dictate a fixed tool sequence.

## 142. Saved objectives

Allow analysts to save recurring research objectives as natural-language mission presets.

## 143. Discovery result browsing

Discovery results should emphasize why a person surfaced, evidence quality, and route potential rather than only wealth/fame.

## 144. Practical reachability visualization

A future “reachability” panel can summarize the strongest established routes: direct, company, intermediary, public profile. It must remain evidence-based.

## 145. Opportunity context

Apex can show “Why this lead?” with evidence-backed signals such as role, ownership, relevance, and route availability. Avoid opaque lead scores.

## 146. Fame bias UX

Do not visually prioritize celebrity/billionaire badges by default. If wealth or fame is relevant, it should be contextual rather than the dominant visual signal.

## 147. Asset intelligence

Asset/holding views should be evidence-linked and time-aware. If values are estimated, show the estimate range and date.

## 148. Corporate ownership diagrams

For complicated ownership structures, use expandable diagrams with source links. Avoid rendering hundreds of nodes by default.

## 149. Family-office visualization

Where public evidence supports a family office relationship, display it as an organization/entity relationship with appropriate uncertainty. Never infer family relationships solely from surnames.

## 150. Intermediary routes

Intermediaries should be first-class entities. Show their role and relationship source.

## 151. Public-profile links

Profiles should be presented as routes, not automatically as proof of identity unless backend evidence establishes the association.

## 152. Evidence-source cards

Each source card should include domain, title, source type, publication/retrieval date when known, and supported claims.

## 153. Source hierarchy

The UI can suggest primary-source preference visually but should not hide secondary sources that are relevant to contradiction or discovery.

## 154. Source conflict

If two credible sources conflict, show both and mark the field unresolved until the backend resolves it.

## 155. Browser-like page reading UX

Use subtle reading progress and highlight transitions. Do not scroll automatically unless the action event says a specific evidence region was selected.

## 156. “Writing” animation

The typing effect should be used for actual queries/actions, never fabricated prose. For long queries, reveal words or chunks rather than every character if that improves accessibility.

## 157. Accessibility for animated text

Provide the complete query in accessible text immediately; animation is visual enhancement only.

## 158. Live cursor

The caret should disappear once the actual action starts or completes. Avoid infinite cursor animations.

## 159. Loading skeletons

Skeletons should match actual content structure. Avoid generic shimmering over the entire screen.

## 160. Source loading state

Browser renderer states: `queued`, `opening`, `reading`, `evidence found`, `blocked`, `complete`.

## 161. Tool failure state

Tool failures should display the tool class and recoverability. Example: “Web source unavailable; Apex can continue through another route.”

## 162. Mission failure state

A mission failure should provide a useful recovery action and preserve partial evidence.

## 163. Partial success

Apex may complete with useful partial evidence. The UI should distinguish partial completion from failure.

## 164. Research resume

Resuming a mission should show the prior state immediately, then reconnect live telemetry. Do not reset the user to a blank loading shell.

## 165. History filters

Allow filtering by status, target type, date, outcome quality, and unresolved issues.

## 166. Entity collections

Future saved collections should support tags and analyst notes without modifying evidence truth.

## 167. Bulk review

For discovery batches, provide a review queue with quick evidence previews and reject/keep actions. Bulk review should never silently promote identities without backend validation.

## 168. Comparison UI

Compare two Apex runs or Apex vs baseline in a future evaluation/operator surface. This should use normalized factual metrics, not writing quality.

## 169. Evaluation visualization

For internal evaluation, show personal precision, organization honesty, URL coverage, collision false-promotes, empty-card rate, time to first valid evidence, and contact-route quality. This directly supports the project's foundational evaluation thesis.

## 170. Baseline comparison UX

The evaluator should be able to inspect where Apex won or lost at the evidence level. A clean baseline beating a noisy Apex result must be visually obvious.

## 171. Research truth over trace length

Never make the UI celebrate long trajectories, high tool counts, or high token usage. These are diagnostics only.

## 172. Activity density

Use the feed to reveal meaningful events, not to create a “busy AI” spectacle.

## 173. Visual storytelling

The Reactor should tell a coherent story: target → investigation → evidence → pivot → verification → result. This is a story of evidence, not a scripted pipeline.

## 174. Desktop cinematic quality

Large desktop layouts can use layered surfaces, subtle depth, and graph/source transitions to create a high-end feel. Keep motion restrained and functional.

## 175. Mobile cinematic quality

Mobile should feel equally intentional: large current-action surface, clear typography, clean cards, and smooth transitions.

## 176. Dark-mode discipline

The existing dark aesthetic should remain primary. Avoid excessive pure black surfaces; use layered dark neutrals so cards and panels remain distinguishable.

## 177. Accent discipline

Use the existing accent family for active intelligence. Verification can use a separate semantic status. Do not make every card glow.

## 178. Border discipline

Thin borders should establish structure. Avoid dense nested borders around every element.

## 179. Radius discipline

Use a small number of radius tokens. The product should feel engineered rather than toy-like.

## 180. Iconography

Use one icon family consistently. Icons should communicate function, not decoration.

## 181. Microcopy

Prefer direct labels: `Researching`, `Reading source`, `Evidence found`, `Identity unresolved`, `Route verified`, `Complete`.

## 182. Tooltips

Tooltips should explain unfamiliar icons but not repeat obvious labels.

## 183. Contextual controls

Controls should appear near the object they affect. Avoid a universal toolbar full of irrelevant actions.

## 184. Selection states

Selected graph nodes, sources, and evidence should have clear focus treatment. Do not rely only on color.

## 185. Hover states

Hover can expose metadata on desktop. Every important hover state needs a click/tap equivalent.

## 186. Focus states

Keyboard focus should be visible without disrupting the visual hierarchy.

## 187. Scroll behavior

Avoid nested scrolling where possible. Reactor may require a scrollable feed, but the main source viewer should have clear ownership of its scroll region.

## 188. Mobile scroll behavior

Use natural document scrolling for cards and evidence. Avoid nested scroll containers unless necessary.

## 189. Bottom sheets

Evidence, source metadata, and action details should use bottom sheets on mobile. They must support drag/close and keyboard behavior.

## 190. Desktop drawers

Use side drawers for evidence and technical metadata. Drawer widths should be bounded and adjustable.

## 191. Full-screen source mode

Allow the browser/document renderer to become full-screen when the user wants to inspect evidence.

## 192. Focus mode

A focus mode can temporarily hide graph/feed to maximize source reading. Exiting focus restores the prior layout.

## 193. Research theater mode

For demos, a cinematic mode can emphasize live research activity. It must still be driven by actual fixture/live events and clearly indicate demo status when fixture data is used.

## 194. Product polish

Polish comes from edge cases: no flashing layouts, no clipped URLs, no broken long names, no dead buttons, no stale spinners, no unexplained status changes.

## 195. Browser support

Validate modern Chromium, Safari, and Firefox behavior where practical. Mobile Safari safe-area behavior is especially important.

## 196. Network resilience

The UI should remain usable on slow connections. Avoid making every telemetry event trigger a layout shift.

## 197. Data freshness

Show when data was retrieved. Avoid implying current truth when the source is historical.

## 198. Source retrieval timestamps

Where backend timestamps exist, expose them consistently in evidence and route cards.

## 199. Live status semantics

`Live` means receiving/processing current mission events. `Complete` means backend completion. `Idle` means no active mission. Do not conflate browser connection state with mission state.

## 200. Frontend/backend contract

The frontend should depend on stable semantic events, not implementation-specific backend logs. This makes the UI resilient as orchestration changes.

## 201. Event schema versioning

Version event schemas. Frontend should tolerate additive fields and handle unknown event types gracefully.

## 202. Unknown event renderer

Unknown events should appear as a compact diagnostic item rather than crashing the Reactor.

## 203. Data normalization

Normalize URLs, timestamps, entity IDs, event IDs, and source identifiers at the boundary. The UI should not perform identity inference.

## 204. State ownership

Backend owns truth. Frontend owns presentation state: selected node, open drawer, pane size, animation progress, filters, and layout preferences.

## 205. Optimistic UI

Use optimistic UI only for reversible local presentation changes. Mission state changes require backend confirmation.

## 206. React architecture

Break Reactor into semantic components rather than a monolithic component. Suggested modules:

- MissionHeader;
- LiveWorkspace;
- ActionRenderer;
- ActivityFeed;
- EvidenceInspector;
- ResearchGraph;
- EntityCard;
- SourcePreview;
- BrowserRenderer;
- RegistryRenderer;
- DocumentRenderer;
- NetworkView.

## 207. Renderer registry implementation

Use a typed registry with explicit fallback renderer. Each renderer receives normalized event data and presentation callbacks, not raw provider responses.

## 208. State management

Use a single normalized mission event/state model. Avoid duplicating mission truth in multiple React stores.

## 209. Selector discipline

Derive views from normalized state. Memoize expensive graph transformations and feed grouping.

## 210. Graph performance

Only update layout when topology changes. Do not recompute force layouts for every telemetry event.

## 211. Feed performance

Use virtualization after profiling confirms the need. First reduce unnecessary event richness in the rendered tree.

## 212. Source rendering performance

Avoid syntax-heavy rendering for ordinary web pages. Highlight only evidence spans that matter.

## 213. Browser renderer architecture

Keep browser chrome and source content separate. This allows source fixtures and real tool results to share presentation logic.

## 214. Demo/live separation

Provide an explicit data adapter boundary: `DemoMissionAdapter` vs `LiveMissionAdapter`. This prevents fixture data from leaking into production state.

## 215. Testing adapters

Unit test adapters independently from React components. Component tests can consume fixture state.

## 216. Accessibility testing

Use automated checks plus manual keyboard/screen-reader passes. Do not rely exclusively on automated accessibility scores.

## 217. Responsive contract evolution

The existing static responsive gate should expand from source-level assertions into browser-rendered assertions.

## 218. Screenshot test policy

Screenshots should be stable and intentional. Update baselines only after human review of the visual diff.

## 219. Visual diff review

A visual regression failure should produce desktop and mobile artifacts for inspection. The CI output should make it easy to identify which viewport changed.

## 220. Browser action replay tests

Create fixture-driven tests that simulate search → result → source open → evidence → entity update without calling providers. This validates the frontend's ability to render the real research story.

## 221. Live integration test

One provider-backed integration test should verify that actual event payloads render correctly. Keep it quota-controlled and separate from the large research batch.

## 222. Quota policy for frontend tests

Never use provider calls for visual regression. Use fixtures. Reserve provider-backed calls for contract/integration tests.

## 223. Frontend release gate

A frontend release should require:

- type/build success;
- responsive contract;
- browser smoke tests;
- visual regression review;
- accessibility checks;
- no console errors on key routes.

## 224. Console hygiene

Production surfaces should not emit noisy debug logs. Operator diagnostics should use a controlled logger.

## 225. Error boundary

Reactor and heavy visual components should have local error boundaries so one renderer failure does not destroy the entire mission view.

## 226. Renderer isolation

A malformed event should fail gracefully inside its renderer. It must not crash the whole mission shell.

## 227. Data corruption display

If an event lacks required provenance, the UI should show `Incomplete source metadata` rather than inventing it.

## 228. Truthfulness invariant

The frontend must never turn presentation inference into factual research. Every fact displayed in a card must come from backend state with provenance.

## 229. Visual confidence invariant

Visual prominence must not imply evidentiary confidence. A large card is not a stronger fact.

## 230. User trust

The best premium UI for Apex is one that users can audit. Every important conclusion should have a path back to evidence.

## 231. Research narrative

The interface should make research understandable to a non-expert while retaining enough depth for an analyst. This requires layered disclosure rather than two separate products.

## 232. First-time user experience

The standalone app should include a short guided introduction to Reactor concepts: target, action, source, evidence, entity, route. Avoid a lengthy onboarding wizard.

## 233. Demo target

A fictional or clearly synthetic demo target can demonstrate the full experience without implying that research has been conducted on a real person.

## 234. Mission launch copy

Use outcome-oriented language: `Start research`, `Investigate`, `Research target`. Avoid `Run pipeline` or `Execute workflow`.

## 235. Research terminology

Use `mission`, `research`, `source`, `evidence`, `entity`, `route`, `relationship`, and `finding`. Avoid overly technical orchestration terms in the normal UI.

## 236. Backend terminology translation

Raw terms such as `tool_call`, `react_step`, `provider_fallback`, and `hydration` belong in operator mode only.

## 237. Research progress

Do not use a fake 0–100% progress bar unless the backend has a meaningful completion estimate. Prefer qualitative states and evidence accumulation.

## 238. Progress alternative

A compact “research health” strip can show evidence breadth and unresolved questions without pretending to know percentage completion.

## 239. Mission timer

Elapsed time is useful, but should be secondary to current action and evidence.

## 240. Resource indicator

If reliable, show approximate tool/action budget remaining. Label it clearly as a resource constraint rather than research completeness.

## 241. Activity feed density controls

Allow `All`, `Important`, and `Technical` filters. Default to `Important` for normal users and `All` for analysts.

## 242. Evidence filter

Allow filtering to events that produced evidence. This helps users understand what actually improved the card.

## 243. Rejection filter

Allow viewing rejected hypotheses and collision checks. This is valuable for trust and QA.

## 244. Search filter

Allow viewing only search/open actions when diagnosing research behavior.

## 245. Mission export

Export should include the final card and evidence appendix, not raw chain-of-thought.

## 246. Audit export

Operator exports may include event IDs and tool metadata but must redact secrets.

## 247. Mobile export

Use native share/download behavior where supported. Do not require desktop-only interactions.

## 248. Network accessibility

Provide a list view of graph relationships for screen readers and mobile users.

## 249. Map accessibility

Provide a corresponding location list. The map is supplemental.

## 250. Wealth accessibility

Provide textual ranges and evidence links alongside charts.

## 251. Chart restraint

Use charts only where they clarify ownership, time, or ranges. Avoid generic dashboards.

## 252. Visual analytics

Potential future visualizations:

- ownership tree;
- wealth range waterfall;
- relationship network;
- evidence timeline;
- contact-route funnel.

All must be evidence-driven.

## 253. Ownership tree

Show direct/indirect ownership only where supported. Mark estimated or inferred relationships distinctly.

## 254. Wealth range waterfall

Use ranges and assumptions rather than false exactness. Each component links to evidence.

## 255. Contact-route funnel

Show discovered route classes from direct to indirect, but never imply a route exists if none was verified.

## 256. Evidence timeline

Show source dates and research events separately so users don't confuse publication chronology with Apex chronology.

## 257. Network provenance

Clicking an edge should reveal the supporting source(s).

## 258. Entity provenance

Clicking a person/organization node should open the entity card with evidence context.

## 259. Graph clustering

Cluster by organization or relationship type when the graph becomes dense. Let users disable clustering.

## 260. Graph labels

Avoid labels that overlap excessively. Use hover/focus for secondary metadata.

## 261. Graph mobile simplification

Use radial first-degree relationships or a list-first view. Full force-directed layouts are optional on small screens.

## 262. Research source thumbnails

Use thumbnails only when they genuinely help source identification. Do not create a visual wall of arbitrary favicons.

## 263. Domain badges

Domain text is more trustworthy than a favicon. Always show domain.

## 264. External navigation

External links should visibly leave Apex where appropriate.

## 265. Browser renderer ethics

Do not clone another site's brand identity so closely that users could mistake Apex's view for the external site. The metaphor is enough.

## 266. Search engine metaphor

Apex can display “Web research” with a search field and results rather than reproducing a third-party search engine's exact chrome.

## 267. Source page metaphor

Apex can display source title, domain, navigation-like structure, and content excerpt while clearly identifying it as an Apex source view.

## 268. Live typing fidelity

Actual query text should be revealed in order. Do not add filler words or alter punctuation during animation.

## 269. Tool-result fidelity

Render exactly what the normalized tool event says. If a result contains only a URL/title, do not fabricate a snippet.

## 270. Evidence highlight fidelity

Highlights should correspond to actual evidence offsets or excerpt text supplied by the backend. Do not highlight invented sentences.

## 271. Browser scroll fidelity

If backend telemetry records a source section/page, the renderer can move there. Otherwise keep the page static.

## 272. Source blocking fidelity

Blocked pages should look blocked, not like successful pages with empty content.

## 273. CAPTCHA fidelity

Display `Blocked by CAPTCHA` or equivalent. Never treat CAPTCHA text as research evidence.

## 274. Tool error fidelity

Provider/tool errors should be visually separate from source content.

## 275. Research action semantics

Every rendered action should answer: what happened, to what, with what result, and did it change the research state?

## 276. State delta indicators

Use small `+ evidence`, `+ relationship`, `identity unresolved`, etc. indicators to show impact.

## 277. Evidence count

Counts should be based on actual evidence objects. Avoid counting arbitrary feed events as evidence.

## 278. Entity count

Counts should distinguish accepted entities from hypotheses/rejected candidates.

## 279. Source count

Show unique sources rather than duplicate tool fetches where appropriate.

## 280. Research depth

A future depth indicator may show number of evidence-backed relationship hops, but should not reward depth for its own sake.

## 281. Quality over quantity

The UI should visually reward stronger evidence and resolved identity, not more nodes or more events.

## 282. Empty network

An empty network is acceptable and should explain that no relationships have yet been established.

## 283. Sparse evidence

Sparse evidence should be displayed calmly, not as a failure animation.

## 284. Strong evidence

Strong evidence can receive a subtle verified treatment, not excessive green glow.

## 285. Contradiction

Contradictions deserve stronger visibility than ordinary evidence because they require user attention.

## 286. Human review queue

If a mission needs review, surface the exact unresolved item. Do not simply show `Needs review`.

## 287. Review interaction

The analyst should be able to inspect sources and make a documented decision where backend permissions allow.

## 288. Decision provenance

Human decisions should be timestamped and separate from machine evidence.

## 289. Research annotations

Annotations should never alter source truth. They are analyst interpretation.

## 290. Collaboration future

Shared annotations and mission comments can be added later using the same distinction.

## 291. UI copy governance

Keep high-value labels in a central copy layer where feasible. Avoid inconsistent terms across routes.

## 292. Empty/loading/error copy

Use concise, human language. Avoid generic `Something went wrong` where a specific recovery explanation is possible.

## 293. Design system documentation

Document components, states, tokens, and responsive rules in the repository. This is more durable than screenshots alone.

## 294. Component story fixtures

If Storybook or equivalent exists/is introduced, create stories for all critical Reactor states. Do not introduce a large dependency merely for fashion if a lighter test harness is already present.

## 295. Design tokens as code

Tokens should be shared across CSS/JS where practical, avoiding drift between graph and UI styling.

## 296. Theming

Keep a single primary theme initially. A future light theme should not be a current priority unless requested.

## 297. User personalization

Allow density and motion preferences before allowing arbitrary color customization.

## 298. Responsive density

Mobile should automatically use a lower information density. Desktop analyst mode can be denser.

## 299. Browser viewport state

Remember the selected source/action during a session, not indefinitely across unrelated missions.

## 300. Mission deep links

Future authenticated product can support deep links to missions, entities, evidence, and source events. Build route state so these concepts are addressable.

## 301. Frontend observability

Track frontend errors, render latency, stream reconnects, and user-visible failures in operator telemetry. Do not collect unnecessary user data.

## 302. Performance measurement

Measure actual interaction latency for opening Reactor, selecting evidence, switching tabs, and rendering a large graph.

## 303. React profiling

Use profiling to find real hotspots. Do not memoize everything by default.

## 304. Graph library selection

Use the existing graph stack if it meets requirements. Replace it only if profiling or interaction requirements demonstrate a real limitation.

## 305. Map library selection

Prefer a performant, accessible map library compatible with current licensing and deployment constraints. Do not introduce a map dependency until the data contract exists.

## 306. Browser renderer implementation

Start with semantic HTML source cards rather than embedding arbitrary external sites in iframes. This is safer, more controllable, and more faithful to backend evidence.

## 307. External page rendering

If a future authenticated environment permits proxied source rendering, ensure content isolation and sanitization. Never execute arbitrary source scripts in the Apex application context.

## 308. Content sanitization

All source HTML rendered into the frontend must be sanitized by a trusted boundary. Prefer extracted text/structured content over raw HTML.

## 309. Link handling

External links must use safe navigation semantics and preserve provenance.

## 310. Source content security

Do not allow source content to override Apex styles, scripts, or application storage.

## 311. Browser simulation versus browser control

The UI represents backend browser/tool activity. It is not required to provide full remote-browser control in the current phase.

## 312. Future pair-browsing

A future feature could expose a live browser viewport if backend infrastructure supports it. This should be implemented as a stream of actual browser frames, not a fake animation.

## 313. Pair-browsing inspiration

Open-source browser-agent interfaces already demonstrate the value of live viewport plus command activity. Apex can adapt the pattern while retaining its evidence-first identity. citeturn0search11turn0search18

## 314. Browser viewport scaling

The desktop viewport should preserve readable proportions. On mobile, it can become a source card with selective content rather than a literal full desktop viewport.

## 315. Source interaction controls

Provide `Open source`, `Copy URL`, `View evidence`, and `Show related entities` where applicable.

## 316. Evidence-to-source navigation

Selecting an evidence claim should move focus to the relevant source excerpt.

## 317. Source-to-claim navigation

Selecting a source should show all claims it currently supports.

## 318. Claim-to-entity navigation

Selecting a claim should show the affected entity/card field.

## 319. Entity-to-network navigation

Selecting an entity should focus the graph/network around it.

## 320. Unified research object model

The frontend should conceptually connect:

`Mission → Event → Source → Evidence → Claim → Entity → Relationship → Route`

This is the core information architecture of Apex's UI.

## 321. Research breadcrumb

Use contextual breadcrumbs on desktop for deep evidence views. Mobile can use a back action and concise context.

## 322. Selection persistence

Switching between feed, graph, and evidence should preserve the selected object when possible.

## 323. Multi-select

Future analyst mode can compare multiple sources or entities. Do not build until the single-selection flow is excellent.

## 324. Bulk evidence review

Future review workflows can allow marking several weak sources as discovery-only. This should be an analyst feature.

## 325. Search result quality explanation

A result card can show whether it was opened and whether it contributed evidence. This makes search behavior understandable.

## 326. Research route visualization

The graph and timeline together should show the route Apex took through evidence, without implying that the route was pre-scripted.

## 327. Agent autonomy visualization

The UI should communicate autonomy through changing action selection, pivots, and concurrent investigations, not through animated “AI thinking” bubbles.

## 328. No fake brain

Avoid visual tropes such as pulsing neural networks, spinning brains, or decorative AI particles. Apex is a research instrument.

## 329. No token theater

Do not show token counters to normal users. Token usage is an implementation metric.

## 330. No tool-count theater

Do not show “47 tools used” as a success indicator.

## 331. No trajectory leaderboard

Never rank missions by length or tool count.

## 332. Outcome emphasis

The final state should emphasize factual findings, routes, evidence, and uncertainty.

## 333. Premium motion

Use motion to create continuity between research states: source enters, evidence highlights, entity card updates, graph node appears. This will feel premium because the transitions explain the system.

## 334. Animation timing

Animation duration should be decoupled from backend latency. The UI can animate the presentation while preserving real event timestamps.

## 335. Long-running research

For long runs, the user can leave Reactor and return. The mission should remain visible in a compact active indicator.

## 336. Background mission indicator

Desktop shell can show active mission count and status. Mobile header can show a small active dot/status.

## 337. Resume experience

Returning to a running mission should restore current state and show a concise “while you were away” summary based on actual events.

## 338. Away summary

Example: “12 new sources inspected · 3 evidence items added · 1 namesake rejected.” Only show counts derived from actual state.

## 339. Multiple missions

The Bureau should support multiple independent missions without mixing telemetry. Each mission has its own event namespace and state.

## 340. State isolation

Frontend stores must key mission state by mission ID. A late event from another mission must never mutate the current mission view.

## 341. Mission switching

Switching missions should be fast for persisted state. Live streams can connect/disconnect independently.

## 342. Multi-mission desktop

Future desktop can show a compact mission switcher. Do not overwhelm the current focused mission.

## 343. Multi-mission mobile

Use a simple mission picker sheet.

## 344. Mission prioritization

The Bureau can sort active missions by recent activity, not by arbitrary importance unless user-defined.

## 345. Notifications for completion

Future notifications can alert users when a mission completes or needs review. Notification content should summarize actual findings.

## 346. Mobile background state

When a mobile browser is backgrounded, the UI should reconcile persisted state on resume rather than assuming it received every live event.

## 347. Offline reconciliation

Use event IDs/sequence numbers to fill missed events.

## 348. Frontend contract tests

Write contract fixtures from actual backend event payloads whenever possible. This prevents drift between backend and frontend.

## 349. Backend schema collaboration

Frontend changes requiring new event fields should be documented in the bureau plan and implemented with compatibility handling.

## 350. Design implementation sequencing

Priority order:

P0: Reactor truthfulness and event-driven action rendering.
P0: Browser/search live view.
P0: Evidence inspector.
P0: Desktop/mobile responsive integrity.
P1: Research graph refinement.
P1: Person/entity cards.
P1: Contact route UX.
P1: Timeline/replay.
P2: Wealth/assets/maps.
P2: Advanced analyst modes.
P3: Collaboration/subscription/public-product features.

## 351. P0 browser renderer milestone

Build the browser/search renderer first because it directly answers the user's most important requirement: visually showing actual research happening.

Acceptance criteria:

- actual query appears;
- actual results appear;
- selected source appears;
- evidence is highlighted from actual backend data;
- source provenance is visible;
- no fabricated page content;
- works desktop/mobile.

## 352. P0 activity feed milestone

Acceptance criteria:

- normalized events;
- readable descriptions;
- timestamps;
- expandable technical metadata;
- evidence deltas;
- rejection/pivot events;
- no raw chain-of-thought.

## 353. P0 renderer registry milestone

Acceptance criteria:

- semantic action types;
- fallback renderer;
- renderer isolation;
- unknown events safe;
- unit tests.

## 354. P0 responsive milestone

Acceptance criteria at all specified viewports:

- no horizontal clipping;
- no inaccessible controls;
- no unusably small source text;
- no graph-only dead ends;
- drawers/sheets work;
- live status visible.

## 355. P1 entity-card milestone

Acceptance criteria:

- clear identity;
- source-backed role;
- organization separation;
- route distinction;
- evidence ledger;
- unresolved states;
- mobile layout.

## 356. P1 graph milestone

Acceptance criteria:

- evidence-backed nodes/edges;
- source inspection;
- filters;
- first-degree mobile view;
- no performance degradation on long missions.

## 357. P1 replay milestone

Acceptance criteria:

- deterministic replay from persisted events;
- no provider calls;
- timeline/graph/source synchronization;
- mobile support.

## 358. P2 wealth/map milestone

Acceptance criteria:

- ranges rather than false precision;
- source links;
- safe location handling;
- lazy loading;
- textual alternatives.

## 359. P2 analyst mode milestone

Acceptance criteria:

- technical telemetry;
- model/provider information;
- tool arguments with redaction;
- event IDs;
- fallback diagnostics.

## 360. P3 future product milestone

Only after standalone application quality is high:

- accounts;
- workspaces;
- sharing;
- saved collections;
- billing;
- team permissions.

These are explicitly outside current implementation priority.

## 361. Design benchmark strategy

Use public products as pattern references, not templates. Apollo demonstrates dense contact intelligence, embedded AI, customizable layouts, and workflow visibility. citeturn0search8turn0search12

Use current agent observability products/open-source interfaces for live action feeds and browser viewport concepts. citeturn0search11turn0search16

Use contemporary design-community work for visual polish, but require every inspiration to survive Apex's truthfulness constraints.

## 362. Figma/Behance research policy

When visual references are reviewed, record the specific pattern being borrowed: spacing, information hierarchy, motion, graph interaction, evidence presentation, or responsive behavior. Do not copy proprietary visual assets.

## 363. Monthly design review

Once per month during active frontend development, review current agent UX patterns and update this plan. The web changes rapidly; the repository plan must not become stale.

## 364. “Site of the year” inspiration policy

Award-winning sites can inspire typography, motion, storytelling, and spatial composition. Apex should borrow interaction principles, not marketing-site theatrics.

## 365. Product-market visual benchmark

The target is not “looks expensive.” The target is “looks like a serious instrument that deserves to be expensive.”

## 366. Trust as visual luxury

Clear provenance, calm states, precise typography, and consistent interaction are part of the premium aesthetic.

## 367. Research spectacle restraint

Live research can be visually impressive because the underlying activity is inherently interesting. The UI should reveal it rather than manufacture spectacle.

## 368. Browser theatre example

A search event should feel like:

`Apex → query appears → results arrive → source selected → evidence highlighted → card/graph changes`

The entire chain should be synchronized to real events.

## 369. Registry theatre example

A corporate registry action should feel like:

`Registry lookup → record opens → relevant officer/company relationship highlighted → graph updates → evidence ledger receives source`

## 370. WHOIS/domain theatre example

A domain action should feel like:

`Domain query → domain record → dates/registrant organization when public → relationship update`

Sensitive data must be handled according to backend policy.

## 371. Map theatre example

A geographic discovery should feel like:

`Location evidence → map marker appears → source/explanation opens`

## 372. Document theatre example

A PDF/document action should feel like:

`Document opened → page selected → relevant excerpt highlighted → claim/evidence linked`

## 373. Contact route theatre example

A contact route discovery should feel like:

`Route evidence found → route card updates → provenance appears → relationship path becomes visible`

## 374. Identity verification theatre

Identity resolution should feel like evidence convergence, not a confidence meter climbing. Sources appear, contradictions resolve, then the entity status changes.

## 375. Namesake rejection theatre

A wrong namesake should appear as a research correction event, not as a silent deletion.

## 376. Completion theatre

Mission completion should be quiet and satisfying: evidence settles, graph stops moving, summary appears, unresolved items remain visible.

## 377. No confetti

Avoid celebratory confetti for research completion. This is an intelligence instrument, not a consumer gamification app.

## 378. Loading philosophy

When waiting, tell the user what the system is waiting for where observable. `Waiting for source` is better than an indeterminate spinner.

## 379. Provider wait

If waiting on a model/provider, operator mode may show provider latency; normal mode should say `Research service responding` or similar only when accurate.

## 380. Tool queue

If an action is queued, show queued state rather than pretending it started.

## 381. Cancellation

If cancellation is requested, show `Stopping…` until backend confirmation.

## 382. Retry

Retry should be explicit and contextual. Do not automatically retry indefinitely.

## 383. Duplicate suppression

Frontend should deduplicate identical event IDs. It should not deduplicate semantically similar events because repeated research may be meaningful.

## 384. Event persistence

Completed missions should preserve enough event detail for replay and audit.

## 385. Privacy-safe logs

Frontend logs must redact secrets and sensitive query content according to policy.

## 386. Developer tools

Provide an operator-only event inspector that can copy normalized event JSON with secrets removed. This is valuable for debugging renderer/backend mismatches.

## 387. QA fixture generator

Create utilities that generate realistic event sequences without provider calls. These sequences should include branching, failures, contradictions, and completion.

## 388. Contract fixture provenance

Each fixture should indicate whether it is synthetic. Synthetic sources should never be treated as live evidence.

## 389. Story state naming

Use semantic names: `researching-browser`, `identity-conflict`, `route-verified`, etc., rather than generic `state1`.

## 390. Visual regression maintenance

When the design intentionally changes, update baselines and document the reason. Do not normalize accidental drift by blindly accepting snapshots.

## 391. Mobile device testing

Test real iOS/Android browser behavior where possible, especially safe-area, viewport height, keyboard, and sticky header behavior.

## 392. Virtual keyboard

Mission input and search interfaces must remain usable when the mobile keyboard opens. Do not let the keyboard cover primary actions.

## 393. Orientation

Support portrait as primary. Landscape should remain functional but need not optimize every surface.

## 394. Tablet

Tablet should use an intermediate layout: compact navigation plus larger source/evidence surface. Do not simply use phone layout at 768px.

## 395. Foldables

Use flexible containers rather than fixed assumptions so unusual viewport widths remain usable.

## 396. High zoom

Support browser zoom and large text without clipping critical evidence or controls.

## 397. Reduced data mode

If future network conditions require it, allow a lighter source preview mode. Do not silently degrade evidence fidelity.

## 398. Dark environment

The dark interface should maintain readability in low-light environments. Avoid ultra-low contrast muted text.

## 399. Color blindness

Do not encode verification/rejection only through color. Use icons/labels.

## 400. Final frontend north star

Apex Atlas should feel like this:

A user enters a research objective. Apex begins. The Reactor becomes alive—not with fake “AI thinking,” but with visible evidence of work. A real query appears. Search results arrive. A source opens in an Apex-owned browser-like surface. Relevant evidence becomes highlighted. A relationship appears on the graph. The entity card changes. A promising route is investigated. A namesake is rejected. The system pivots. Another source appears. The contact route becomes clearer. The graph settles. The card explains what is known, what is estimated, how the person can realistically be approached, and what remains unresolved.

On desktop, the user can see the research machine in its full depth. On mobile, the same truth is available through a focused sequence of live action, evidence, entity, and network views. The interface never pretends to know more than the backend established. It never forces the research model into a predetermined sequence. It never celebrates activity for activity's sake.

That is the frontend expression of Apex Atlas: **autonomous intelligence made observable, evidence made navigable, and complexity made understandable.**

## 401. Implementation backlog — immediate

1. Inventory current Reactor components and map each to the renderer registry.
2. Define normalized frontend event types from existing backend telemetry.
3. Implement browser/search renderer using actual events.
4. Implement evidence inspector with source provenance.
5. Remove/reframe fixed phase-rail semantics in favor of observed activity.
6. Add fixture-driven desktop/mobile Reactor states.
7. Add Playwright browser smoke tests if compatible with current repository.
8. Capture screenshots at required viewport matrix.
9. Fix real visual regressions.
10. Add graph/evidence synchronization.
11. Refine person cards and contact-route presentation.
12. Add replay from persisted events.
13. Add registry/document/domain action renderers.
14. Add map/wealth visualizations only after evidence contracts exist.
15. Add operator telemetry surface with redaction.
16. Audit accessibility.
17. Audit performance with long event streams.
18. Re-run the responsive CI gate.

## 402. Definition of frontend done

Frontend work is not done when the page looks polished. It is done when:

- every important live action has an honest visual representation;
- desktop and mobile are both first-class;
- the Reactor communicates actual research state;
- evidence is traceable;
- entity cards distinguish fact, estimate, route, and uncertainty;
- graph/map visualizations are evidence-backed;
- long missions remain usable;
- the UI survives stream interruption and reconnection;
- visual regression tests protect the experience;
- accessibility is acceptable;
- no feature requires fake provider calls or fabricated telemetry;
- the product feels premium because it is precise, coherent, and trustworthy.

## 403. Living-plan rule

This plan must be amended when implementation or evidence changes the architecture. Every material frontend finding should result in one of:

- implementation change;
- test/fixture addition;
- documentation update;
- explicit decision to defer.

The plan must never become a static promise disconnected from the repository.

## 404. Relationship to backend autonomy

The frontend is subordinate to backend truth but independent in presentation. It must not dictate how the boss, right hand, discovery agent, or research tools conduct research. It receives observable events and renders them. This is the critical separation that allows Apex to remain genuinely model-led while still being understandable to a human user.

## 405. Relationship to evaluation

Frontend quality does not substitute for research quality. A beautiful Reactor cannot compensate for hallucinated people, unsupported contacts, namesake collisions, or weak provenance. Internal evaluation should therefore continue to score card truth and evidence quality independently of frontend polish.

## 406. Relationship to cost

The $300k–$500k estimated application value is treated as a product-quality target, not as permission to add expensive infrastructure without evidence. Frontend work should maximize perceived and actual value through information architecture, reliability, observability, and interaction quality. Visual richness must be client-side wherever possible and must not consume provider quotas.

## 407. Final acceptance sequence

Before declaring the frontend mature:

1. static responsive contract;
2. type/build validation;
3. fixture-driven browser tests;
4. desktop/mobile screenshots;
5. accessibility checks;
6. long-stream performance test;
7. real provider event contract test;
8. audit live Reactor against actual Dig runs;
9. document discrepancies;
10. fix;
11. repeat.

No frontend “success” claim should be made from static inspection alone when a rendered behavior can be tested.

## 408. Current research references

- Agent UI research emphasizes visibility, context, intervention, audit trails, and measurable outcomes. citeturn0search2turn0search3
- Apollo's 2026 product direction emphasizes AI embedded in workflows, rich contact profiles, customizable layouts, and visual workflow state. citeturn0search0turn0search8turn0search12turn0search15
- Browser-agent tooling demonstrates live browser viewport plus command/activity monitoring, a strong conceptual reference for Apex's browser-research renderer. citeturn0search11turn0search18
- Current enterprise AI commentary increasingly treats observability and governance as essential to autonomous systems, reinforcing the need for a trustworthy live research surface. citeturn0news85turn0news90

## 409. Closing decision

The frontend program should proceed in parallel with backend research evaluation. While provider-backed Dig batches run, frontend development should use deterministic fixtures and existing telemetry so no provider quota is consumed unnecessarily. Later, one controlled provider-backed event-contract run should validate that the real Bureau stream renders through the same components.

The primary next implementation target is therefore **Reactor Live Under-the-Hood: actual semantic action → renderer → source/evidence visualization → state delta**, followed by desktop/mobile browser-level QA.
