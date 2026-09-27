# BigContacts Frontend UI/UX Audit

## Audit scope

- Product: Apex Atlas / BigContacts frontend
- Repository: `2f22vtd4kr-cloud/BigContacts`
- Baseline repaired commit: `2400498b2ba8f93f5fb4e06043a280d1955d138d`
- Current source after audit repairs: `72606aa151c71c5442e9a9d15afbc12f60f1d562`
- Scope: visual, responsive, interaction, accessibility, state, and layout review across desktop, tablet, and mobile.
- Source-level work does not run the Apex runtime in this environment.
- Browser/Replit observations are kept separate from source findings.
- This document is a living implementation brief. Findings and audit passes are appended rather than silently replacing earlier evidence.

## Important distinction

The earlier source repair cycle had already completed five clean source audits at `2400498`, but the Replit workspace had not returned five completed empirical browser passes. This audit therefore treats browser verification as pending unless a Replit evidence record explicitly proves otherwise.

The user specifically requested:
- a complete frontend element inventory;
- every issue, spacing defect, idea, and improvement written into the audit file;
- progressive updates after each step/pass;
- a Canvas exploration request for a subtle grain/noise treatment;
- explicit attention to the visible viewport-edge spacing defect.

## Reference: grain / background-noise direction

The supplied external screenshot is the visual reference for a subtle grainy/noisy field: a dark blue/indigo base with fine irregular texture and faint scattered specks.

### Desired Apex Atlas direction

- Very fine, irregular grain/noise.
- Dark navy/blue base.
- Very low-opacity light/cyan/blue specks.
- No obvious repeating tile.
- No large particles.
- No harsh contrast.
- No interference with text, borders, controls, cards, or focus rings.
- The texture should feel atmospheric rather than decorative.
- It should work as a full-page background and may be explored as a restrained panel texture.
- Compare the result visually against the supplied reference rather than interpreting the request as a literal image copy.

### Canvas exploration request

Create a Canvas visual concept titled **“Apex Atlas — subtle grain background noise”**.

Acceptance criteria:
1. Fine, irregular, non-obvious grain.
2. Dark navy/blue base.
3. Low-opacity light/cyan/blue noise.
4. No visible tiling.
5. No harsh contrast or large particles.
6. Text and UI controls remain fully readable.
7. Explore page-background use first; optionally test a weaker panel treatment.
8. Keep this as a design exploration/audit artifact unless a later implementation request explicitly promotes it into product code.

## Explicit spacing correction

### P0/P1 — Dashboard content must have a real page gutter

The most visible defect in the supplied captures is not merely a sidebar-offset problem.

Observed/recorded:
- Dashboard content can visually approach or touch the viewport edge at tablet/mobile sizes.
- The scoreboard/status row and dashboard cards can appear flush with the viewport.
- The live-status dot can look clipped when the horizontal coordinate system escapes the intended content box.
- Hero heading, supporting copy, shortcut controls, stats, and lower profile cards need a shared safe content edge.
- Desktop also needs a deliberate inner content edge; a sidebar offset is not the same thing as a page gutter.

Required design rule:
- Shell offset and page inset are separate concepts.
- Route title/status rows, hero content, control bands, grids, cards, error surfaces, and focus rings should align to one stable inner content edge unless a section is intentionally full-bleed.
- Full-bleed backgrounds must be separated from contained content.
- Validate at 390px, 768px, 900px, 1024px, 1280px and with zoom/scrollbar variations.

### Current source status

The current source now has a shared `.atlas-page` contract with bounded width and responsive horizontal padding, and the dashboard no longer uses the former rail-overlap/100vw compensation. The final source audit found no remaining legacy dashboard rail compensation.

## Global application frame inventory

### Desktop navigation rail
- Fixed left Apex Atlas mark.
- “Private workspace” label.
- Research Desk navigation.
- Reference navigation.
- Workspace Settings/admin navigation.
- Public Records Workspace footer marker.
- Active routes use lime treatment and a small active dot.
- Desktop rail collapses so graph/research surfaces can gain room.

### Mobile navigation
- Top-left menu button.
- Full-height drawer.
- Overlay dismissal.
- Close control.
- Same route groups as desktop.
- Focus is moved into the drawer on open and returned to the menu trigger on close.
- Global menu trigger now has a 44px minimum target.

