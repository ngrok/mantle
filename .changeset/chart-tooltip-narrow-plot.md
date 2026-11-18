---
"@ngrok/mantle": patch
---

Keep the chart tooltip inside the plot when neither side of the hovered point has room for it. Before, on a narrow chart such as one on a phone, the tooltip went past the plot's right edge and made the page scroll horizontally. This applies to `AreaChart`, `BarChart`, `LineChart`, and `ScatterPlot`.
