---
"@ngrok/mantle": patch
---

Two chart fixes:

- A chart `CopyButton` keeps its own `data-slot` (for example `bar-chart-copy-button`) when you pass a `data-slot`. Your value goes first, and selectors for the chart slot still match.
- The plot of a `pending` chart fades out and back in on the `ease-out-strong` curve. Before, it faded out but snapped back. With reduced motion, the fade does not animate.
