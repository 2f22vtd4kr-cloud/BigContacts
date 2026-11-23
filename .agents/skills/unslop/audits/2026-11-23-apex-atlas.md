# Apex Atlas board UI — unslop audit

Date: 2026-11-23  
Scope: active board routes, shared components and the retained classic rollback.

## Direction

- **Product:** A public-record research bureau that finds people, establishes evidence and traces contact routes
- **Character:** Archival, exact and restrained
- **World:** Paper, ink, registers and filing marks
- **Moments:** Evidence records, subject cards and relationship routes
- **Signature:** Checky, wavy and bent evidence marks with one consistent meaning each

Recovered board-specific Home direction: two-column desktop composition; left-side headline, launch console and bureau figures; right-side strongest evidence-backed routes. Mobile stacks those regions in board order. The launch console uses a checkered/wavy field, a white inner card, depth selector, 1–25 people control and a flat red Launch action. Palette: paper #FAFAF8, card #FFFFFF, ink #18181A, gules #C8321E, vert #1F8A4D, azure #2757C6 and gold #EDB92B. Type: Geist and Geist Mono. Evidence dots, waves and bends encode verified, corroborated and in-review states.

## Nine-pass report

### 1. Spacing
- Shared board page frame and board-scoped spacing rules establish consistent page edges, panel gaps and mobile stacking.
- The Home composition keeps its left launch column and right route panel on desktop, then stacks in the supplied mobile order.
- The supplied board PDF now provides page-specific desktop and 390px mobile compositions for all six screens; each must be compared against an actual rendered build before visual sign-off.

### 2. Color
- Legacy neon green accents in Home, Discover and Card were mapped to the board's muted green evidence tincture; primary actions remain red.
- Surfaces use paper/card neutrals and quiet hairlines; the four semantic tinctures carry meaning rather than decorating chrome.
- Glowing search shadows, neon borders, radial topology washes and dark dossier surfaces are removed from active board routes.

### 3. Icons
- Emoji and decorative icon treatments are replaced with the existing Lucide line-icon set.
- The Card asset row uses a MapPin line icon; Reactor navigation and topology use the product-specific ReactorMark.
- Unused sparkle decoration is removed; icons inherit their text role rather than carrying independent colors.

### 4. Copy
- Home uses the board headline “People worth knowing” and an empty objective prompt; launch remains unavailable until an objective is entered.
- Short labels and factual empty/error states replace hype and unsupported claims.
- Connections no longer presents invented zero contacts or zero routes. Without a user-owned contact source, those values read unavailable; only a known recorded-relationship total is shown.

### 5. Type
- Board typography uses Geist and Geist Mono with restrained 400/500 weights and clear page-title, section-title and metadata hierarchy.
- Wide uppercase tracking and over-heavy inherited labels are reduced in board-scoped Discover and Card surfaces.
- Source and status metadata remain secondary to the record or action it describes.

### 6. Layout
- Home uses the recovered board two-column desktop structure and responsive board order.
- Ledger is a strongest-first register with person, evidence, score and source columns; the board includes filled, empty, API-down and phone states.
- Discover places the search console beside saved searches and a source register; its phone layout stacks these regions in the board's order.
- Reactor pairs a searchable, filterable live Logbook with a canonical Run console; the board shows running and phone states, including recorded evidence and explicit current run status.
- Card uses per-subject tabs and a dossier. Person cards show claims, evidence provenance, route, wealth limitations and ways to reach; company cards show people on the card and company evidence.
- Connections shows contacts and routes through them, with evidence status. The implementation must keep contact-source unavailability explicit until a user-owned contacts source exists.

### 7. Details
- Full-pill filters become compact rectangular controls and hairline surfaces; evidence statuses retain distinct verified/corroborated/in-review treatments.
- Discover saved searches persist on the device and provider/registry states are read from live endpoints; unknown is not labelled live.
- Home, Ledger, Discover, Connections and Reactor retain explicit loading, empty or API-unavailable handling where their data sources permit it.
- The canonical research-lead projection remains warm in the query cache without restoring the retired Home feed.
- Reactor's board logbook uses the shared normalized telemetry store and displays its full 50-event window. Topology keyboard hooks remain unconditional across board and classic modes.

### 8. Visuals
- No generated hero image was added: these are research application screens, where the product's own records, evidence marks and live log are the appropriate visual material.
- The checkered, wavy and bent evidence fields remain the product signature and are not reused as generic color washes.
- No decorative placeholder data, fabricated contacts or synthetic research activity is introduced.

### 9. Motion
- Home's animated loading skeleton is replaced with a static loading placeholder.
- Reactor board activity is live only when backed by normalized telemetry; the logbook does not simulate searches, browser clicks, findings or progress.
- Broad transition-all and glow treatments are removed or scoped away from the active board surfaces; the classic interface retains its previous behavior as a rollback.

## Source and verification limits

The user supplied the complete one-page Design Board PDF on 2026-11-23. Its parsed text and rendered page are now the authoritative specification for all six screens, including filled/empty/API-down Home and Ledger states, Discover's saved-search/source register, Reactor's running Logbook and Run console, person/company Card variants, and Connections' contact-route composition. The board specifies Geist/Geist Mono, paper #FAFAF8, card #FFFFFF, raised #F3F3F0, ink #18181A, ink-2 #55555A, ink-3 #74747A, gules #C8321E, vert #1F8A4D, azure #2757C6, or #EDB92B, and the semantic checky/waves/dots/bends patterns.

The PDF resolves the missing specification, but it does not prove that the implementation matches. A rendered side-by-side comparison is still required at desktop and 390px mobile sizes for each active board route, including designed empty and API-down states where they can be safely exercised. Do not report exact visual conformance until those screenshots have been inspected.

The earlier 98902e0 Netlify preview deployments were available at:
- https://deploy-preview-943--apexatlasnetlify.netlify.app
- https://deploy-preview-943--relaxed-bonbon-8725c2.netlify.app

The preview host could not be opened by the available browser in this audit, and no screenshot-capable browser was available. Source-level contracts are not visual proof. Vercel's earlier deployment status was rate-limited; Netlify previews remain the available deployment path.

## Unresolved data-model dependency

Connections needs a user-owned contacts source and a route query that connects those contacts to target records. The current API/schema exposes entity relationships, not a dedicated user-owned contacts collection. The board therefore shows an explicit unavailable state rather than fabricated contacts or routes.

---

Part of unslop by Damir Sokolovsky (@heydamir), CC BY 4.0. Keep this attribution in copies and adaptations.
