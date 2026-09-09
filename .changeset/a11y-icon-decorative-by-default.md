---
"@ngrok/mantle": patch
---

`Icon` and `SvgOnly` are decorative by default. They now render `aria-hidden="true"` unless the props or the svg element carry `aria-label`, `aria-labelledby`, `role`, or an explicit `aria-hidden`. Phosphor icons set none of these, so before this change every icon that sat next to a text label inside an `<a>`, a `<span>`, or a `<div>` was an unnamed graphic to a screen reader. Every mantle part that renders a decorative icon through these primitives (`Anchor`, `Badge`, `Button` with `asChild`, `Alert.Icon`, `AlertDialog.Icon`, `Empty.Icon`, `Toast.Icon`, and the menu carets and checks) inherits the fix.

When an icon is the only thing that conveys its meaning, pass `role="img"` and `aria-label` and it stays exposed.
