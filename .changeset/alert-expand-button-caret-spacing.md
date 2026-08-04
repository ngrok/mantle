---
"@ngrok/mantle": patch
---

`Alert.ExpandButton` renders its caret through `Button`'s `icon` slot, rather than as a third child beside the
count and the word.

The slot is what the caret wanted all along. It sizes the glyph, holds it at `shrink-0`, tightens the padding on
its side, and hands its place to the spinner when a button loads. `iconPlacement="end"` keeps the caret where it
has always drawn, after the label.

The control renders `+3 more ⌄` as it did before, and the count keeps the `min-width` that stops a two-digit
count from shifting the label.
