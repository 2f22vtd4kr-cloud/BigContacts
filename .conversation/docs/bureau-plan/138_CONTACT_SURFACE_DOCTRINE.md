# Volume 138 — Contact Surface Doctrine (Personal Preferred, Org Never Discarded)

## Problem this volume solves

HNWI outreach is **not** only personal mobile recovery. Public reality:

- SEC / proxy **notice-line** phones often belong to reporting persons or authorized agents — high value for first contact.
- **IR / media / office** lines route to humans who can transfer.
- **Gatekeeper** and **EA** signals (LinkedIn title, press quotes) are routes.
- **Domain + WHOIS + registry** anchors enable the next hop.
- Paid databases (ZoomInfo, Apollo, Lusha) are **not** Apex’s moat; **public** EDGAR, company sites, PDFs, press, LinkedIn-public, registries are.

Commercial “find executive contact” playbooks in 2026 still start with **EDGAR registrant telephone**, company site Contact, then pattern email — and explicitly say EDGAR is **routing**, not magic direct dials. Apex must **surface routing and personal** together, labeled, not throw routing away because outcome ≠ `direct_contact_verified`.

## Surface tiers (must all be displayable)

| Tier | Examples | Card treatment |
|------|----------|----------------|
| **T0 Personal direct** | Mobile/direct attributed to person with source URL | Primary REACH, `direct_contact_*`, phoneSource agentic/notice |
| **T1 Notice / authorized** | SC 13D notice phone, DEF 14A contact | Primary or co-primary; `EDGAR-Notice-Phone`; never treat as random 1-800 issuer |
| **T2 Org switchboard** | EDGAR registrant tel, CH registered office | Org badge, `organization_contact`, still **on card** and in contacts[] |
| **T3 Digital social** | LinkedIn /in, X, Instagram public | Social row; never alone if phone/email exists unless truly social_only |
| **T4 Related graph** | Same-issuer peers, officers | Related strip; not auto-Personal |
| **T5 Evidence-only** | Weak directory, collision risk | Evidence bag + low confidence; **visible on demand**, not auto-promoted |

**Doctrine:** T2–T4 are **not failures**. Empty card when T2 existed is a **bug**. Discarding T2 because “not personal” is a **product law violation**.

## Display rules (UI contract)

1. **Primary column:** best T0, else T1, else T2 — never blank if any tier has a clean value.
2. **contacts[] / REACH chips:** every non-trash promoted or presented contact with `mark`: `personal` | `organization` | `social` | `related`.
3. **phoneSource / emailSource** visible next to number (operator trust).
4. **Outcome badge** honest: org source cannot wear “verified personal.”
5. **Secondary expand** does not require a second full dig when agent already owns T0/T1 — but **must not hide** org surface already in evidence.

## Promote vs present

- **Promote** writes entity columns (phone, email, linkedin, outcome).
- **Present** can show evidence-backed org routes even when columns hold a better personal line.

Both paths share identity-collision gates. Collision → demote to T5, do not invent a second person.

## Anti-patterns

- Clearing phone on force deep-web when agentic phone exists.
- Final review writing `phone: null` over dig.
- List UI showing only email when phoneSource is agentic-web.
- Scoring org switchboard as score 2 “direct.”

## Acceptance

For fixture set A–D: every target with a public EDGAR/company phone in baseline chat must show **at least** that line as org or notice on Apex card within one standard dig, unless identity collision blocks it with an explicit reason in evidence metadata.

