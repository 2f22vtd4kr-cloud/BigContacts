# Frontend 40K Plan — Implementation Appendix

This appendix extends the frontend master plan into an execution-oriented design specification. It deliberately focuses on the areas most likely to determine whether Apex Atlas feels like a premium autonomous research bureau rather than a dashboard: Reactor live observability, semantic action rendering, source/evidence visualization, responsive behavior, and trustworthy entity intelligence.

## A. Reactor Live Under-the-Hood: canonical experience

The Reactor should be treated as a visual debugger and research cockpit for the human operator. The interface should not attempt to expose hidden model deliberation. Instead, it should expose the observable sequence of actions and evidence transformations that make the mission intelligible.

The canonical event story is:

1. Mission starts.
2. Current target and objective appear.
3. Apex selects an observable action.
4. The action is represented with the appropriate renderer.
5. Tool input is displayed where safe and useful.
6. Tool result arrives.
7. Source/evidence is displayed.
8. Research state changes.
9. Graph/card/timeline update.
10. Apex selects the next action.
11. The cycle repeats until completion, pause, failure, or cancellation.

The frontend must never assume that step 10 will be another web search. The next action may be a registry lookup, a domain query, an organization page, a document, a map lookup, a relationship investigation, or a decision to stop.

## B. Semantic event taxonomy

The frontend should define a semantic event taxonomy independent of backend implementation details. Events should have stable IDs, mission IDs, timestamps, sequence numbers, actor categories, action types, status, source references, and optional result/evidence deltas.

Suggested event envelope:

- `event_id`
- `mission_id`
- `sequence`
- `occurred_at`
- `event_type`
- `actor`
- `action`
- `status`
- `target`
- `source`
- `result`
- `evidence_delta`
- `entity_delta`
- `relationship_delta`
- `diagnostics`

The frontend should not require every field for every event. It should render the strongest available representation and clearly mark incomplete metadata.

## C. Action renderer contracts

Every action renderer should have a narrow contract. It receives normalized data and returns a presentation. It does not fetch providers. It does not infer identity. It does not mutate research truth.

The renderer can own:

- animation;
- layout;
- local selection;
- source highlighting;
- responsive behavior;
- presentation filtering.

The renderer cannot own:

- evidence validation;
- candidate promotion;
- source authenticity decisions;
- provider calls;
- hidden research logic.

This boundary prevents the frontend from becoming another accidental research engine.

## D. Browser renderer detailed behavior

When `web.search` starts, the renderer creates a browser-like search workspace. The query is displayed from the actual action payload. A short typing animation reveals the existing string rather than generating it. The caret stops when the backend reports that the action has completed or failed.

The results area begins in a skeleton state. When results arrive, each result card is populated from actual fields. The selected result receives an active state only when the backend indicates that it was selected/opened or the user explicitly selects it in an inspection mode.

When `web.open` occurs, the renderer transitions the selected result into a source view. The source title and domain appear immediately. Extracted content is rendered from the normalized source payload. Evidence highlights appear only after evidence events or source annotations are received.

If the source is blocked, the content area becomes a blocked-source state. The UI must not substitute generic page text.

If a source contains only metadata, the renderer says `Metadata available` rather than pretending the page was read.

## E. Browser renderer responsive behavior

Desktop:

- browser chrome at the top;
- source content center;
- evidence rail to the side;
- compact action metadata above;
- optional graph minimap.

Tablet:

- browser chrome remains;
- evidence rail becomes a drawer;
- graph minimap becomes a button.

Mobile:

- browser chrome becomes compact source header;
- evidence becomes a bottom sheet;
- graph is a separate tab;
- activity feed is below/behind the source view.

The mobile source renderer must preserve domain, title, and evidence context even when the full page is not shown.

## F. Search renderer details

Search results should support multiple source types. Each result card should expose enough information for a user to understand why Apex might inspect it: title, domain, snippet, date if available, and source type. It should also expose whether the result produced evidence.

The UI should not display a fabricated “relevance score” unless the backend actually returns one. A subtle source-status badge is preferable.

## G. Evidence animation

Evidence should not simply pop into the card. The visual transition should connect source to claim to entity.

Suggested sequence:

- source excerpt receives a subtle highlight;
- evidence badge appears;
- claim appears in evidence inspector;
- affected card field receives a short highlight;
- graph relationship appears if applicable.

This animation makes the research process understandable without exposing private reasoning.

## H. Identity resolution interface

Identity is one of Apex's highest-risk domains. The frontend must help users understand identity status.

