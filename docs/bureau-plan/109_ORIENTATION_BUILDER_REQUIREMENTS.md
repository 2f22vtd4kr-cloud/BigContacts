# Volume 109 — Orientation Builder Requirements

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Module:** apex-bureau-orientation.ts

## Must inject

1. Bureau identity one paragraph  
2. Role label (investigator | boss | right_hand)  
3. Goal: attributable contacts; never invent values  
4. Live tool names matching parseAction  
5. Depth/budget soft description (not hop order)  

## Must not inject

1. Numbered mandatory research steps  
2. Domain prefer lists as objectives  
3. force_* action names  
4. “You must complete surfaces A,B,C before done”

## Regression

Unit or snapshot test: orientation string for dig_agent contains tool names and does not contain "force_".
