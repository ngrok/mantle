---
"@ngrok/mantle": patch
---

Give the fold toggles of a `CodeBlock` the spacing that WCAG 2.5.8 needs. A code block that has fold toggles now uses a 24px line height instead of 20px, and each toggle is 24px high, so the toggles of adjacent lines are 24px apart. A code block with no fold toggles shows no change.

The new `--mantle-code-fold-line-height` CSS variable holds the value. Set it to `1.25rem` on a code block to get the 20px lines again; the toggles of adjacent lines then fail the target-size check.
