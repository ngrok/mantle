---
"@ngrok/mantle": patch
---

`CodeBlock.Code` pins the line-number gutter while the code scrolls horizontally.

The gutter — line numbers and fold toggles — now sticks to the left edge of the scrollport, and an opaque backdrop masks the code sliding under it. Blocks without line numbers scroll as one unit, unchanged.
