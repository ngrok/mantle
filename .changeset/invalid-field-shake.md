---
"@ngrok/mantle": patch
---

Shake a form control once when it shows an error and the user is not in it. The control moves 4px and settles in 300ms. A control that has focus does not shake, so a user who types never sees it move. With reduced motion, the control does not move.

- `Input`, `PasswordInput`, `TextArea`, `Combobox.Input`, `MultiSelect.Trigger`, and `Select.Trigger` shake when `validation` becomes `"error"`, and again each time focus leaves them while the error stays.
- An `Input` whose `InputCapture` alone has `validation="error"` now shows the red border and shakes. Before, the outer chrome stayed gray.
- `Checkbox` and `Switch` do not shake.
- The new `animate-shake` utility applies the same motion to your own control.
