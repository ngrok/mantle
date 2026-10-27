---
"@ngrok/mantle": patch
---

Fix the indentation of tab-indented code in `CodeBlock` on Firefox. A tab now shows as two spaces in every browser. The code block wrote `-moz-tab-size: 2px`, which Firefox reads over `tab-size`, so each tab was 2px wide. `CodeBlock.Code` now ignores a `MozTabSize` in its `style` prop for the same reason.