### Application header
- Apex Atlas · Research desk breadcrumb/title on desktop.
- Current route title.
- Launch action where appropriate.
- Workspace/provider/database state.
- API key health.
- Safe-area-aware horizontal padding.
- Mobile controls are horizontally scrollable rather than forcing header overflow.

### Global error/recovery layer
- Severity-based alert.
- Title, message, explanation, next steps.
- Retry when retryable.
- System Status action.
- Dismiss control.
- Bounded height and internal scrolling.
- All prominent actions now use 44px minimum height; dismiss is also 44px by 44px.
- Remaining UX question for browser audit: whether the diagnostic panel still visually obscures too much task content on 390px screens. This is a browser-layout verification item, not claimed solved solely by source inspection.

### Shared visual language
- Dark navy/slate surfaces.
- Lime primary state.
- Cyan/teal secondary accent.
- Coral/orange/rose failure states.
- Rounded cards.
- Mono uppercase metadata.
- Display face for major headings.
- Restrained shadows/glows.
- Existing film-grain token is now attached to the visible application canvas so it cannot be hidden behind an opaque parent/child background layer.

## Route inventory

### Dashboard / Overview
Elements:
- Scoreboard strip.
- Live-dot Research Desk label.
- “People worth knowing.” hero.
- Research explanation.
- Depth selector.
- Launch Apex Atlas.
- Reactor and Discover secondary actions.
- Shortcut strip.
- Entity/Priority/Assets/Links stat tiles.
- Priority profile section.
- Lead cards.
- Evidence footer.

Review:
- Strong desktop composition.
- Tablet hero/action geometry requires deliberate validation around 768–1024px.
- Stats must be checked for density at ~900px.
- Mobile launch hierarchy is clear but populated-state fold position should be rechecked.
- Page gutter must remain stable across all dashboard sections.

### Search / Discover / Deep Search
Elements:
- Search identity line.
- Search field.
- Submit action.
- Filters control.
- Suggested query chips.
- Desktop split result/filter layout.
- Cold-start empty state.
- Registry action.
- Live reactor action.
- Result/source/evidence actions.
- Agent pipeline during search.

Review:
- Mobile stacking is understandable.
- Suggestion chips need a deliberate wrap/scroll/collapse decision.
- Submit state should communicate ready/loading/disabled semantics.
- Tablet pipeline must remain stacked until the laptop breakpoint; the former `md:w-80` geometry was corrected.

### Profiles / Entity Ledger
Elements:
- Context/status line.
- Search.
- View filters.
- Entity-type filters.
- Contact/route quality filters.
- Desktop table.
- Mobile expandable cards.
- Loading state.
- Empty state.
- Add entity action/modal.

Review:
- Capability is comprehensive.
- Control density is high.
- Horizontal mobile filter rails need an obvious affordance and keyboard reachability.
- Loading, empty, and failure states should be visually distinct.
- The exact loading copy is source-controlled; browser verification must confirm it settles into a terminal state.

### Network / Connections
Elements:
- Relationship graph.
- Empty graph state.
- Launch/Open ledger/Discover actions.
- Populated nodes/edges/selection state when data exists.

Review:
- Empty-state hierarchy is clear.
- Global operational errors can visually compete with the graph state.
- Populated graph and relationship-path behavior still require successful API data for empirical verification.

### Research / Intel Terminal
Elements:
- Target-selection pane.
- Terminal pane.
- Target/mode metadata.
- Event stream.
- Awaiting-target state.
- Introduction-path panel.
- Sessions/cases/evidence/events/contact/provenance data.

Review:
- Strong product-specific split-pane concept.
- Empty terminal has a large dark area and should make the next user action explicit.
- Populated trajectory/replay behavior remains data-dependent.

### Intelligence Reactor
Elements:
- Depth selector.
- Launch action.
- Live/nominal status.
- History and refresh.
- Live tool scene.
- Standby state.
- Event/activity feed.
- Research telemetry.
- Provider/model status.
- Mobile feed/history interaction.

Review:
- Mobile control hierarchy is structurally sound.
- 44px Reactor touch targets are enforced.
- Standby must remain visually distinct from failure.
- Browser verification must confirm that global failure UI does not hide the live/standby narrative.

