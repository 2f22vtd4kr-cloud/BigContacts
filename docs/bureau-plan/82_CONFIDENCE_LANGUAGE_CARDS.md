# Volume 82 — Confidence Language for Cards and Desk

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Sources:** SANS Intelligence Analyst’s Playbook structure; ICD 203 / PHIA-style separation of **likelihood** vs **confidence**; UK probability yardstick.

## 1. Two dimensions (do not collapse)

| Dimension | Question | Apex surface |
|-----------|----------|--------------|
| **Likelihood / claim strength** | How strong is the claim that this route reaches the person? | contactOutcome ladder |
| **Analytic confidence** | How good is the evidence base? | notes / meta confidence, source count |

ICD 203-style rule: do **not** put “high confidence” and “likely” as if they were the same knob in one vague adjective.

## 2. Map outcomes to tradecraft

| contactOutcome | Tradecraft reading |
|----------------|-------------------|
| none | No route claim |
| evidence_only | Collection exists; not disseminated as ready contact |
| social_only | Social presence; not phone/email reach |
| organization_contact | Org switchboard / generic — honest org claim |
| direct_contact_candidate | Person-associated **candidate**; moderate confidence typical |
| direct_contact_verified | Reserved for stronger verification path only |

## 3. Probability yardstick for operator notes (optional)

When writing desk narratives or future report export:

- Remote / highly unlikely / unlikely / realistic possibility / likely / highly likely / almost certain  

Use **one ladder consistently**. Prefer “organization_contact with primary SEC URL” over vague “strong lead.”

## 4. BLUF for future report product

SANS-style product order when Apex exports a target brief:

1. **BLUF** — one sentence: best route + org vs personal  
2. Key judgments  
3. Evidence with URLs  
4. Alternatives / collision risks  
5. Gaps  

## 5. Apex must / must not

**Must:** outcome taxonomy carry honesty.  
**Must not:** green “verified” without verification workflow; collapse confidence into marketing adjectives on the card.
