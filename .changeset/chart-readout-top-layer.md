---
"@ngrok/mantle": patch
---

Show the chart tooltip in the browser's top layer, as a `popover="manual"`, in `BarChart`, `LineChart`, `AreaChart`, `ScatterPlot`, and `WorldMap`. A card that clips its content, such as `Panel` (`overflow-clip`) or `Table` (`overflow-hidden`), no longer cuts off a readout that is taller than the plot. The readout keeps its place next to the hovered point. A browser with no popover API keeps the readout inside the plot, as before.