### Field Manual
Elements:
- Intro.
- Quick links.
- Section search.
- Accordion documentation.
- Role cards for Boss, Right-hand, Investigator.
- Central rule callout.

Review:
- Good pattern for dense operational documentation.
- Preserve its short framing, bounded sections, and single emphasized rule.

### Workspace Activity / Jobs
Elements:
- Research Reactor destination.
- Research cases.
- Entity ledger.
- Duplicate review.
- System status.
- Architecture invariant callout.

Review:
- Concise and scannable.
- Reusable information-dense admin pattern.

### System Status
Elements:
- Status intro.
- Refresh.
- Provider/key-pool cards.
- Database indicators.
- Open research lanes.
- Configuration/status panels.
- Failure state.

Review:
- Useful diagnostics.
- Browser audit should verify whether page-specific failure text and global failure notice duplicate each other excessively.

### Data Sources
Elements:
- Source summary.
- Registry runtime accordion.
- Coverage/jurisdiction/runtime/review details.
- Discovery quality funnel.
- Identity resolution metrics.
- Source-quality panels.
- Registry/bulk ingestor cards.

Review:
- Accordion structure is coherent.
- Standardize unavailable metric conventions (`—`, `0`, prose) if the data model permits.
- Keep API outage distinct from “zero data.”

### Duplicate Review
Elements:
- Header.
- Similarity count.
- Refresh.
- Cross-registry tab.
- Same-source clusters.
- Candidate pair cards.
- Evidence/conflict context.
- Review actions.
- Empty/error state.

Review:
- Empty state should distinguish “no candidate pairs” from “candidate service unavailable.”
- Tablet comparison geometry was corrected to stack until laptop width.

### Persona Review / Improvements
Elements:
- Run Loop.
- Apply safe fixes.
- Clean duplicates.
- Persona summary.
- Research API requirement.
- Improvement results/logs.

Review:
- Action hierarchy is understandable.
- Global failure UI should not dominate explanatory content.

### Source Directory / OSINT Tools
Elements:
- Tool summary.
- Search/filter controls.
- Tool cards.
- Category/provider/domain.
- Enabled/off state.
- External source action.
- Failure state.

Review:
- Cards are scannable on mobile.
- Browser audit should verify notice layering around first visible tool card.

### Profile detail
States:
- Loading.
- Populated.
- Settled not-found.
- Error boundary.

Expected populated elements:
- Identity.
- Type/country.
- Contact route quality.
- Assets/evidence.
- Relationship paths.
- Provenance.
- Profile actions.

Limit:
- Successful entity response was unavailable in the audit environment, so populated profile behavior remains a data-dependent verification item.

## Cross-cutting findings and ideas

### Error/loading/empty state contract
Define a shared hierarchy:
1. Global operational alert.
2. Page-specific state.
3. Recovery action.
4. Retry/status destination.

The same outage should not be repeated as a full diagnostic paragraph at every visual layer when the global alert already carries it.

### Horizontal filter rails
Preserve horizontal scrolling where capability density requires it, but add a visible affordance:
- fade edge;
- scroll cue;
- selected-item auto-scroll;
- keyboard reachability;
- clear active-state styling.

### Loading states
Every major data route should have:
- an intentional loading composition;
- a terminal empty state;
- a terminal error state;
- a recovery action where recovery is meaningful.

A spinner alone should not be allowed to resemble a permanently stalled screen.

### Typography
Keep mono uppercase styling for metadata, route labels, status, and technical descriptors. Use the readable body face for longer explanations, error details, instructions, and empty-state copy.

### Tablet composition
The source now consistently treats `lg` (1024px) as the laptop/desktop transition for the dense desks. Tailwind's default `md` breakpoint is 768px and `lg` is 1024px, so leaving dense desktop geometry active at `md` was the root of several intermediate-width defects. See Tailwind's responsive documentation for the default breakpoint definitions.

### Touch targets
The earlier audit identified that global controls were smaller than the project's 44px Reactor target convention:
- mobile menu;
- workspace-status trigger;
- workspace-status close;
- global error retry/status/dismiss.

Those controls were normalized to 44px minimums and the regression contract now checks them.

### Grain implementation
The source already contained a subtle SVG film-grain implementation, but it was attached to the outer shell while the visible `main` canvas painted an opaque background. That made the intended texture effectively hidden. The grain host was moved to the visible app canvas and a regression check was added.

