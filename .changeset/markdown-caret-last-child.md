---
"@ngrok/mantle": patch
---

The streaming caret of `Markdown` finds the last paragraph, heading, or list item with `:last-child`, not `:not(:has(+ *))`. With the sibling `:has()` rule on the page, Chromium restyled about 490 elements for each node that a long streamed answer inserted. The caret shows in the same places.
