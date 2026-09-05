# Volume 158 — Shared UI Component Contract

## ContactSurface props

```
type ContactMark = "personal" | "organization" | "social" | "related" | "evidence";

type ContactRoute = {
  value: string;
  mark: ContactMark;
  href?: string;       // tel: / mailto: / https only — never embed source in href
  label?: string;      // display may include source as separate muted span
  source?: string | null;
  title?: string;      // tooltip
};

type ContactSurfaceProps = {
  primary?: ContactRoute | null;
  routes?: ContactRoute[];
  related?: { name: string; role?: string }[];
  outcome?: string | null;
  evidenceCount?: number;
  onRehydrate?: () => void;
  density?: "row" | "card" | "mobile";
};
```

## Rendering rules

1. `href` for phone is exactly `tel:${e164}` with digits/+ only.
2. Source renders in adjacent `<span class="text-muted">`.
3. Organization mark uses distinct chip style.
4. If !primary && evidenceCount > 0, show rehydrate CTA.
5. related max 6 visible + “+N”.

## Adoption

Entities list, entity detail, Live Desk card preview, mobile reactor — all import the same component. No local string templates for REACH.

