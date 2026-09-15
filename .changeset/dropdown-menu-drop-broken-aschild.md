---
"@ngrok/mantle": minor
---

`DropdownMenu.SubTrigger`, `DropdownMenu.CheckboxItem`, and `DropdownMenu.RadioItem` no longer accept `asChild`. The prop is omitted from their props types.

Each of the three renders a second element beside your children: the submenu caret, or the check indicator. `asChild` hands `Slot` every child, and `Slot` takes exactly one, so the prop threw `Primitive.div failed to slot onto its children` at render. It has never worked on these three parts.

**Migration.** A call site that passes `asChild` to one of them crashes today, so nothing working breaks. The type error now names the problem at compile time instead. Style the part with `className`, or move the element you were slotting into the part's children.

The other seven parts keep `asChild` and are unaffected: `DropdownMenu.Trigger`, `Content`, `SubContent`, `Item`, `Label`, `Group`, and `RadioGroup`. The docs page lists them under a new **Polymorphism** section.
