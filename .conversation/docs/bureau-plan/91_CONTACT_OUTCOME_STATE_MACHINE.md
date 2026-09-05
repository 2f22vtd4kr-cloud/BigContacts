# Volume 91 — Contact Outcome State Machine

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## States

none → evidence_only → social_only → organization_contact → direct_contact_candidate → direct_contact_verified

## Transitions (allowed)

| From | To | Gate |
|------|-----|------|
| none | evidence_only | Any durable evidence without promote-ready contact |
| none/evidence | social_only | LinkedIn/social URL only |
| * | organization_contact | Org phone/email or *-org source or issuer/CH main |
| organization_contact | direct_contact_candidate | Personal email or strong person bind + non-org source |
| direct_contact_candidate | direct_contact_verified | Explicit verification path only (future) |
| any | organization_contact | Collision risk or *-org force-down |

## Forbidden transitions

- none → direct_contact_verified  
- organization_contact → direct_* without new personal evidence  
- any → direct_* when assessIdentityCollision.risk  

## Code hooks

`computeContactOutcome` + post-patch force in `bureau-contact-persist` for *-org.
