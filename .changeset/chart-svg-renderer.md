---
"@ngrok/mantle": minor
---

`BarChart`, `LineChart`, and `AreaChart` paint into an `<svg>` by default instead of a `<canvas>`. The marks, axes, tooltip, keyboard model, description, and data table are the same, and a browser test paints each scene through both renderers and compares the pixels. The SVG paints mantle's color tokens as CSS, so a theme switch repaints no chart, the chart reads no computed style to paint, and it holds no bitmap memory. On a list of 100 cards with one chart each, SVG charts used less main-thread time than canvas charts on mount, hover, resize, theme switch, and a data change.

The paint surface is now `data-slot="bar-chart-svg"` (`line-chart-svg`, `area-chart-svg`). A new `renderer` prop keeps the canvas: `renderer="canvas"` paints exactly as before, with `data-slot="bar-chart-canvas"`. The canvas code loads in its own chunk the first time a chart asks for it, so a page with no canvas chart does not download it. `ScatterPlot` still paints on canvas.

To migrate, point selectors and tests that read `[data-slot="bar-chart-canvas"]` (or a bare `canvas` inside a chart) at `[data-slot="bar-chart-svg"]`, and set `renderer="canvas"` on a chart whose test reads canvas pixels. See https://mantle.ngrok.com/migrations/0013-chart-svg-renderer-migration.
