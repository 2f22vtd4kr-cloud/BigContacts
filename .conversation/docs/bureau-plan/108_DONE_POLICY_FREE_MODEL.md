# Volume 108 — Done Policy for Free Models

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Accept done when

- Model returns done and (searches>0 or visits>0 or findings bag nonempty)  
- Or findings array nonempty with URLs  

## Soft-reject only pure no-op

Zero searches, zero visits, zero findings, early iteration → ask to research first.

## Do not soft-reject because

- Related officers empty  
- Prefer-list domains missing  
- Model didn’t visit a specific page you wished for  

The model owns “enough.” Runtime owns budgets and honesty after.
