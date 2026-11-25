---
"@ngrok/mantle": minor
---

Add `Chip` for compact values, at `@ngrok/mantle/chip`. A chip can show a label, a leading
icon, or a removable value with a named remove button. Set `selectable` to
render a toggle button with `aria-pressed`. Set `size` to a step of the `Button`
scale, from `"xs"` (the default) to `"xl"`. Set `appearance` to `"pill"` (the
default) for a fully rounded chip, or to `"square"` for small corner radii. A long pill label ends in an ellipsis. `aria-disabled`
styles a chip as disabled and disables its remove button. The
`chip-label` slot keeps text safe when the browser translates a page. The
component exposes `data-slot`, `data-appearance`, `data-size`, `data-state`, and
`data-locked` for styling. See the
[Chip docs](https://mantle.ngrok.com/components/forms/chip).

`MultiSelect.Tag` now renders a `square` `Chip` at the `sm` size, so it also
carries `data-appearance="square"` and `data-size="sm"`. Its layout does not
change. Its remove icon is darker, so it meets the 3:1 contrast that WCAG asks
for a control. A locked tag now stamps `data-locked=""` in place of `data-locked="true"`. Select it with
`data-locked:` or `[data-locked]`, not `[data-locked="true"]`.
