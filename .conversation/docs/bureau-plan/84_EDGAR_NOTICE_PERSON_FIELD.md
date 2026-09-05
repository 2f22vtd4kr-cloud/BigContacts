# Volume 84 — EDGAR “Notices and Communications” Person Field

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Sources:** SEC EDGAR filer manual / Schedule 13D header fields — **Name, Address and Telephone Number of Person Authorized to Receive Notices and Communications**; reporting person name rows.

## 1. Two different phones in SC 13D/G world

| Field | Typical meaning | Apex label |
|-------|-----------------|------------|
| Issuer principal office phone (from issuer CIK profile) | Company switchboard | EDGAR-Phone → organization_contact |
| Person authorized to receive notices and communications | Often counsel or reporting-person contact block | Candidate for EDGAR-Notice-Phone — still often **not** the HNWI mobile |
| Reporting person name (Item rows) | Identity anchor | Identity, not phone |

## 2. Extraction priority for person cards

1. Reporting person **identity** from schedule  
2. Notice-and-communications block **if** name tokens bind to target or explicit agent of target  
3. Issuer phone last, always org  

Many “notice” phones are **law firm** numbers — treat as organization/agent unless bound.

## 3. Live comparison lesson

Independent audits preferred firm HQ / published main lines over wrong issuer plant numbers. Notice counsel phones are also not personal mobiles.

## 4. Implementation notes

- Parse schedule text/XML for “notices and communications” near telephone patterns  
- Require surname or company bind before promoting notice phone as anything but org/agent  
- Never overwrite agentic-web with issuer CIK phone  

## 5. Apex must / must not

**Must:** distinguish issuer vs notice vs dig sources in phoneSource.  
**Must not:** assume SC 13D telephone is the subject’s personal phone.
