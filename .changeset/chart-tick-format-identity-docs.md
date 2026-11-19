---
"@ngrok/mantle": patch
---

The `tickFormat` docs of the chart axes now say that the chart compares the function by identity, so a new function paints the chart again. With the React Compiler in your build, an inline function stays stable; without it, define the function outside the component. This applies to the `XAxis` and `YAxis` parts of `AreaChart`, `BarChart`, `LineChart`, and `ScatterPlot`.
