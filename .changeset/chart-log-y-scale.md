---
"@ngrok/mantle": patch
---

Add a log scale to the chart y axis. Import `logScale` from `@ngrok/mantle/bar-chart`, `@ngrok/mantle/line-chart`, or `@ngrok/mantle/area-chart`, and pass it to the `YAxis` `scale`: `<BarChart.YAxis scale={logScale} />`. The default is `"linear"`, and a chart that does not import `logScale` ships none of its code. A log axis spaces each power of ten evenly and ticks at powers of ten with compact labels (`1K`, `1M`). Each side takes its own scale, and a log side keeps ticks of its own instead of the left grid lines. A switch between scales glides the marks, and reduced motion jumps.

With `scale={logScale}`, `domain` takes `[number | "auto", number | "auto"]` on every family. A positive end is kept. An `"auto"` end, or one at or below zero, follows the data: the minimum is a power of ten at least one decade below the smallest positive value, so the smallest bar keeps a length. A value at or below zero has no mark; the tooltip, the data table, and the announcements still read it. The chart description tells a screen reader that the axis uses a log scale, and the Root gets `data-y-scale="log"`. A log axis throws on a stacked chart and on a scatter plot.
