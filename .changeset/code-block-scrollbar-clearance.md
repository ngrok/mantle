---
"@ngrok/mantle": patch
---

`CodeBlock.Code` no longer shows a horizontal scrollbar when every line fits the container.

Every rendered line reserved `3.5rem` of right padding to clear the copy button. That reserve widened the code's intrinsic width, so a block whose longest line fit the container still scrolled sideways. Now only the first two lines — the only lines the copy button overlaps — reserve the clearance, and only when a `CodeBlock.CopyButton` is rendered. A line wider than the container still scrolls, and its first-two-line clearance still keeps text out from under the button at the end of the scroll range.
