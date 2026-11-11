---
"@ngrok/mantle": patch
---

Add `BarChart.List`, `LineChart.List`, `AreaChart.List`, and `ScatterPlot.List`. Wrap a list of chart Roots, such as one chart per card, in a `List`, and the charts share one tooltip surface and one `role="status"` live region. The tooltip surface moves into the chart a reader points at or steps through, so a page of 100 charts mounts one tooltip and one live region instead of one per chart. Each chart keeps its own `Tooltip` part, description, and data table.
