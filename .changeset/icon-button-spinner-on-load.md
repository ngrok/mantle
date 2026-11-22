---
"@ngrok/mantle": patch
---

`IconButton` renders its loading spinner only while `isLoading` is `true`. An idle `IconButton` now renders its icon in one wrapper, with no hidden spinner and no `IconSwap` markup: four fewer elements for each button. While loading, the spinner sits over the icon in the same box, so the button does not change size. The spinner fades in. When loading ends, the spinner goes at once and the icon fades back in.

`IconButton` no longer renders `data-slot="icon-swap"` or `data-slot="icon-swap-item"`. A test that finds its icon with `[data-slot="icon-swap-item"][data-state="active"] svg` must query `svg` instead. A `[&_svg]` selector on the button still reaches the icon. `Button` does not change.
