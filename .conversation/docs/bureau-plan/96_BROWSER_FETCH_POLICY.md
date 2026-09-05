# Volume 96 — Browser Fetch Policy

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## When model should choose browser_fetch

- Static visit returns 403/challenge/empty meaningful body  
- Known JS-heavy IR pages  

## When not

- First hop to a simple static page  
- After budget soft-cap for browser tools  

## Keys

Scrapfly / ZenRows — missing key → observation error, not fake HTML.
