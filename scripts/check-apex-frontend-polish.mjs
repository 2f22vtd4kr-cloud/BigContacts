import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const files = {
  css: "artifacts/apex-finder/src/index.css",
  dashboard: "artifacts/apex-finder/src/pages/dashboard.tsx",
  ledger: "artifacts/apex-finder/src/pages/board-ledger.tsx",
  reactor: "artifacts/apex-finder/src/pages/reactor.tsx",
  mobile: "artifacts/apex-finder/src/components/mobile-reactor-flow.tsx",
  replay: "artifacts/apex-finder/src/components/research-replay.tsx",
  mark: "artifacts/apex-finder/src/components/reactor-mark.tsx",
  workspaceStatus: "artifacts/apex-finder/src/components/workspace-status.tsx",
  errorNotice: "artifacts/apex-finder/src/components/apex-error-notice.tsx",
  launchButton: "artifacts/apex-finder/src/components/launch-atlas-button.tsx",
};
for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing frontend polish source: ${name}`);
}
const css = read(files.css);
const flatRound = read("artifacts/apex-finder/src/flat-round.css");
const dashboard = read(files.dashboard);
const contactSurface = read("artifacts/apex-finder/src/components/contact-surface.tsx");
const profile = read("artifacts/apex-finder/src/pages/profile.tsx");
const pathFinder = read("artifacts/apex-finder/src/components/connection-path-finder.tsx");
const ledger = read(files.ledger);
const reactor = read(files.reactor);
const mobile = read(files.mobile);
const replay = read(files.replay);
const mark = read(files.mark);
const workspaceStatus = read(files.workspaceStatus);
const errorNotice = read(files.errorNotice);
const launchButton = read(files.launchButton);
const reactorTouchSource = read("artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");

const layout = read("artifacts/apex-finder/src/components/layout-legacy.tsx");
const roundLayout = read("artifacts/apex-finder/src/components/layout-round.tsx");
const boardPageFrame = read("artifacts/apex-finder/src/components/board-page-frame.tsx");
const router = read("artifacts/apex-finder/src/router.tsx");
const tabletSurfaces = [
  "artifacts/apex-finder/src/pages/duplicates.tsx",
  "artifacts/apex-finder/src/pages/entities.tsx",
  "artifacts/apex-finder/src/pages/graph.tsx",
  "artifacts/apex-finder/src/pages/research.tsx",
  "artifacts/apex-finder/src/pages/profile.tsx",
  "artifacts/apex-finder/src/pages/deep-search.tsx",
].map(read);

const checks = [
  ["Flat Round is the default presentation shell", read("artifacts/apex-finder/src/components/layout.tsx").includes("./layout-round")],
  ["Flat Round exposes the five product destinations", ["Overview", "Ledger", "Discover", "Connections", "Reactor"].every((label) => roundLayout.includes(`name: "${label}"`))],
  ["Flat Round preserves utility routes without exposing them in active board navigation", ["/manual", "/status", "/data-sources", "/osint-tools", "/improvements", "/duplicates", "/jobs", "/research", "/network/graph", "/reactor/topology"].every((route) => router.includes(`path="${route}"`)) && !["/manual", "/status", "/data-sources", "/osint-tools", "/improvements", "/duplicates", "/jobs", "/research", "/network/graph", "/reactor/topology"].some((route) => roundLayout.includes(`href: "${route}"`))],
  ["desktop sidebar fills viewport and anchors footer", /absolute inset-y-0 left-0/.test(layout) && /h-full w-\[250px\] shrink-0/.test(layout) && /h-full transition-\[width\]/.test(layout)],
  ["active and fallback shells contain no decorative grain layer", !roundLayout.includes("atlas-noise") && !layout.includes("atlas-noise") && !css.includes(".atlas-noise::before")],
  ["active shell sets the document canvas to the board's paper color", flatRound.includes("body:has(.atlas-round-shell)") && flatRound.includes("background:#FAFAF8!important;")],
  ["board shell uses five destinations in a full-height sidebar and mobile drawer", roundLayout.includes("atlas-round-sidebar") && roundLayout.includes("Main navigation") && roundLayout.includes("mobileOpen") && flatRound.includes(".atlas-round-sidebar") && flatRound.includes("top:60px;") && flatRound.includes("bottom:0;") && flatRound.includes("font-weight:700!important;")],
  ["tablet board layouts stack before content becomes cramped", flatRound.includes("@media (max-width:1000px) and (min-width:761px)") && flatRound.includes(".atlas-round .atlas-discover-layout,") && flatRound.includes(".atlas-round .atlas-reactor-board-layout { grid-template-columns:minmax(0,1fr);")],
  ["active sidebar contains only board navigation; compact workspace status stays in the topbar", roundLayout.split("<WorkspaceStatus compact").length === 2 && !roundLayout.includes("ApiKeyHealth") && !roundLayout.includes("atlas-round-sidebar-status")],
  ["compact workspace status is live, accessible and uses semantic tinctures", workspaceStatus.includes("aria-label={compactFullLabel}") && workspaceStatus.includes("data-status={state}") && flatRound.includes(".atlas-round-status-dot.is-ready") && flatRound.includes(".atlas-round-status-dot.is-offline")],
  ["active shell avoids a redundant, invented footer tagline", !roundLayout.includes("atlas-round-footer")],
  ["shared page frame keeps the Card breadcrumb optional and separate from the page title", boardPageFrame.includes("breadcrumb?: ReactNode") && boardPageFrame.includes("atlas-board-page-intro") && !boardPageFrame.includes("Apex Atlas /")],
  ["display tracking follows the board while page metadata remains untracked", flatRound.includes("letter-spacing:-.035em") && flatRound.includes(".atlas-round-page-meta") && flatRound.includes("font-size:11px; letter-spacing:0;") && flatRound.includes(".atlas-error-notice-label") ],
  ["board page metadata and footer retain the documented eleven-pixel minimum", flatRound.includes(".atlas-round-wordmark span, .atlas-round-page-meta, .atlas-round-footer") && flatRound.includes("font-size:11px; letter-spacing:0;") && flatRound.includes(".atlas-round-page-meta {") && flatRound.includes(".atlas-round-footer { font-size:11px;") ],
  ["Home launch console fills its grid column instead of inheriting the legacy narrow width", flatRound.includes("width:100%!important; max-width:none!important;") && flatRound.includes(".atlas-round .atlas-home-board-console .atlas-home-actions")],

  ["dashboard figures use consistent thousands separators", dashboard.includes('toLocaleString("en-US")')],
  ["launch controls use named transitions and the board focus color", !launchButton.includes("transition-all") && !launchButton.includes("ring-lime-400") && launchButton.includes("ring-[#2757C6]/50")],
  ["profile progress and hover actions avoid broad transition-all", !profile.includes("transition-all") && !flatRound.includes('[class*="transition-all"]')],
  ["Card typography normalizes legacy bold, uppercase and italic utilities to the board system", flatRound.includes('.atlas-round .atlas-board-profile [class*="font-semibold"]') && flatRound.includes('.atlas-round .atlas-board-profile [class*="uppercase"]') && flatRound.includes('.atlas-round .atlas-board-profile [class*="italic"]') && flatRound.includes("font-weight:500!important;") && flatRound.includes("font-style:normal!important;")],


    ["route canvas is shrinkable at every viewport", /\.atlas-page \{/.test(css) && /width:\s*100%/.test(css) && /max-width:\s*100%/.test(css) && /min-width:\s*0/.test(css)],
  ["all routed frontend surfaces remain registered", ["/", "/search", "/profiles", "/network", "/jobs", "/reactor", "/research", "/manual", "/profile/:id", "/improvements", "/data-sources", "/duplicates", "/osint-tools", "/status"].every((route) => router.includes(`path="${route}"`))],
  ["tablet desk switches use laptop breakpoint", tabletSurfaces.every((source) => !/(?:hidden|flex|flex-row) md:(?:hidden|flex|flex-row)/.test(source))],
  ["tablet desks avoid legacy md geometry", !tabletSurfaces[5].includes("md:w-80") && !tabletSurfaces[0].includes("md:rotate-0")],
["Ledger imports its evidence-aware entity display classifier", ledger.includes('import { displayEntityType, entityEvidenceLabel, entityWorkSummary } from "@/lib/utils";') && ledger.includes("normalizeEntityType(displayEntityType(entity))")],
  ["dashboard main canvas is independent of sidebar rail", /w-full min-w-0 flex-col/.test(layout) && /lg:pl-\[250px\]/.test(layout) && /lg:pl-0/.test(layout) && /const contentPadding = desktopContentPadding;/.test(layout)],
  ["dashboard rows stay inside the shell canvas", /atlas-home-board-grid/.test(dashboard) && /max-width:\s*1600px/.test(flatRound) && /min-width:\s*0/.test(flatRound) && !/inline-size:\s*100vw/.test(flatRound) && !/atlas-sidebar-offset/.test(flatRound)],
  ["dashboard has no rail-overlap compensation", !dashboard.includes("md:pl-[274px]") && !dashboard.includes("atlas-sidebar-offset") && /atlas-home-board-grid/.test(dashboard)],
  ["dashboard hero copy is explicitly start-aligned", /atlas-home-board-intro/.test(dashboard) && /text-align:\s*left/.test(flatRound)],
  ["home launch console fills its designed column", /atlas-home-board-console/.test(dashboard) && /\.atlas-home-board-console[\s\S]*?width:\s*100%/.test(flatRound) && /grid-template-columns:minmax\(0,1fr\) minmax\(320px/.test(flatRound)],
  ["home depth selector and target cap remain subordinate to Launch", /atlas-launch-depth/.test(flatRound) && /atlas-launch-target-count/.test(flatRound) && /launchTargetCount/.test(launchButton) && /Math\.min\(25/.test(launchButton)],
  ["all native buttons share the flowing interaction contract", /atlas-button-flow/.test(css) && /atlas-button-lift/.test(css) && /atlas-button-underflow/.test(css) && /button\.atlas-button-flow:not\(\.atlas-launch-cta\)/.test(css) && /triggerButtonFlow/.test(layout) && /document\.addEventListener\("pointerdown"/.test(layout) && /document\.addEventListener\("keydown"/.test(layout)],
  ["button flow has a theme-specific palette", /--atlas-flow-1: #0a3d40/.test(css) && /--atlas-flow-2: #00b3b8/.test(css) && /--atlas-flow-3: #6fd914/.test(css) && /--atlas-flow-4: #9cff1a/.test(css) && /--atlas-flow-1: #083322/.test(css) && /--atlas-flow-2: #0b5c3b/.test(css) && /--atlas-flow-3: #083322/.test(css) && /--atlas-flow-4: #ba9c7b/.test(css)],
  ["global button flow respects reduced motion", /button\.atlas-button-flow[\s\S]*?animation: none !important/.test(css) && /button\.atlas-button-flow[\s\S]*?atlas-button-underflow[\s\S]*?animation: none !important/.test(css)],
  ["launch click lifts and reveals the flowing surface", /@keyframes atlas-underflow/.test(css) && /\.atlas-launch-cta\.atlas-click-flash::before/.test(css) && /\.atlas-launch-cta\.atlas-click-flash,[\s\S]*?\.atlas-launch-glow\.atlas-click-flash\s*\{\s*z-index:\s*20;\s*\}/.test(css) && /translateY\(-3px\) scale\(1\.015\)/.test(css) && /setFlash\(true\);\s*window\.setTimeout\(\(\) => setFlash\(false\), 2800\);/.test(launchButton)],
  ["launch surface uses the supplied light and existing dark palettes", /--atlas-flow-1: #0a3d40/.test(css) && /--atlas-flow-4: #9cff1a/.test(css) && /--atlas-flow-1: #083322/.test(css) && /--atlas-flow-2: #0b5c3b/.test(css) && /--atlas-flow-3: #083322/.test(css) && /--atlas-flow-4: #ba9c7b/.test(css)],
  ["launch interaction respects reduced-motion preferences", /atlas-launch-cta::before,[\s\S]*?atlas-launch-glow::before \{ animation: none !important; transition: none !important; \}/.test(css) && /atlas-launch-cta:active,[\s\S]*?atlas-launch-glow:active \{ transform: none !important; \}/.test(css)],
  ["Reactor uses product-specific mark in board navigation and topology", /ReactorMark/.test(roundLayout) && /ReactorMark/.test(reactor) && /ReactorMark/.test(mark)],
  ["generic nuclear Reactor glyph is gone", !/☢|nuclear icon/i.test(reactor)],
  ["replay is evidence-grounded", /Recorded sources/.test(replay) && /sourceUrls|links/.test(replay) && /sourceUrlsFor/.test(replay)],
  ["replay is bounded", /slice\(0, 40\)/.test(replay)],
  ["research replay controls meet 44px touch target", (replay.match(/min-h-\[44px\]/g) || []).length >= 3 && /reactor-touch-target/.test(replay)],
  ["replay supports reduced-motion through shared CSS", /prefers-reduced-motion/.test(css) && /reactor-pressable/.test(replay)],
  ["mobile replay is archive-only", /showHistory && <ResearchReplay/.test(mobile)],
  ["mobile remains feed-first", /showTopology=\{false\}/.test(mobile)],
  ["live topology remains telemetry bounded", /<ReactorActivityOnly\b/.test(reactor) && /schemeNodesFromSpans/.test(reactor) && /schemeToolsOnly/.test(reactor)],
  ["desktop live desk has explicit accessible region", /role="complementary"/.test(reactor) && /aria-label="Apex Atlas Live Desk"/.test(reactor)],
  ["mobile controls retain touch-safe targets", /--atlas-touch:\s*44px/.test(css) && /reactor-touch-target/.test(css) && /reactor-mobile-safe/.test(css)],
  ["mobile Reactor controls use 44px touch targets", /reactor-touch-target/.test(reactorTouchSource) && (reactorTouchSource.match(/reactor-touch-target/g) || []).length >= 5 && /min-h-\[44px\]/.test(reactorTouchSource)],
  ["focus ring remains explicit", /focus-visible/.test(css)],
  ["terminal state does not require animation", /atlasTerminal|reactor-terminal-banner/.test(reactor) && /prefers-reduced-motion/.test(css)],
  ["desktop shell uses laptop breakpoint for rail", /lg:flex/.test(layout) && /lg:pl-\[274px\]/.test(layout) && /lg:pl-6/.test(layout)],
  ["sidebar has no decorative active-route dots", !/ml-auto h-1\.5 w-1\.5 rounded-full bg-primary/.test(layout)],
  ["sidebar footer has no decorative status dot", !/Public records workspace[\s\S]{0,180}h-1\.5 w-1\.5 rounded-full bg-primary/.test(layout)],
  ["mobile shell remains available below laptop width", /lg:hidden/.test(layout) && /lg:hidden/.test(layout) && /lg:flex/.test(layout)],
  ["global error notice is bounded on short/mobile screens", /max-h-\[38dvh\]/.test(errorNotice) && /sm:max-h-\[min\(52dvh,360px\)\]/.test(errorNotice)],
  ["global mobile menu meets 44px touch target", /min-h-\[44px\]/.test(layout) && /min-w-\[44px\]/.test(layout) && /data-testid="button-open-menu"/.test(layout)],
  ["workspace status trigger meets 44px touch target", /min-h-\[44px\]/.test(workspaceStatus) && /data-testid="button-workspace-status"/.test(workspaceStatus)],
  ["system status refresh control meets 44px touch target", /min-h-\[44px\]/.test(read("artifacts/apex-finder/src/pages/status.tsx")) && /onClick=\{fetchStatus\}/.test(read("artifacts/apex-finder/src/pages/status.tsx"))],
  ["global error notice actions meet 44px touch targets", (errorNotice.match(/min-h-\[44px\]/g) || []).length >= 2 && /min-w-\[44px\]/.test(errorNotice)],
  ["desktop shell updates document title by route", /document\.title/.test(layout) && /Apex Atlas/.test(layout)],
  ["desktop shell exposes a bypass link", /Skip to main content/.test(layout) && /id="main-content"/.test(layout)],
  ["console wave field uses an overdrawn, seamless 32x24 SVG tile", (() => { const wave = flatRound.match(/\.atlas-round \.atlas-home-board-console::after\s*\{([^}]+)\}/); return Boolean(wave && wave[1].includes("width='32'%20height='24'%20viewBox='0%200%2032%2024'") && /background-repeat:\s*repeat/.test(wave[1]) && /background-size:\s*32px 24px/.test(wave[1]) && wave[1].includes("background-color: #2757C6") && wave[1].includes("stroke='%23FAFAF8'") && wave[1].includes("M-16%2012%20C-8%208%20-8%208%200%2012%20S8%2016%2016%2012%20S24%208%2032%2012%20S40%2016%2048%2012")); })()],
  ["evidence wave swatch preserves the same overdrawn, seamless tile", (() => { const offset = flatRound.lastIndexOf(".atlas-round .atlas-evidence-pattern.is-corroborated"); const wave = offset >= 0 ? flatRound.slice(offset).match(/\{([^}]+)\}/) : null; return Boolean(wave && wave[1].includes("width='32'%20height='24'%20viewBox='0%200%2032%2024'") && /background-size:\s*32px 24px/.test(wave[1]) && wave[1].includes("background-color: #2757C6") && wave[1].includes("stroke='%23FAFAF8'") && wave[1].includes("M-16%2012%20C-8%208%20-8%208%200%2012%20S8%2016%2016%2012%20S24%208%2032%2012%20S40%2016%2048%2012")); })()],
  ["supported evidence dots remain discrete high-resolution circles", (() => { const offset = flatRound.lastIndexOf(".atlas-round .atlas-evidence-pattern.is-supported"); const dots = offset >= 0 ? flatRound.slice(offset).match(/\{([^}]+)\}/) : null; return Boolean(dots && dots[1].includes("background-color: #1F8A4D") && dots[1].includes("radial-gradient(circle, #FAFAF8 1.15px, transparent 1.3px)") && dots[1].includes("background-size: 12px 12px")); })()],

  ["Connections path results use the weakest recorded evidence state for their patterned edge", pathFinder.includes("routePatternStatus(routeQuery.data.edges)") && pathFinder.includes("atlas-route-pattern-card is-")],
  ["Home uses the board's honest strongest-routes empty state", dashboard.includes("Strongest routes") && dashboard.includes("No routes yet") && !dashboard.includes("useGetConnectionPath")],
  ["Card contact routes carry written evidence statuses with semantic markers, not a false route-card frame", contactSurface.includes("primaryTierPattern") && contactSurface.includes("atlas-evidence-pattern is-") && contactSurface.includes("primaryTier.label === \"Disputed\"") && contactSurface.includes("atlas-contact-route-secondary") && contactSurface.includes('boardMode ? "hover:text-[#2757C6]" : "hover:text-[#9CFF1A]"') && !contactSurface.includes("atlas-route-pattern-card")],
  ["Person cards show an honest route empty state when no route is stored", profile.includes("atlas-card-route-empty") && profile.includes("No route is stored on this card") && profile.includes('href="/network"')],
  ["route-card pattern edge follows the board's 12px frame and 4px spacing grid", /\.atlas-route-pattern-card \{[^}]*padding:\s*12px;[^}]*border-radius:\s*16px;/.test(flatRound) && flatRound.includes("background-size:12px 12px;") && flatRound.includes("background-size:32px 24px;")],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nApex frontend polish contract: ${checks.length} checks passed.`);
