# Volume 217 — How I Would Pick Targets If Asked to “Do Apex’s Work”

If you asked me (an LLM with web tools) to staff an outreach desk with new HNWI/principal targets, I would **not** open a list of 150 fixed queries. I would reason like this:

## Step 1 — Clarify the hunt

- Goal: people worth a **public-contact dig** for professional outreach
- Prefer: officers, filers, fund principals, family-office decision makers, gatekeepers with public footprints
- Avoid: pure celebrities with no business/filing surface; anonymous shells; already-oversaturated household names unless operator asks

## Step 2 — Choose a *lane* for this session (one or two, not fifteen)

Examples of lanes I might pick **today**, based on judgment:

- “Recent SC 13D/G individual filers on mid-cap issuers”
- “IR-listed executives at newly public or newly noisy issuers”
- “UK directors appointed this month at companies with real trading websites”
- “Foundation trustees named in fresh 990 or press, with company ties”
- “Family office principals mentioned with a **named vehicle** in open press”

Lane choice is the discovery equivalent of free dig’s first `web_search` — **model-owned**.

## Step 3 — Search and read

I invent queries fit to the lane:

- `SC 13D "reporting person" 2026` / issuer + schedule
- `family office CIO appointed` + year
- `site:sec.gov SCHEDULE 13G` + person-like patterns
- company “investor relations” leadership pages for a sector I’m focusing

I **visit** a few pages. I extract **named people** with roles and source URLs. I discard orgs without a human, and humans with no public hook.

## Step 4 — Rank for dig worthiness

Higher rank when:

- Clear person name + role + organization
- Public filing or official page (dig will have something to visit)
- Not already a saturated global celebrity (unless lane is “ultra-HNWI”)
- Outreach-plausible (officer, filer, allocator, counsel, IR — not random social influencer)

Lower rank when:

- Name only in listicle “top 10 richest”
- Corp/shell with no officer names
- Ambiguous common name and no issuer binding

## Step 5 — Hand off

Output a **short list** (e.g. 5–30) of `{ name, role, company, basis, sourceUrls[] }` for admission — not 500 noisy SERP titles.

## What I would never do

- Fire category templates 1–15 in a fixed rotation regardless of results
- Admit “Apple Inc.” as an HNWI target
- Skip reading sources and trust snippet name-regex alone without basis
- Confuse discovery with contact recovery

## Apex implication

**Discovery agent** should look like that loop: lane → search/visit → extract people → rank → admit. Tools can include web_search, visit, registry_search, EDGAR/EFTS helpers — **chosen by the model**. Template libraries may exist as *optional memory* the model can read, not as the controller.

