---
"@ngrok/mantle": patch
---

`IconButton` renders its loading spinner only while `isLoading` is `true`. An idle `IconButton` now renders its icon as the only child of the button, with no hidden spinner and no `IconSwap` wrappers: four fewer elements for each button. While loading, the spinner sits over the icon in the same box, so the button does not change size. The icon still fades out and back in with the same motion.

A test that finds the icon of an `IconButton` with `[data-slot="icon-swap-item"]` or `[data-state="active"] > svg` must query the `svg` instead. `Button` does not change.