States:

- Candidate;
- Supported;
- Strongly supported;
- Verified;
- Namesake conflict;
- Unresolved;
- Rejected.

A candidate should never be styled like a verified person. A rejected phrase such as a job title or organization fragment should be visible only as a rejected research event, not as a person card.

## I. Identity comparison

When multiple people share a name, the UI should offer a comparison sheet. Each candidate has:

- name;
- organizations;
- roles;
- geography;
- chronology;
- supporting sources;
- conflicting sources.

The comparison must not imply certainty if the backend has not resolved the collision.

## J. Person card hierarchy

The person card should use a hierarchy based on decision usefulness:

1. Name and identity status.
2. Current/relevant role.
3. Primary organization.
4. Why the person is relevant.
5. Strongest contact route.
6. Key organizations/vehicles.
7. Evidence-backed network.
8. Wealth/asset estimates where relevant.
9. Evidence ledger.
10. Unresolved questions.

This order keeps the card useful to someone trying to understand or reach the person.

## K. Card language examples

Instead of:

`contact_type: organization_contact`

show:

`Company route`

Instead of:

`confidence: 0.81`

show:

`Supported by 2 sources`

Instead of:

`wealth_estimate: 100000000`

show:

`Estimated wealth/exposure: $80–120M`

with methodology and source links.

## L. Wealth intelligence UX

Wealth information is inherently uncertain. The UI should therefore focus on structure rather than a giant number.

Recommended layout:

- estimated range;
- date of estimate;
- major known/inferred components;
- ownership relationships;
- public disclosures;
- evidence basis;
- uncertainty note.

A horizontal range bar can communicate uncertainty more honestly than a single number.

## M. Asset/network relationship UX

Assets and organizations should be connected visually. A user should be able to move from a person to an organization, from organization to ownership, and from ownership to evidence without losing context.

Every relationship should have a source affordance.

## N. Map UX

The map should not become a generic “rich people map.” It should answer a research question: where is there evidence of a meaningful relationship?

Examples:

- company location;
- investment location;
- public corporate registration;
- publicly reported asset location.

Sensitive precise residential information should not be made visually prominent merely because it exists somewhere upstream.

## O. Relationship map UX

The network should use semantic edge labels. Hovering or tapping an edge reveals the evidence. The graph should support filtering by relationship type and confidence/evidence status.

The default graph should remain small. Progressive disclosure prevents the visual from becoming a hairball.

## P. Research timeline

The timeline combines mission chronology with evidence chronology. These must be visually distinct. A source published in 2021 and read by Apex in 2026 are two different timestamps.

The timeline can show:

- research action;
- source publication;
- evidence captured;
- entity update;
- relationship update;
- rejection;
- completion.

## Q. Under-the-hood feed language

The feed should use concise operational prose.

Good:

`Web search · 08:19:12`
`Opened official company page`
`Evidence found · board appointment`
`Identity conflict detected · second John Smith`
`Rejected candidate · source did not establish a person`
`Contact route found · executive office`

Bad:

`The AI thought that this was probably a good source because...`

The latter implies access to hidden cognition and adds little value.

## R. Live feed grouping

Group events when they form one obvious action. A search action may contain multiple result-fetch events. The user can expand the group to inspect detail.

High-value corrections should remain visible even inside groups.

## S. Live feed filters

Default filters:

- Important;
- Evidence;
- Sources;
- All.

Operator filters:

- Tool calls;
- Provider;
- Fallback;
- Errors;
- Raw event metadata.

## T. Live feed search

For long runs, allow searching the feed by source domain, entity name, event type, or URL. This is especially useful for QA.

## U. Live feed replay

The feed should support replay of a completed mission. Replay should not call the backend. It rehydrates persisted events and animates them locally.

## V. Reactor graph synchronization

When an entity delta arrives, the graph and card should update from the same normalized state. Avoid independent local copies that can diverge.

## W. Reactor inspector synchronization

Selecting a source in the feed should focus the browser renderer and evidence inspector. Selecting an entity should focus the graph and card. Selecting an edge should focus the evidence supporting that relationship.

## X. Desktop pane system

The desktop Reactor should support adjustable pane widths. Default layout should favor the active research workspace.

A possible 1440px default:

- 220px navigation;
- 700px research workspace;
- 300px graph/context;
- remaining space for activity/evidence depending on mode.

However, exact percentages should be derived from actual rendered usability rather than fixed assumptions.

## Y. Full-screen research mode

