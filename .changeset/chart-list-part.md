---
"@ngrok/mantle": patch
---

Add `BarChart.List`, `LineChart.List`, `AreaChart.List`, and `ScatterPlot.List`. Wrap a list of chart Roots, such as one chart per card, in a `List`, and the charts share one `role="status"` live region. A page of 100 interactive charts mounts one live region instead of 100. Each chart keeps its own tooltip, description, and data table.
