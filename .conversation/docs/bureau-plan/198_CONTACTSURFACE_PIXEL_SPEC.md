# Volume 198 — ContactSurface Pixel Spec

## Density variants

### row (entities list)

Height ~48–56px. Primary value ellipsis mid if needed; source at 11–12px muted; one mark chip; overflow +N.

### card (detail / Live Desk)

Primary value 16–18px semibold; source under or beside; chip row wrap; related strip below.

### mobile

Primary as full-width button (tel/mailto); chips horizontal scroll; min touch 44px.

## Spacing

- 8px between chip and source
- 12px between primary and chip row
- Do not crowd outcome badge into tel: hit target

## Color tokens (semantic)

- personal: default accent
- organization: violet/purple (match existing org outcome)
- social: slate
- related: amber soft
- risk: muted + icon

## States

- loading skeleton for rehydrate
- empty + evidenceCount → dashed border CTA
- error rehydrate → toast, keep prior routes

## Accessibility

- chips are buttons or links with aria-label including mark
- outcome badge not color-only (text label)