A source can become full-screen for detailed reading. The user should retain a small mission/status strip so they never lose context.

## Z. Analyst focus mode

The graph and feed can be minimized. This mode is useful when reading a long source.

## AA. Mobile tab model

Mobile Reactor tabs:

`Live` — current action/source.
`Evidence` — claims and sources.
`Network` — relationships.
`History` — event timeline.

The current mission status remains visible above the tabs.

## AB. Mobile live action card

The top of the Live tab should contain the current action in a prominent card. It includes action type, query/source, status, and a short state delta.

The rest of the page is supporting context.

## AC. Mobile source reading

The source view should prioritize title, domain, excerpt, and evidence. Avoid trying to recreate a desktop browser viewport literally.

## AD. Mobile graph

Show first-degree relationships and provide expansion controls. A list of relationships should always be available as an alternative.

## AE. Mobile evidence sheet

Evidence sheet structure:

- claim;
- status;
- source;
- excerpt;
- retrieved/publication date;
- affected entity/field.

## AF. Mobile card

Use sections that can expand/collapse. Keep identity and strongest route visible.

## AG. Desktop entity page

The entity page should support a split layout: identity/card left, evidence and network right. A top summary strip should communicate the research state.

## AH. Entity page tabs

Suggested desktop tabs:

- Overview;
- Evidence;
- Network;
- Contact routes;
- Timeline;
- Assets;
- Research history.

Not every tab needs to appear if data does not exist.

## AI. Entity overview

Overview should answer the user's primary questions without requiring scrolling through technical data.

## AJ. Contact route ranking

Contact routes should be ordered by established usefulness, not by a generic field order. The backend can provide a route quality class; the frontend presents it.

## AK. Contact route explanation

Each route should say why it is considered a route and what relationship it has to the person.

## AL. Contact route uncertainty

A route may be public but not direct. The UI must communicate that distinction.

## AM. Organization route

Organization contact cards should show organization identity prominently and the person association separately.

## AN. Intermediary route

Intermediary cards should identify the intermediary's role and the evidence connecting them to the target.

## AO. Public profile route

Public profile links should show platform/domain and evidence association. They should not automatically be labeled “verified identity.”

## AP. No-contact state

If no useful contact route is found, say so. The card can still show the strongest organizational or public-profile route if one exists.

## AQ. Evidence-first design system

The design system should treat evidence as a first-class object. A generic card component should support an optional provenance footer, status badge, source link, and evidence drawer.

## AR. Source chips

Source chips should be compact, readable, and consistent across cards, feed, graph, and evidence inspector.

## AS. Evidence badges

Use text plus icon for `Primary`, `Official`, `Registry`, `Secondary`, `Discovery`. Avoid relying solely on colors.

## AT. Source metadata

Metadata should never compete with the claim. Keep it visually secondary.

## AU. Claim cards

A claim card contains the claim in plain language, status, source count, and evidence links.

## AV. Claim status

Status should be backend-driven. The frontend never calculates a confidence score from text.

## AW. Contradiction card

A contradiction card shows competing claims and sources side by side. It should be visually prominent enough to attract attention but not alarming.

## AX. Rejection card

A rejection card explains the observable rejection reason, such as `No person identity established` or `Namesake mismatch`, when the backend provides it.

## AY. Research correction

A correction is a positive trust signal. The UI should communicate that Apex can discard bad hypotheses.

## AZ. Discovery candidate queue

Discovery results can appear in a queue before promotion. Each candidate card shows evidence status and source, making it clear that discovery is not final identity.

## BA. Candidate-to-entity transition

When a candidate becomes a promoted entity, the UI should show the transition in the research history. This is important for auditability.

## BB. Candidate rejection transition

Rejected candidates remain in mission history but do not pollute the entity collection.

## BC. Organization discovery

Organizations can be discovered independently of people. Their cards should support company profile, key people, domains, ownership, and evidence.

## BD. Domain intelligence

Domain pages should show domain, dates, public organizational relationship, and source evidence. Avoid exposing sensitive registrant data unless policy permits.

## BE. Corporate records

Corporate records should be rendered as structured facts with dates and source references.

## BF. Document intelligence

Document pages should show source title, pages, relevant excerpts, and claims. If OCR quality is poor, say so.

## BG. Search-source quality

Search result snippets are discovery evidence, not automatically authoritative evidence. The UI should visually distinguish snippets from opened primary sources.

## BH. Primary-source preference

When a primary source exists, the evidence view should make it easy to see it alongside discovery sources.

## BI. Evidence provenance graph

