---
"@ngrok/mantle": patch
---

The streaming caret of `Markdown` finds the last paragraph, heading, or list item with `:last-child`, not `:not(:has(+ *))`. With the sibling `:has()` rule on the page, Chromium restyled much of a long answer for each update as it streamed. The caret shows in the same places, and the `:last-child` tests add no specificity, so a consumer override still wins the same way.
