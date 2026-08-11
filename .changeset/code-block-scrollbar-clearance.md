---
"@ngrok/mantle": patch
---

`CodeBlock.Code` no longer shows a horizontal scrollbar when every line fits the container.

Every rendered line reserved `3.5rem` of right padding to clear the copy button. That reserve widened the code's intrinsic width, so a block whose longest line fit the container still scrolled sideways. Now the full clearance sits on the first two lines only — the only lines the copy button overlaps — and only when a `CodeBlock.CopyButton` is rendered. Every line keeps a `1rem` reserve, so a line at the end of the scroll range stays clear of the container's edge.
