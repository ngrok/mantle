---
"@ngrok/mantle": minor
---

Add a preview `Chip` for compact values. A chip can show a label, a leading
icon, or a removable value with a named remove button. Set `selectable` to
render a toggle button with `aria-pressed`. Set `appearance` to `"pill"` (the
default) for a fully rounded chip, or to `"square"` for small corner radii. The
`chip-label` slot keeps text safe when the browser translates a page. The
component exposes `data-slot`, `data-appearance`, `data-size`, `data-state`, and
`data-locked` for styling. See the
[Chip docs](https://mantle.ngrok.com/components/preview/chip).

`MultiSelect.Tag` now renders a `square` `Chip` at the `sm` size, so it also
carries `data-appearance="square"` and `data-size="sm"`. Its look does not
change. A locked tag now stamps `data-locked=""` in place of `data-locked="true"`. Select it with
`data-locked:` or `[data-locked]`, not `[data-locked="true"]`.
