---
"@ngrok/mantle": patch
---

Make the `PasswordInput` visibility toggle a keyboard-reachable toggle button, and give the input a stable `id`.

- The toggle is now in the tab order. Enter and Space toggle visibility and keep focus on the button. It was `tabIndex={-1}` before, so a keyboard user could not reach it.
- The toggle carries `aria-pressed` for its state and `aria-controls` that points at the input.
- The accessible name is now the fixed string "Show value". It no longer changes with state, and it no longer contains "password", so a substring label query for the input (`getByLabel("Password")` in Playwright) matches one element. The previous names were "Turn password visibility on" and "Turn password visibility off".
- The input uses the `id` you pass, or a generated one when you pass none. Inside a `Field.Item`, the id comes from `Field.Item`'s `id` prop.
- The toggle stamps `data-slot="password-input-toggle"`.

`Input` no longer moves focus into the input when a keyboard user activates a focusable adornment inside it. A pointer click on an adornment still focuses the input.

Update tests that select the toggle by its old name. The migration guide is at [mantle.ngrok.com/migrations/field-item-owns-control-id-migration](https://mantle.ngrok.com/migrations/field-item-owns-control-id-migration).
