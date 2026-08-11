---
"@ngrok/mantle": patch
---

`CodeBlock.Code` pins the line-number gutter while the code scrolls horizontally.

The gutter — line numbers and fold toggles — now sticks to the left edge of the scrollport, and an opaque backdrop masks the code sliding under it. In browsers that support scroll-driven animations, a seam in the block's border color fades in as you scroll to separate the pinned gutter from the moving code. Blocks without line numbers scroll as one unit, unchanged.
