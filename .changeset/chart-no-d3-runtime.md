---
"@ngrok/mantle": patch
---

Charts ship no d3 code. `BarChart`, `LineChart`, `AreaChart`, and `ScatterPlot` compute time-axis ticks, tick labels, and line and area paths with code in mantle, and `@ngrok/mantle` no longer depends on `d3-scale`, `d3-shape`, `d3-time`, or `d3-time-format`.

The ticks, the labels, and the paths are the same as before. Tests compare the ticks and labels with `d3-scale`'s `scaleTime` across 4,000 time domains, and again in six time zones that change their offset, and compare each line and area path with `d3-shape` call for call. The text of a line or area `d` attribute changes: it holds two decimals and spaces (`M0 0L10 1.24`), where d3 wrote three decimals and commas. The pixels are the same.

Each chart family ships about 7 KB less JavaScript (minified and gzipped): the chart code of a family, without the class and button code that every mantle app loads, went from 45.1 KB to 38.1 KB.