## Evidence and verification limits

The audit workspace may render the source app without the full research API. In that situation:
- 404/API HTML responses are environment limitations.
- They are not automatically frontend defects.
- They are still useful for evaluating loading/error/empty-state composition.
- Populated graph, profile, research trajectory, successful mutations, pagination, and data-driven success states require a working research API to verify empirically.

## Ordered implementation priorities

1. Preserve one shared shell/page-gutter system.
2. Validate and, if necessary, redesign global error notice placement so it never obscures the active task surface on small screens.
3. Make mobile filter rails visibly discoverable and keyboard complete.
4. Ensure loading states always settle into empty/error/success.
5. Validate tablet dashboard hero and summary-card density at 768–1024px.
6. Reduce control scan cost on Entity Ledger and Search without removing capabilities.
7. Validate populated profile, graph, research, mutations, pagination, and replay states with representative successful API data.
8. Continue the grain visual exploration in Canvas and compare against the supplied reference before any final aesthetic implementation.

## Progressive audit log

### Baseline
- Source baseline: `2400498b2ba8f93f5fb4e06043a280d1955d138d`.
- Previous source-level five-clean cycle existed, but empirical Replit/browser five-pass evidence was not returned.
- User explicitly requested that the audit be written progressively and include spacing and grain direction.

### New finding and repair: global touch targets
- Found during fresh source inspection: mobile menu, workspace-status trigger/close, and global error actions did not consistently meet the project's 44px touch-target convention.
- Repaired in PR #400.
- Added regression checks for the global controls.
- Merged commit: `4c821388aed46dbe7de635ab1186bc4a50fa1d22`.

### New finding and repair: visible grain layer
- Found during fresh source inspection: the existing `.atlas-noise` background was attached to the outer shell while the visible `main` canvas painted an opaque background.
- Result: the intended grain could be hidden behind the visible app canvas.
- Repaired by moving the grain host onto the visible `main` canvas.
- Added a regression check to prevent the texture from being accidentally hidden again.
- Merged commit: `72606aa151c71c5442e9a9d15afbc12f60f1d562`.

### Clean source audit 1/5
- Shell/laptop breakpoint.
- Route canvas/gutters.
- Dashboard rail-overlap compensation.
- Route inventory.
- Visible grain host.
- Result: PASS.

### Clean source audit 2/5
- Entity Ledger.
- Graph.
- Research.
- Profile.
- Deep Search.
- Duplicate Review.
- Dashboard responsive geometry.
- Result: PASS.

### Clean source audit 3/5
- Keyboard/focus hooks.
- Mobile drawer dismissal/focus return.
- Workspace status dialog semantics.
- Error alert semantics.
- 44px global and Reactor touch targets.
- Reduced-motion hooks.
- Regression contracts.
- Result: PASS.

### Clean source audit 4/5
- Error/loading/empty-state source contracts.
- Bounded error notice.
- Replay/source URL bounds.
- Research empty terminal.
- Entity loading/empty states.
- Graph empty state.
- Deep Search loading copy.
- Duplicate Review state.
- Result: PASS after correcting audit-checker string assumptions; the initial checker failure was not a source defect.

### Clean source audit 5/5
- Full route/source inventory.
- Grain visibility.
- Shared page gutters.
- Dashboard bounds.
- Dense-route breakpoints.
- State layers.
- Touch targets.
- Accessibility hooks.
- Regression contract.
- Result: PASS.

## Five-consecutive-clean condition

The five consecutive clean **source-level frontend audits** are complete after the latest repair commit `72606aa151c71c5442e9a9d15afbc12f60f1d562`.

This does **not** claim five empirical Replit/browser passes. The Replit audit agent was previously still busy and did not return the required five browser reports. The browser condition remains separate and should only be marked complete when the audit workspace has persisted five sequential full browser passes with zero new findings.

## Next evidence requirement

For the empirical browser cycle, use:
- 1280×800 desktop;
- 1024×768 laptop boundary;
- 900px tablet-ish width;
- 768×1024 tablet;
- 390×844 mobile;
- portrait and landscape where relevant.

Capture the same routes and states each pass. After every pass, persist the audit file before starting the next. Any new visual/product defect resets the clean counter after its repair.
