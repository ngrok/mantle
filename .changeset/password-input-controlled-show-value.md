---
"@ngrok/mantle": patch
---

`PasswordInput` now treats `showValue` as a controlled prop, as its docs state. When you pass `showValue`, the toggle button no longer flips the visibility on its own: it calls `onValueVisibilityChange` with the next value, and the input follows the prop. Before this change, a click revealed the value even while `showValue` stayed `false`, so the input drifted from the prop until the prop changed. A `showValue` change now also applies in one render, with no intermediate frame that shows the old `type`, `aria-pressed`, or icon.

If you pass a static `showValue` and rely on the built-in toggle to flip the visibility, pass `onValueVisibilityChange` and write the next value back into `showValue`, or omit `showValue` to keep the toggle uncontrolled.
