---
"@ngrok/mantle": minor
---

`Select.Trigger`, `Select.Content`, and `Select.Item` no longer accept `asChild`. The prop is omitted from their props types.

Each of the three renders its own chrome beside your children: the trigger's caret, the content's scroll buttons and viewport, or the item's check indicator. `asChild` hands `Slot` every child, and `Slot` takes exactly one, so the prop threw `Primitive.* failed to slot onto its children` at render. The docs page has carried that warning since the parts shipped. The type error now names the problem at compile time instead.

**Migration.** A call site that passes `asChild` to one of them crashes today, so nothing working breaks. Style the part with `className`, or pass the content you were slotting as `children`.

`Select.Group`, `Select.Label`, and `Select.Separator` keep `asChild` and are unaffected.
