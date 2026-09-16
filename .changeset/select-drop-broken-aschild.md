---
"@ngrok/mantle": minor
---

`Select.Content` no longer accepts `asChild`. The prop is omitted from its props type.

The content renders the scroll buttons and the viewport around your items, so there is no single child for a slot to clone. `asChild` hands `Slot` every child, and `Slot` takes exactly one, so the prop threw `Primitive.div failed to slot onto its children` at render. The docs page has carried that warning since the part shipped. The type error now names the problem at compile time instead.

**Migration.** A call site that passes `asChild` to `Select.Content` crashes today, so nothing working breaks. Style the part with `className` instead.

`Select.Trigger`, `Select.Item`, `Select.Group`, `Select.Label`, and `Select.Separator` keep `asChild`.
