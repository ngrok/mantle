---
"@ngrok/mantle": minor
---

`BarChart`, `LineChart`, and `AreaChart` paint into an `<svg>` instead of a `<canvas>`. The marks, axes, tooltip, keyboard model, description, and data table are the same, and a browser test paints each scene as SVG and as canvas and compares the pixels. The SVG paints mantle's color tokens as CSS, so a theme switch repaints no chart, the chart reads no computed style to paint, and the page holds no canvas bitmaps.

Measured with the docs site's chart bench on a page of 100 line chart cards (Chromium 158 on Linux with a software GPU, median of 3 runs, this release against the last one): main-thread time at load fell from 824 ms to 225 ms, a data replace from 481 ms to 25 ms, and a hover sweep from 1,452 ms to 315 ms. Bar chart cards and a 100-row table of sparklines improved by similar ratios. The SVG paths are DOM nodes, so the same page holds about 700 more DOM nodes and 3 to 5 MB more JavaScript heap.

The paint surface is now `data-slot="bar-chart-svg"` (`line-chart-svg`, `area-chart-svg`). `ScatterPlot` still paints on canvas.

To migrate, point selectors and tests that read `[data-slot="bar-chart-canvas"]` (or a bare `canvas` inside a chart) at `[data-slot="bar-chart-svg"]`, and read the SVG's paths in a test that read canvas pixels. See https://mantle.ngrok.com/migrations/0013-chart-svg-renderer-migration.
