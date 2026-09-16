---
"@ngrok/mantle": minor
---

`MultiSelect.Item` no longer accepts `asChild`. The prop is omitted from its props type.

The item renders its check indicator beside your children, so `asChild` handed Ariakit's render slot two elements, and `Slot` takes exactly one. The prop threw `React.Children.only expected to receive a single React element child` at render, and the docs page has carried that warning since the part shipped. The type error now names the problem at compile time instead.

**Migration.** A call site that passes `asChild` to `MultiSelect.Item` crashes today, so nothing working breaks. Give an option a custom layout through `children`, which is unrestricted.

`MultiSelect.Content`, `MultiSelect.Group`, `MultiSelect.GroupLabel`, and `MultiSelect.Separator` keep `asChild` and are unaffected.
