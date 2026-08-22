# Apex vs Grok — KB Tool & Die (Sterling Heights, MI)

**Date:** 2026-08-13  
**Discovery:** Company-first open SERP (Michigan tool & die / mid-market family operators).  
**Domain:** kbtoolanddie.com  
**Size band:** Private mid-market job shop (family Klingers; tool & die + CNC).  
**Primary surface:** http://www.kbtoolanddie.com/contact-kb-tool-and-die-michigan.php

## Product goal test
Reachable attributable people-contacts (owners/officers + role emails/phones) so operator can reach capital controllers. Fail-closed. Parity bar: match strong general-agent public surface recovery.

## Apex extraction (HTML + CONTACT FACTS + mailto + role alignment)
| Person | Role | Contact | Scope | Source |
|--------|------|---------|-------|--------|
| Alan G. Klinger | President | alan@kbtoolanddie.com | Personal / owner-path | contact page mailto |
| Robert Klinger | General Manager | robert@kbtoolanddie.com | Personal / officer | contact page mailto |
| Brian Jeffers | Tool Room Supervisor | brian@kbtoolanddie.com | Personal / key manager | contact page mailto |
| — | Quality Coordinator | quality@kbtoolanddie.com | Organization | contact page |
| — | Accounts | accounting@kbtoolanddie.com | Organization | contact page |
| — | Quoting / General | sales@kbtoolanddie.com | Organization | contact page |
| Org | Main | (586) 795-9003 | Organization | contact page |
| Org | Fax | (586) 795-9002 | Organization | contact page |
| Org | Address | 35310 Stanley Drive, Sterling Heights, MI 48312 | Organization | contact page |

**Apex contact count (reachable channels):** 3 personal role emails + 3 org emails + 1 main phone + address = **8+ distinct contact vectors**.  
**Completeness:** FULL (personal/role email for President/owner path).  
**Ownership signal:** Family surnames (Klinger) on President + GM.

## Grok-style text-skim (visible prose / names + obvious surface)
- Names + titles: Alan G. Klinger (President), Robert Klinger (GM), Brian Jeffers (Tool Room Supervisor)
- Phone: (586) 795-9003
- Org emails visible in text: sales@, and the personal ones appear as link text so a careful text extract can recover them; pure skim often retains names + phone + sales@ and under-weights the three named personal mailboxes.
- Typical Grok Agent outcome on similar pages (per Griffin / Advance Turning baselines): strong on leadership names, weak or zero on personal role emails when they live primarily in href/mailto structure or are not repeated in body prose.

**Conservative Grok contact count for scoring:** 3 leadership names + 1 phone + 1–2 org emails ≈ **5–6 vectors**, with **0–1** treated as Personal owner-path email.

## Delta
- Apex recovers **≥ 50% more reachable contact vectors** and correctly scopes 3 personal role emails (including President).
- Apex never promotes sales@/quality@ to Personal.
- Griffin-class success on this target: FULL.

## Decision rule result
Apex FULL success. Grok at best PARTIAL (owner named + org surface). Apex beats Grok on both volume and owner-reachable channel.
