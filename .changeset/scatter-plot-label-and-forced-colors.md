---
"@ngrok/mantle": patch
---

Two `ScatterPlot` fixes:

- An `aria-labelledby` that names an ancestor of the chart no longer throws "Maximum update depth exceeded" when the chart takes focus. Before, the caption of the screen-reader data table read the text of that ancestor, which held the caption itself, so each render made the caption longer. The caption now skips the text of the data table.
- In forced-colors mode (Windows High Contrast), a color that the chart resolves through a hidden element inside `Root` keeps its own value: a `var()` with a fallback, a `var()` or a `currentColor` inside another function such as `color-mix()`, or `light-dark()`. Before, each such color painted as the system text color.