Future analyst mode can show a claim-to-source bipartite view. This is especially useful for debugging unsupported claims.

## BJ. Research health

A compact research health strip can include:

- identity;
- evidence;
- route;
- unresolved.

It should never be a single opaque number.

## BK. Mission outcome

Completed mission header should state:

`Research complete`

and a compact result summary. If incomplete, use `Research complete with unresolved items`.

## BL. Completion detail

Show key findings, strongest route, evidence count, unresolved conflicts, and next optional action.

## BM. No forced next action

The frontend should not automatically launch another research action after completion. User choice and backend mission state remain authoritative.

## BN. Research deepening

A `Research deeper` control can launch a new mission continuation, but should explain that additional research consumes resources and may not improve the result.

## BO. Cost-conscious UX

If quota/cost data exists, deepening can show a resource estimate. If not, simply warn that it initiates additional provider/tool work.

## BP. Demo theatre

Demo mode should show the complete visual story using deterministic fixtures. The demo must be obviously labeled and must not create false research claims.

## BQ. Fixture quality

Fixtures should include realistic branching and corrections. A demo that only succeeds is less useful than one that shows search, rejection, pivot, verification, and completion.

## BR. Fixture source labels

Synthetic sources must carry a `Demo source` marker in operator/dev mode.

## BS. Frontend CI

The responsive contract should be followed by browser smoke tests and screenshots. The CI gate should fail on build errors, route errors, missing responsive requirements, and unexpected console errors.

## BT. Screenshot matrix

Minimum matrix:

- 320×568;
- 390×844;
- 768×1024;
- 1024×768;
- 1280×800;
- 1440×900.

Additional 1920×1080 validation is desirable for large desktop composition.

## BU. Screenshot states

Minimum states:

- Bureau empty;
- Bureau active;
- Reactor searching;
- Reactor reading;
- Reactor evidence found;
- Reactor identity conflict;
- Reactor completed;
- entity card;
- network;
- mobile drawer;
- error/reconnect.

## BV. Visual QA process

Review each screenshot as a product designer and as a researcher. Ask whether the UI communicates the research state at a glance and whether any element implies unsupported truth.

## BW. Accessibility process

Use automated audits plus keyboard navigation and manual screen-reader review. Graph and map views require text alternatives.

## BX. Performance process

Test a mission with at least several thousand normalized events using fixtures. Measure initial render, event ingestion, feed scrolling, graph updates, and source switching.

## BY. Long-run feed

Virtualization or pagination should be introduced only after real performance testing. The first goal is efficient state normalization and rendering.

## BZ. Memory management

Completed mission views should release unnecessary live subscriptions. Returning to a mission reconnects cleanly.

## CA. Stream lifecycle

Start a mission stream when entering a live mission. Reconcile on reconnect. Stop subscriptions when leaving the mission if no background UI requires them.

## CB. Event replay protection

Use event IDs and sequence numbers. Never duplicate an event because of reconnect.

## CC. Multi-agent concurrency

When multiple research branches run, the feed can show lanes. The current active lane is highlighted. The user can inspect other branches without assuming a fixed order.

## CD. Parallel branch graph

Graph edges can be colored by branch only if the design language can remain restrained. Prefer branch labels and subtle lane markers over rainbow coloring.

## CE. Boss/right-hand role UI

A small mission header can show `Bureau` and `Research` roles if useful. Avoid anthropomorphic avatars or fake conversation bubbles unless the backend actually exposes a user-facing collaboration event.

## CF. Provider fallback UI

Operator mode should make fallback visible because it can explain quality regressions. Normal users should not be burdened by provider implementation detail.

## CG. Tool failure recovery

A tool failure can appear as an event with `Recoverable` state. If the backend chooses another route, the next action naturally follows.

## CH. Source failure recovery

A source can be blocked while the mission continues. The UI should show the failure as local to that source.

## CI. Contradictory evidence recovery

Contradiction should trigger a visible unresolved state, not a forced selection.

## CJ. Research completion without contact

A mission can be complete even without direct contact. The UI should not imply failure when the best honest result is an organization or intermediary route.

## CK. Research completion without wealth

Wealth may remain unestablished. The UI should not pressure the system to estimate it.

## CL. Research completion without network

Sparse network is valid. The card should remain useful.

## CM. Premium feel through hierarchy

The highest-value visual elements should be:

- current target;
- current research action;
- strongest evidence;
- final route.

Everything else supports these.

## CN. Premium feel through motion

