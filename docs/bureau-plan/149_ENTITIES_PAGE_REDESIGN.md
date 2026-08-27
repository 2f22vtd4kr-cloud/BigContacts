# Volume 149 — Entities Page Redesign Spec

## Current pain

- Rows look sparse when only org evidence exists.
- Operators compare to chat screenshots side-by-side; Apex must not look “blank.”
- Filters under-serve phoneSource and outcome honesty.

## Redesign modules

### Row compact

`Name | Outcome | Primary contact (value · source) | Marks | Score | Cooked`

Primary contact renderer uses ContactSurface mini variant.

### Detail drawer / page

Full ContactSurface + DigSpan for last job on this entity if jobId known + evidence table.

### Bulk actions

- Rehydrate selected
- Fix outcome honesty selected
- Launch single-target dig (depth standard)

### Empty primary with evidence

Inline alert + one-click rehydrate (POST entities/rehydrate-contacts).

### Trust column

Show phoneSource abbreviated: `agentic` | `notice` | `issuer` | `web` | `—`

## Accessibility

- tel: and mailto: real links
- Source not inside href
- Contrast on org purple vs personal blue

## Acceptance screenshots

1. Org-only fixture row shows purple org phone.
2. Notice fixture shows notice source.
3. Evidence-rich empty shows CTA.
4. After rehydrate, primary fills without full page reload (invalidate list cache).

