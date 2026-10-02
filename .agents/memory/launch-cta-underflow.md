---
name: Launch CTA underflow layering
description: Keep the Apex primary button's animated underflow visible above the following shortcut row.
---

When the Launch CTA reveals a pseudo-element beneath itself, raise the CTA's stacking context only for the flash/press state; opacity and correct palette values alone do not ensure the surface is visible.

**Why:** The dashboard shortcut row follows the primary CTA in DOM order and can paint over the underflow, even when the pseudo-element has the expected opacity and gradients. This was especially noticeable in light mode.

**How to apply:** If the CTA underflow is changed, capture the pressed and released states mid-animation in both themes. Confirm the moving surface is visible in the gap without obscuring the shortcut controls, and keep the CTA's z-index temporary.