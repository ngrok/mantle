---
"@ngrok/mantle": patch
---

Shake a form control once when it enters the error state. The control moves 4px and settles in 300ms. It does not shake again while the error stays, on focus, or on blur. It shakes again only after the error clears and comes back. With reduced motion, the control does not move.

- `Input`, `PasswordInput`, `TextArea`, `Combobox.Input`, `MultiSelect.Trigger`, and `Select.Trigger` shake when `validation` becomes `"error"`.
- An `Input` whose `InputCapture` alone has `validation="error"` now shows the red border and shakes. Before, the outer chrome stayed gray.
- `MultiSelect.Input` now gets `aria-invalid` from the `validation` and `aria-invalid` props on `MultiSelect.Trigger`. Before, a trigger outside a `Field.Item` showed the error but did not report it to assistive technology.
- `Checkbox` and `Switch` do not shake.
- The new `animate-shake` utility applies the same motion to your own control.
