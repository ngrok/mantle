---
"@ngrok/mantle": patch
---

`Checkbox` sets `aria-readonly="true"` when `readOnly` is set. The native `readonly` attribute is inert on a checkbox, so mantle blocks the toggle with a click guard; assistive technology now hears the state instead of a toggle that fails in silence.
