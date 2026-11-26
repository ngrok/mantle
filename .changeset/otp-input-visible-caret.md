---
"@ngrok/mantle": patch
---

`OtpInput.Slot` now shows its caret. Before, the empty active slot drew the caret with `bg-strong`, which emits no CSS, so the caret was invisible. The caret now looks like a native text caret: 1px wide, as tall as the slot's text, and in the slot's text color, also in dark mode and forced colors. It blinks on and off every 500ms with no fade, and it stays steady when the user prefers reduced motion. It shows only at the insertion slot while the input has focus, and it does not change the slot's height.
