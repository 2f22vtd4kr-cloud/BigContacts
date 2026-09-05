# Volume 201 — PDF and Exhibit Visits

## Why

Press kits, annual reports, SC13 exhibits, and POA PDFs often hold phones emails that HTML cover pages omit.

## Dig behavior

When SERP shows `filetype:pdf` or sec.gov exhibit links, visiting is high value. Observation should extract text candidates; if PDF text extract fails, say so clearly so model can try HTML alternate.

## Promote

Same sourceUrl rules; PDF URL is valid sourceUrl.

## Engineering note

PDF extract may need different path than HTML cheerio — still model-triggered visit/browser_fetch, not a separate forced phase.

