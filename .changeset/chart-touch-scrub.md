---
"@ngrok/mantle": patch
---

Charts work with a finger. Drag sideways across a `BarChart`, `LineChart`, `AreaChart`, or 2D `ScatterPlot` to move the tooltip to the datum under your finger. A drag does not call `onDatumActivate`; a tap does. A vertical drag still scrolls the page, and a pinch still zooms it. The tooltip stays when you lift your finger, and a tap outside the chart hides it. A long press no longer selects the plot or opens the browser's callout menu.