Motion should make cause and effect obvious. A source opens because an action happened. Evidence highlights because an evidence event arrived. A node appears because a relationship was established.

## CO. Premium feel through restraint

Do not animate everything. Do not glow everything. Do not show every technical field by default.

## CP. Premium feel through typography

Use consistent baseline rhythm, careful line lengths, and strong numerical alignment. Research interfaces benefit from typographic precision more than ornamental graphics.

## CQ. Premium feel through density

Desktop can be information-dense while remaining readable. Mobile should be selective. The product should feel like a professional instrument in both contexts.

## CR. Premium feel through state completeness

Every button and panel should have loading, empty, error, disabled, success, and active states where relevant.

## CS. Premium feel through trust

Provenance and uncertainty are visible. This is a major differentiator from generic AI dashboards.

## CT. Public design inspiration policy

Public design references from Behance, Figma Community, award sites, and open-source projects should be used as inspiration for layout and interaction patterns. Do not copy proprietary assets, branded UI, or visual identities.

## CU. Apollo lessons

Apollo's 2026 product direction demonstrates the value of integrating AI directly into workflow surfaces, keeping contact profiles rich, and allowing customizable layouts. citeturn0search8turn0search12turn0search15

For Apex, the adaptation is: put intelligence into the research surface itself, make the person card rich, and let users control density without changing the underlying research model.

## CV. Agent-browser lessons

Live browser viewport and activity-feed patterns are useful because they expose what an agent is doing without requiring private reasoning disclosure. citeturn0search11turn0search18

Apex should go further by connecting browser activity to evidence and entity changes.

## CW. Agentic UX lessons

Current 2026 agent UX guidance emphasizes visible context, scoped autonomy, auditability, and intervention. citeturn0search2turn0search3

Apex's interface should therefore communicate autonomy through observable actions and evidence, while preserving clear boundaries around what users can control.

## CX. Governance lessons

Recent enterprise AI discussion emphasizes observability and accountability for autonomous systems. citeturn0news85turn0news90

For Apex, the implication is practical: the live feed is not a marketing animation. It is part of the trust and debugging architecture.

## CY. Frontend roadmap gate 1

Before visual polish expands, normalize the event contract and renderer registry.

## CZ. Frontend roadmap gate 2

Build browser/search/evidence rendering from real fixture events.

## DA. Frontend roadmap gate 3

Run browser-level desktop/mobile screenshots.

## DB. Frontend roadmap gate 4

Fix responsive defects and accessibility issues.

## DC. Frontend roadmap gate 5

Connect one controlled provider-backed run and verify that real event payloads render honestly.

## DD. Frontend roadmap gate 6

Build entity/contact/evidence refinements.

## DE. Frontend roadmap gate 7

Build replay and analyst tools.

## DF. Frontend roadmap gate 8

Add maps/wealth/asset visualization only after backend evidence contracts are stable.

## DG. Frontend roadmap gate 9

Run full frontend regression against the live Bureau while the 10-target backend batches continue.

## DH. Frontend roadmap gate 10

Freeze the visual language and document the component system.

## DI. Non-goals

Do not currently build:

- billing;
- public account onboarding;
- marketing website;
- social sharing;
- full CRM replacement;
- outbound campaign automation;
- provider-selection UI for ordinary users;
- fake browser control;
- chain-of-thought viewer;
- gamified research metrics.

## DJ. Critical anti-patterns

Never:

- fabricate a search query for animation;
- fabricate a source preview;
- call a generic company email a direct personal email;
- show a candidate as verified before backend promotion;
- show a fixed phase rail as if it were the research algorithm;
- use token/tool counts as success metrics;
- expose secrets in operator telemetry;
- start provider calls just to make the UI look alive.

## DK. Final frontend acceptance rubric

A reviewer should be able to open an active mission and answer, without reading documentation:

- What is Apex researching?
- What is it doing now?
- What source is it using?
- What evidence did it find?
- What changed because of that evidence?
- Is the identity established?
- How can the person realistically be reached?
- What remains uncertain?

If the answer to any of these is not obvious, the frontend needs more work.

## DL. Long-term north star

The ultimate frontend should make autonomous research feel tangible. Not theatrical. Not mysterious. Tangible.

A user watches a real search query appear. Results arrive. A source opens. Evidence is highlighted. A corporate relationship becomes a node. A namesake is rejected. A different route is pursued. A contact path emerges. The card becomes more precise. The network becomes more coherent. The mission ends with a concise explanation of what was established and what was not.

That experience is the visual identity of Apex Atlas.
